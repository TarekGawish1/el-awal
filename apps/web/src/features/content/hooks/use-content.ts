import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContent,
  generatePresignedUrl,
  generatePresignedVideoUpload,
  uploadVideoToBunny,
  uploadFileToR2,
  uploadRawFile,
  createContent,
  uploadContentDirectly,
  updateContentDirectly,
  updateContent,
  fetchGroupSessions,
  deleteContent,
  UploadProgressCallback,
} from '../api/content.api';
import {
  CreateContentPayload,
  UpdateContentPayload,
  PresignedUploadPayload,
  ContentType,
} from '../types/content.types';

export const contentKeys = {
  all: ['content'] as const,
  lists: () => [...contentKeys.all, 'list'] as const,
  list: (filters: string) => [...contentKeys.lists(), { filters }] as const,
  groupSessions: (groupId: string) => ['schedules', 'group-sessions', groupId] as const,
};

export function useContent(query?: Record<string, string>) {
  return useQuery({
    queryKey: contentKeys.list(JSON.stringify(query)),
    queryFn: () => fetchContent(query),
  });
}

export function useGroupSessions(groupId?: string) {
  return useQuery({
    queryKey: contentKeys.groupSessions(groupId || ''),
    queryFn: () => fetchGroupSessions(groupId || ''),
    enabled: !!groupId && groupId !== 'ALL',
    staleTime: 5 * 60 * 1000,
  });
}

export type UploadStage = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

function sanitizeUUID(val?: string | null): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '__CUSTOM__' || trimmed === 'ALL') return undefined;
  return trimmed;
}

function sanitizeString(val?: string | null): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function useUploadContent() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [loadedBytes, setLoadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [stage, setStage] = useState<UploadStage>('idle');

  const resetProgress = useCallback(() => {
    setUploadProgress(0);
    setLoadedBytes(0);
    setTotalBytes(0);
    setStage('idle');
  }, []);

  const mutation = useMutation({
    mutationFn: async ({
      file,
      metadata,
      onProgress,
    }: {
      file: File;
      metadata: Omit<CreateContentPayload, 'fileKey' | 'fileUrl'> & { originalFileName: string };
      onProgress?: UploadProgressCallback;
    }) => {
      setStage('uploading');
      setUploadProgress(0);
      setLoadedBytes(0);
      setTotalBytes(file.size);

      const handleProgress: UploadProgressCallback = (pct, loaded, total) => {
        setUploadProgress(pct);
        setLoadedBytes(loaded);
        setTotalBytes(total);
        if (pct >= 100) {
          setStage('processing');
        } else {
          setStage('uploading');
        }
        onProgress?.(pct, loaded, total);
      };

      const isVideo =
        file.type.startsWith('video/') ||
        /\.(mp4|webm|mov|mkv)$/i.test(file.name) ||
        metadata.contentType === ContentType.LECTURE_RECORDING;

      // 1. If Video -> Bunny Stream Upload Only
      if (isVideo) {
        const bunnyCreds = await generatePresignedVideoUpload(metadata.title);
        await uploadVideoToBunny(bunnyCreds.uploadUrl, file, bunnyCreds, handleProgress);

        setStage('processing');
        const createPayload: CreateContentPayload = {
          title: metadata.title.trim(),
          description: sanitizeString(metadata.description),
          contentType: ContentType.LECTURE_RECORDING,
          fileKey: `bunny:${bunnyCreds.videoId}`,
          fileUrl: bunnyCreds.embedUrl,
          fileSize: Math.round(Number(file.size)),
          mimeType: file.type || 'video/mp4',
          gradeLevel: sanitizeString(metadata.gradeLevel),
          academicYear: sanitizeString(metadata.academicYear),
          academicTerm: sanitizeString(metadata.academicTerm),
          sessionTopic: sanitizeString(metadata.sessionTopic),
          groupId: sanitizeUUID(metadata.groupId),
          sessionId: sanitizeUUID(metadata.sessionId),
          lessonId: sanitizeUUID(metadata.lessonId),
        };
        const result = await createContent(createPayload);
        setUploadProgress(100);
        setStage('success');
        return result;
      }

      // 2. Direct Presigned Cloudflare R2 Upload with Server Fallback
      const mimeType = file.type || 'application/octet-stream';
      let uploadedFileKey: string;
      let uploadedFileUrl: string;

      try {
        const presignedPayload: PresignedUploadPayload = {
          fileName: metadata.originalFileName || file.name,
          contentType: mimeType,
          fileSizeBytes: file.size,
          folder: 'courses',
        };
        const presigned = await generatePresignedUrl(presignedPayload);
        await uploadFileToR2(presigned.uploadUrl, file, mimeType, handleProgress);
        uploadedFileKey = presigned.fileKey;
        uploadedFileUrl = presigned.publicUrl || presigned.uploadUrl;
      } catch (directErr) {
        console.warn('[useUploadContent] Direct R2 presigned upload failed; falling back to server raw upload:', directErr);
        // Resilient fallback: Stream through backend API to bypass client-side CORS/ISP issues
        const rawRes = await uploadRawFile(file, 'courses', handleProgress);
        uploadedFileKey = rawRes.fileKey;
        uploadedFileUrl = rawRes.fileUrl;
      }

      setStage('processing');
      const createPayload: CreateContentPayload = {
        title: metadata.title.trim(),
        description: sanitizeString(metadata.description),
        contentType: metadata.contentType,
        fileKey: uploadedFileKey,
        fileUrl: uploadedFileUrl,
        fileSize: Math.round(Number(file.size)),
        mimeType,
        gradeLevel: sanitizeString(metadata.gradeLevel),
        academicYear: sanitizeString(metadata.academicYear),
        academicTerm: sanitizeString(metadata.academicTerm),
        sessionTopic: sanitizeString(metadata.sessionTopic),
        groupId: sanitizeUUID(metadata.groupId),
        sessionId: sanitizeUUID(metadata.sessionId),
        lessonId: sanitizeUUID(metadata.lessonId),
      };
      const result = await createContent(createPayload);
      setUploadProgress(100);
      setStage('success');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
    },
    onError: () => {
      setStage('error');
    },
  });

  return {
    ...mutation,
    uploadProgress,
    loadedBytes,
    totalBytes,
    stage,
    resetProgress,
  };
}

