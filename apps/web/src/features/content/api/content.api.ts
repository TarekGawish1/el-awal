import { apiClient } from '@/lib/api/client';
import { 
  EducationalContent, 
  PresignedUploadPayload, 
  PresignedUploadResponse, 
  CreateContentPayload 
} from '../types/content.types';

export async function fetchContent(query?: Record<string, string>): Promise<EducationalContent[]> {
  const searchParams = new URLSearchParams(query);
  return apiClient<EducationalContent[]>(`/content?${searchParams.toString()}`);
}

export async function generatePresignedUrl(payload: PresignedUploadPayload): Promise<PresignedUploadResponse> {
  return apiClient<PresignedUploadResponse>('/content/presigned-upload-url', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadFileToR2(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error('فشل رفع الملف. يرجى المحاولة مرة أخرى.');
  }
}

export async function createContent(payload: CreateContentPayload): Promise<EducationalContent> {
  return apiClient<EducationalContent>('/content', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteContent(id: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/content/${id}`, {
    method: 'DELETE',
  });
}
