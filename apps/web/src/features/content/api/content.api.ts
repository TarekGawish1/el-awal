import { apiClient } from '@/lib/api/client';
import { API_BASE_URL } from '@/lib/api/endpoints';
import { getStoredAccessToken } from '@/features/auth/utils/auth-tokens';
import {
  EducationalContent,
  PresignedUploadPayload,
  PresignedUploadResponse,
  PresignedVideoUploadResponse,
  CreateContentPayload,
  UpdateContentPayload,
  GroupSessionOption,
} from '../types/content.types';
import { createBunnyTusUpload } from '@/features/courses/utils/bunny-tus-uploader';

export type UploadProgressCallback = (progress: number, loadedBytes: number, totalBytes: number) => void;

/**
 * Universal XMLHttpRequest upload runner for multipart FormData and raw files with fine-grained progress feedback
 */
export function uploadWithProgress<T>(
  endpoint: string,
  method: 'POST' | 'PUT',
  body: FormData | File | Blob,
  headers?: Record<string, string>,
  onProgress?: UploadProgressCallback,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const token = getStoredAccessToken();

    xhr.open(method, url);

    if (token && (!endpoint.startsWith('http') || endpoint.startsWith(API_BASE_URL))) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.setRequestHeader('Accept', 'application/json');

    if (headers) {
      Object.entries(headers).forEach(([key, val]) => {
        xhr.setRequestHeader(key, val);
      });
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(Math.round((event.loaded / event.total) * 100), 100);
          onProgress(percent, event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      let responseJson: any;
      try {
        responseJson = JSON.parse(xhr.responseText);
      } catch {
        responseJson = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (responseJson && typeof responseJson === 'object' && 'data' in responseJson) {
          resolve(responseJson.data as T);
        } else {
          resolve(responseJson as T);
        }
      } else {
        const errorMsg =
          (responseJson && responseJson.message) ||
          (responseJson && responseJson.error) ||
          `فشل الرفع (كود ${xhr.status})`;
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('تعذر الاتصال بالخادم أثناء رفع الملف. يرجى التحقق من اتصالك بالإنترنت.'));
    };

    xhr.onabort = () => {
      reject(new Error('تم إلغاء عملية الرفع'));
    };

    xhr.send(body);
  });
}

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

export async function generatePresignedVideoUpload(title: string): Promise<PresignedVideoUploadResponse> {
  return apiClient<PresignedVideoUploadResponse>('/content/presigned-video-upload', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

/**
 * Direct browser-to-Bunny Stream upload with upload progress tracking
 * Uses TUS resumable upload protocol when credentials are provided
 */
export function uploadVideoToBunny(
  uploadUrl: string,
  file: File,
  credentials: Partial<PresignedVideoUploadResponse>,
  onProgress?: UploadProgressCallback,
): Promise<void> {
  if (
    credentials.authorizationSignature &&
    credentials.libraryId &&
    credentials.videoId &&
    credentials.authorizationExpire
  ) {
    return new Promise((resolve, reject) => {
      const tusUpload = createBunnyTusUpload({
        file,
        videoId: credentials.videoId!,
        libraryId: credentials.libraryId!,
        authorizationSignature: credentials.authorizationSignature!,
        authorizationExpire: credentials.authorizationExpire!,
        title: file.name,
        onProgress: (percent, loaded, total) => {
          onProgress?.(percent, loaded, total);
        },
        onSuccess: () => {
          resolve();
        },
        onError: (err) => {
          console.warn('[ContentAPI] TUS upload failed, attempting direct fallback:', err);
          fallbackUpload().then(resolve).catch(reject);
        },
      });
      tusUpload.start();
    });
  }

  return fallbackUpload();

  function fallbackUpload(): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);

      if (credentials.accessKey) {
        xhr.setRequestHeader('AccessKey', credentials.accessKey);
      }
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(Math.round((event.loaded / event.total) * 100), 100);
            onProgress(percent, event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`فشل رفع الفيديو إلى Bunny Stream (كود: ${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('تعذر الاتصال بسحابة Bunny Stream أثناء رفع الفيديو. يرجى التحقق من اتصال الإنترنت.'));
      };

      xhr.onabort = () => {
        reject(new Error('تم إلغاء رفع الفيديو'));
      };

      xhr.send(file);
    });
  }
}

export function uploadFileToR2(
  uploadUrl: string,
  file: File,
  contentType?: string,
  onProgress?: UploadProgressCallback,
): Promise<void> {
  const mimeType = contentType || file.type || 'application/octet-stream';
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', mimeType);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(Math.round((event.loaded / event.total) * 100), 100);
          onProgress(percent, event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`فشل رفع الملف إلى التخزين السحابي (كود ${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('تعذر الاتصال بخادم التخزين السحابي أثناء الرفع.'));
    };

    xhr.onabort = () => {
      reject(new Error('تم إلغاء رفع الملف'));
    };

    xhr.send(file);
  });
}

