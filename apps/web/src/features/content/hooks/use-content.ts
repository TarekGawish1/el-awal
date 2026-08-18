import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContent,
  generatePresignedUrl,
  uploadFileToR2,
  createContent,
  uploadContentDirectly,
  deleteContent,
} from '../api/content.api';
import { CreateContentPayload, PresignedUploadPayload } from '../types/content.types';

export const contentKeys = {
  all: ['content'] as const,
  lists: () => [...contentKeys.all, 'list'] as const,
  list: (filters: string) => [...contentKeys.lists(), { filters }] as const,
};

export function useContent(query?: Record<string, string>) {
  return useQuery({
    queryKey: contentKeys.list(JSON.stringify(query)),
    queryFn: () => fetchContent(query),
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

export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
    },
  });
}
