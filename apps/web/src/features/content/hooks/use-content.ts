import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContent,
  generatePresignedUrl,
  uploadFileToR2,
  createContent,
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
    mutationFn: async ({ file, metadata }: { file: File; metadata: Omit<CreateContentPayload, 'fileKey' | 'fileUrl'> & { originalFileName: string } }) => {
      // 1. Get presigned URL
      const presignedPayload: PresignedUploadPayload = {
        fileName: metadata.originalFileName,
        contentType: file.type || 'application/octet-stream',
        fileSizeBytes: file.size,
        folder: 'courses', // default folder based on backend enum
      };
      const presigned = await generatePresignedUrl(presignedPayload);

      // 2. Upload file directly to R2
      await uploadFileToR2(presigned.uploadUrl, file);

      // 3. Create content record in DB
      const createPayload: CreateContentPayload = {
        ...metadata,
        fileKey: presigned.fileKey,
        fileUrl: presigned.publicUrl,
        fileSize: file.size,
        mimeType: file.type,
      };
      return createContent(createPayload);
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
