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

export async function uploadFileToR2(uploadUrl: string, file: File, contentType?: string): Promise<void> {
  const mimeType = contentType || file.type || 'application/octet-stream';
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': mimeType,
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('R2 direct upload error:', response.status, errText);
    throw new Error(`فشل رفع الملف (${response.status}). يرجى التحقق من اتصالك والمحاولة مرة أخرى.`);
  }
}

export async function uploadContentDirectly(formData: FormData): Promise<EducationalContent> {
  return apiClient<EducationalContent>('/content/upload-direct', {
    method: 'POST',
    body: formData,
  });
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