export async function uploadRawFile(
  file: File,
  folder = 'assessments',
  onProgress?: UploadProgressCallback,
): Promise<{ fileUrl: string; fileKey: string; fileSize: number; fileType: string; fileName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await uploadWithProgress<any>(
    '/content/upload-raw',
    'POST',
    formData,
    undefined,
    onProgress,
  );

  return {
    fileUrl: res.fileUrl || res.url || res.publicUrl,
    fileKey: res.fileKey || res.key,
    fileSize: res.fileSize || file.size,
    fileType: res.fileType || file.type,
    fileName: res.fileName || file.name,
  };
}

/**
 * Direct presigned file upload helper that uploads straight from browser
 * to Cloudflare R2 with real-time progress tracking.
 */
export async function uploadFileResilient(
  file: File,
  folder = 'homework-submissions',
  onProgress?: UploadProgressCallback,
): Promise<{ fileUrl: string; fileKey: string }> {
  try {
    const presigned = await generatePresignedUrl({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSizeBytes: file.size,
      folder,
    });
    await uploadFileToR2(presigned.uploadUrl, file, file.type, onProgress);
    return {
      fileUrl: presigned.publicUrl || presigned.uploadUrl,
      fileKey: presigned.fileKey,
    };
  } catch (err) {
    console.error('Direct presigned upload to Cloudflare R2 failed:', err);
    throw new Error('فشل رفع الملف إلى التخزين السحابي. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
  }
}

export async function uploadContentDirectly(
  formData: FormData,
  onProgress?: UploadProgressCallback,
): Promise<EducationalContent> {
  return uploadWithProgress<EducationalContent>(
    '/content/upload-direct',
    'POST',
    formData,
    undefined,
    onProgress,
  );
}

export async function createContent(payload: CreateContentPayload): Promise<EducationalContent> {
  return apiClient<EducationalContent>('/content', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateContentDirectly(
  id: string,
  formData: FormData,
  onProgress?: UploadProgressCallback,
): Promise<EducationalContent> {
  return uploadWithProgress<EducationalContent>(
    `/content/${id}`,
    'PUT',
    formData,
    undefined,
    onProgress,
  );
}

export async function updateContent(id: string, payload: UpdateContentPayload): Promise<EducationalContent> {
  return apiClient<EducationalContent>(`/content/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchGroupSessions(groupId: string): Promise<GroupSessionOption[]> {
  if (!groupId) return [];
  return apiClient<GroupSessionOption[]>(`/schedules/group/${groupId}/sessions`);
}

export async function deleteContent(id: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/content/${id}`, {
    method: 'DELETE',
  });
}

export async function deleteFileFromStorage(fileKeyOrUrl?: string | null): Promise<{ success: boolean }> {
  if (!fileKeyOrUrl) return { success: true };
  try {
    return await apiClient('/content/file', {
      method: 'DELETE',
      body: JSON.stringify(
        fileKeyOrUrl.startsWith('http') || fileKeyOrUrl.startsWith('/')
          ? { fileUrl: fileKeyOrUrl }
          : { fileKey: fileKeyOrUrl }
      ),
    });
  } catch (err) {
    console.warn('Failed to delete file from storage:', err);
    return { success: false };
  }
}
