import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContent,
  generatePresignedUrl,
  generatePresignedVideoUpload,
  uploadVideoToBunny,
  uploadFileToR2,
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

      // 1. If Video -> Direct Browser-to-Bunny Stream Upload (Bypasses Heroku 30s timeout)
      if (isVideo) {
        try {
          const bunnyCreds = await generatePresignedVideoUpload(metadata.title);
          await uploadVideoToBunny(bunnyCreds.uploadUrl, file, bunnyCreds, handleProgress);

          setStage('processing');
          const createPayload: CreateContentPayload = {
            ...metadata,
            contentType: ContentType.LECTURE_RECORDING,
            fileKey: `bunny:${bunnyCreds.videoId}`,
            fileUrl: bunnyCreds.embedUrl,
            fileSize: file.size,
            mimeType: file.type || 'video/mp4',
          };
          const result = await createContent(createPayload);
          setUploadProgress(100);
          setStage('success');
          return result;
        } catch (bunnyErr: any) {
          console.warn('Direct Bunny Stream upload failed, falling back to direct presigned R2 upload:', bunnyErr);
        }
      }

      // 2. Direct Presigned Cloudflare R2 Upload (for images, documents, and fallback videos)
      const mimeType = file.type || (isVideo ? 'video/mp4' : 'application/octet-stream');
      const presignedPayload: PresignedUploadPayload = {
        fileName: metadata.originalFileName || file.name,
        contentType: mimeType,
        fileSizeBytes: file.size,
        folder: isVideo ? 'courses/videos' : 'courses',
      };
      const presigned = await generatePresignedUrl(presignedPayload);
      await uploadFileToR2(presigned.uploadUrl, file, mimeType, handleProgress);

      setStage('processing');
      const createPayload: CreateContentPayload = {
        ...metadata,
        contentType: isVideo ? ContentType.LECTURE_RECORDING : metadata.contentType,
        fileKey: isVideo ? `r2:${presigned.fileKey}` : presigned.fileKey,
        fileUrl: presigned.publicUrl || presigned.uploadUrl,
        fileSize: file.size,
        mimeType,
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
              ...metadata,
              contentType: ContentType.LECTURE_RECORDING,
              fileKey: `bunny:${bunnyCreds.videoId}`,
              fileUrl: bunnyCreds.embedUrl,
              fileSize: file.size,
              mimeType: file.type || 'video/mp4',
            });
            setUploadProgress(100);
            setStage('success');
            return result;
          } catch (bunnyErr: any) {
            console.warn('Direct Bunny Stream replacement failed, falling back to direct presigned R2 upload:', bunnyErr);
          }
        }

        // Direct Presigned Cloudflare R2 Upload
        const mimeType = file.type || (isVideo ? 'video/mp4' : 'application/octet-stream');
        const presignedPayload: PresignedUploadPayload = {
          fileName: metadata.originalFileName || file.name,
          contentType: mimeType,
          fileSizeBytes: file.size,
          folder: isVideo ? 'courses/videos' : 'courses',
        };
        const presigned = await generatePresignedUrl(presignedPayload);
        await uploadFileToR2(presigned.uploadUrl, file, mimeType, handleProgress);

        setStage('processing');
        const result = await updateContent(id, {
          ...metadata,
          contentType: isVideo ? ContentType.LECTURE_RECORDING : (metadata.contentType || ContentType.FILE),
          fileKey: isVideo ? `r2:${presigned.fileKey}` : presigned.fileKey,
          fileUrl: presigned.publicUrl || presigned.uploadUrl,
          fileSize: file.size,
          mimeType,
        });
        setUploadProgress(100);
        setStage('success');
        return result;
      }

      setStage('processing');
      // 2. Metadata-only update
      const result = await updateContent(id, metadata);
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
