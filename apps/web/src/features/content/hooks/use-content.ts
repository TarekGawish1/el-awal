import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContent,
  generatePresignedUrl,
  uploadFileToR2,
  createContent,
  uploadContentDirectly,
  updateContentDirectly,
  updateContent,
  fetchGroupSessions,
  deleteContent,
} from '../api/content.api';
import { CreateContentPayload, UpdateContentPayload, PresignedUploadPayload } from '../types/content.types';

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

export function useUploadContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      metadata,
    }: {
      file: File;
      metadata: Omit<CreateContentPayload, 'fileKey' | 'fileUrl'> & { originalFileName: string };
    }) => {
      // 1. Direct Multipart upload through backend (immune to browser CORS policies)
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', metadata.title);
        if (metadata.description) formData.append('description', metadata.description);
        formData.append('contentType', metadata.contentType);
        if (metadata.gradeLevel) formData.append('gradeLevel', metadata.gradeLevel);
        if (metadata.academicYear) formData.append('academicYear', metadata.academicYear);
        if (metadata.academicTerm) formData.append('academicTerm', metadata.academicTerm);
        if (metadata.groupId) formData.append('groupId', metadata.groupId);
        if (metadata.sessionTopic) formData.append('sessionTopic', metadata.sessionTopic);
        if (metadata.sessionId) formData.append('sessionId', metadata.sessionId);

        return await uploadContentDirectly(formData);
      } catch (directError: any) {
        console.warn('Direct upload failed, attempting presigned fallback:', directError);

        // 2. Fallback to presigned R2 upload
        const mimeType = file.type || 'application/octet-stream';
        const presignedPayload: PresignedUploadPayload = {
          fileName: metadata.originalFileName,
          contentType: mimeType,
          fileSizeBytes: file.size,
          folder: 'courses',
        };
        const presigned = await generatePresignedUrl(presignedPayload);
        await uploadFileToR2(presigned.uploadUrl, file, mimeType);

        const createPayload: CreateContentPayload = {
          ...metadata,
          fileKey: presigned.fileKey,
          fileUrl: presigned.publicUrl,
          fileSize: file.size,
          mimeType,
        };
        return await createContent(createPayload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
    },
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      metadata,
      file,
    }: {
      id: string;
      metadata: UpdateContentPayload & { originalFileName?: string };
      file?: File | null;
    }) => {
      // 1. If replacement file is provided, send via multipart FormData
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (metadata.title !== undefined) formData.append('title', metadata.title);
        if (metadata.description !== undefined) formData.append('description', metadata.description);
        if (metadata.contentType !== undefined) formData.append('contentType', metadata.contentType);
        if (metadata.gradeLevel !== undefined) formData.append('gradeLevel', metadata.gradeLevel);
        if (metadata.academicYear !== undefined) formData.append('academicYear', metadata.academicYear);
        if (metadata.academicTerm !== undefined) formData.append('academicTerm', metadata.academicTerm);
        if (metadata.groupId !== undefined) formData.append('groupId', metadata.groupId);
        if (metadata.sessionTopic !== undefined) formData.append('sessionTopic', metadata.sessionTopic);
        if (metadata.sessionId !== undefined) formData.append('sessionId', metadata.sessionId);

        return await updateContentDirectly(id, formData);
      }

      // 2. Metadata-only update
      return await updateContent(id, metadata);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
    },
  });
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