export function useUpdateContent() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [loadedBytes, setLoadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [stage, setStage] = useState<UploadStage>('idle');

  const resetProgress = useCallback(() => {
    setUploadProgress(0);
    setLoadedBytes(0);
    setTotalBytes(0);
    setStage('idle');
  }, []);

  const mutation = useMutation({
    mutationFn: async ({
      id,
      metadata,
      file,
      onProgress,
    }: {
      id: string;
      metadata: UpdateContentPayload & { originalFileName?: string };
      file?: File | null;
      onProgress?: UploadProgressCallback;
    }) => {
      if (file) {
        setStage('uploading');
        setUploadProgress(0);
        setLoadedBytes(0);
        setTotalBytes(file.size);

        const handleProgress: UploadProgressCallback = (pct, loaded, total) => {
          setUploadProgress(pct);
          setLoadedBytes(loaded);
          setTotalBytes(total);
          if (pct >= 100) {
            setStage('processing');
          } else {
            setStage('uploading');
          }
          onProgress?.(pct, loaded, total);
        };

        const isVideo =
          file.type.startsWith('video/') ||
          /\.(mp4|webm|mov|mkv)$/i.test(file.name) ||
          metadata.contentType === ContentType.LECTURE_RECORDING;

        // If Video -> Direct Browser-to-Bunny Stream Upload
        if (isVideo) {
          try {
            const bunnyCreds = await generatePresignedVideoUpload(metadata.title || 'تسجيل حصة');
            await uploadVideoToBunny(bunnyCreds.uploadUrl, file, bunnyCreds, handleProgress);

            setStage('processing');
            const result = await updateContent(id, {
              title: metadata.title ? metadata.title.trim() : undefined,
              description: sanitizeString(metadata.description),
              contentType: ContentType.LECTURE_RECORDING,
              fileKey: `bunny:${bunnyCreds.videoId}`,
              fileUrl: bunnyCreds.embedUrl,
              fileSize: Math.round(Number(file.size)),
              mimeType: file.type || 'video/mp4',
              gradeLevel: sanitizeString(metadata.gradeLevel),
              academicYear: sanitizeString(metadata.academicYear),
              academicTerm: sanitizeString(metadata.academicTerm),
              sessionTopic: sanitizeString(metadata.sessionTopic),
              groupId: sanitizeUUID(metadata.groupId),
              sessionId: sanitizeUUID(metadata.sessionId),
              lessonId: sanitizeUUID(metadata.lessonId),
            });
            setUploadProgress(100);
            setStage('success');
            return result;
          } catch (bunnyErr: any) {
            console.error('Direct Bunny Stream replacement failed:', bunnyErr);
            throw new Error('فشل رفع الفيديو إلى سيرفر البث (Bunny Stream). يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.');
          }
        }

        // Direct Presigned Cloudflare R2 Upload with Server Fallback
        const mimeType = file.type || 'application/octet-stream';
        let uploadedFileKey: string;
        let uploadedFileUrl: string;

        try {
          const presignedPayload: PresignedUploadPayload = {
            fileName: metadata.originalFileName || file.name,
            contentType: mimeType,
            fileSizeBytes: file.size,
            folder: 'courses',
          };
          const presigned = await generatePresignedUrl(presignedPayload);
          await uploadFileToR2(presigned.uploadUrl, file, mimeType, handleProgress);
          uploadedFileKey = presigned.fileKey;
          uploadedFileUrl = presigned.publicUrl || presigned.uploadUrl;
        } catch (directErr) {
          console.warn('[useUpdateContent] Direct R2 presigned upload failed; falling back to server raw upload:', directErr);
          // Resilient fallback: Stream through backend API
          const rawRes = await uploadRawFile(file, 'courses', handleProgress);
          uploadedFileKey = rawRes.fileKey;
          uploadedFileUrl = rawRes.fileUrl;
        }

        setStage('processing');
        const result = await updateContent(id, {
          title: metadata.title ? metadata.title.trim() : undefined,
          description: sanitizeString(metadata.description),
          contentType: metadata.contentType || ContentType.FILE,
          fileKey: uploadedFileKey,
          fileUrl: uploadedFileUrl,
          fileSize: Math.round(Number(file.size)),
          mimeType,
          gradeLevel: sanitizeString(metadata.gradeLevel),
          academicYear: sanitizeString(metadata.academicYear),
          academicTerm: sanitizeString(metadata.academicTerm),
          sessionTopic: sanitizeString(metadata.sessionTopic),
          groupId: sanitizeUUID(metadata.groupId),
          sessionId: sanitizeUUID(metadata.sessionId),
          lessonId: sanitizeUUID(metadata.lessonId),
        });
        setUploadProgress(100);
        setStage('success');
        return result;
      }

      setStage('processing');
      // 2. Metadata-only update
      const result = await updateContent(id, {
        title: metadata.title ? metadata.title.trim() : undefined,
        description: sanitizeString(metadata.description),
        contentType: metadata.contentType,
        fileKey: metadata.fileKey,
        fileUrl: metadata.fileUrl,
        fileSize: metadata.fileSize ? Math.round(Number(metadata.fileSize)) : undefined,
        mimeType: metadata.mimeType,
        gradeLevel: sanitizeString(metadata.gradeLevel),
        academicYear: sanitizeString(metadata.academicYear),
        academicTerm: sanitizeString(metadata.academicTerm),
        sessionTopic: sanitizeString(metadata.sessionTopic),
        groupId: sanitizeUUID(metadata.groupId),
        sessionId: sanitizeUUID(metadata.sessionId),
        lessonId: sanitizeUUID(metadata.lessonId),
      });
      setStage('success');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
    },
    onError: () => {
      setStage('error');
    },
  });

  return {
    ...mutation,
    uploadProgress,
    loadedBytes,
    totalBytes,
    stage,
    resetProgress,
  };
}

export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
    },
  });
}
