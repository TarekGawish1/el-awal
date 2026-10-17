import { apiClient } from '@/lib/api/client';
import { API_BASE_URL } from '@/lib/api/endpoints';
import { getStoredAccessToken } from '@/features/auth/utils/auth-tokens';
import { DirectUploadCredentials } from '../types/courses.types';

export const coursesVideoUploadApi = {
  // Direct Bunny Video Upload Credentials
  getVideoUploadCredentials: async (title: string): Promise<DirectUploadCredentials> => {
    return apiClient<DirectUploadCredentials>('/courses/lessons/upload-video-credentials', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  // Server-Side Fallback Direct Video Upload to Bunny Stream
  uploadVideoDirectToServer: async (
    file: File,
    title?: string,
    onProgress?: (percent: number, loaded: number, total: number) => void,
    videoId?: string,
    onXhrCreated?: (xhr: XMLHttpRequest) => void,
  ): Promise<{
    videoId: string;
    embedUrl: string;
    provider: 'bunny';
    playbackUrl?: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (videoId) formData.append('videoId', videoId);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (onXhrCreated) {
        onXhrCreated(xhr);
      }
      const url = `${API_BASE_URL}/courses/lessons/upload-video-stream`;
      xhr.open('POST', url);

      if (onXhrCreated) {
        onXhrCreated(xhr);
      }

      const token = getStoredAccessToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.setRequestHeader('Accept', 'application/json');

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(Math.round((event.loaded / event.total) * 100), 100);
            onProgress(percent, event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            const data = json?.data || json;
            resolve({
              videoId: data.videoId,
              embedUrl: data.embedUrl,
              playbackUrl: data.playbackUrl,
              provider: 'bunny',
            });
          } catch {
            resolve(JSON.parse(xhr.responseText));
          }
        } else {
          let errorMsg = `تعذر رفع الفيديو إلى سيرفر البث السحابي (كود: ${xhr.status})`;
          if (xhr.status === 413) {
            errorMsg = 'حجم ملف الفيديو يتجاوز الحد الأقصى المسموح به لخادم الرفع (500 ميجابايت). يرجى تقليل حجم الفيديو أو الرفع المباشر.';
          } else if (xhr.status === 499 || xhr.status === 504) {
            errorMsg = 'استغرق رفع الفيديو وقتاً طويلاً وتوقف اتصال السيرفر. يرجى استخدام الرفع المباشر السحابي أو التأكد من سرعة الإنترنت.';
          }
          try {
            const errObj = JSON.parse(xhr.responseText);
            if (errObj?.message) errorMsg = errObj.message;
          } catch {}
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('تعذر الاتصال بالسيرفر أثناء رفع الفيديو إلى Bunny Stream. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.'));
      };
      xhr.onabort = () => reject(new Error('تم إلغاء رفع الفيديو'));

      xhr.send(formData);
    });
  },

  getPresignedUploadUrl: async (data: {
    fileName: string;
    contentType?: string;
    fileType?: string;
    fileSizeBytes?: number;
    folder?: string;
  }): Promise<{
    uploadUrl: string;
    publicUrl: string;
    fileKey: string;
    expiresInSeconds: number;
  }> => {
    return apiClient('/content/presigned-upload-url', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  uploadRawFile: async (
    file: File,
    folder = 'courses',
    onProgress?: (percent: number) => void,
  ): Promise<{
    fileUrl: string;
    fileKey: string;
    fileSize: number;
    fileType: string;
    fileName: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const token = getStoredAccessToken() || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    const uploadBase = API_BASE_URL.replace(/\/+$/, '');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${uploadBase}/content/upload-raw`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.min(Math.round((event.loaded / event.total) * 100), 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            const data = res?.data || res;
            resolve({
              fileUrl: data.fileUrl || data.url || data.publicUrl,
              fileKey: data.fileKey || data.key,
              fileSize: data.fileSize || data.size,
              fileType: data.fileType || data.type,
              fileName: data.fileName || data.name,
            });
          } catch (e) {
            reject(new Error('استجابة غير صالحة من السيرفر'));
          }
        } else {
          reject(new Error(`فشل رفع الملف إلى السيرفر (كود: ${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('تعذر الاتصال بالسيرفر أثناء الرفع.'));
      xhr.send(formData);
    });
  },

  uploadDirectFile: async (
    file: File,
    folder = 'courses',
    onProgress?: (percent: number) => void,
  ): Promise<{
    fileUrl: string;
    fileKey: string;
    fileSize: number;
    fileType: string;
    fileName: string;
  }> => {
    const mimeType = file.type || 'application/octet-stream';
    try {
      const presigned = await coursesVideoUploadApi.getPresignedUploadUrl({
        fileName: file.name,
        contentType: mimeType,
        fileType: mimeType,
        fileSizeBytes: file.size,
        folder,
      });

      if (!presigned?.uploadUrl || !presigned.uploadUrl.startsWith('http') || !presigned?.publicUrl) {
        throw new Error('FALLBACK_TO_SERVER_UPLOAD');
      }

      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presigned.uploadUrl);
        xhr.setRequestHeader('Content-Type', mimeType);

        if (onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && event.total > 0) {
              const percent = Math.min(Math.round((event.loaded / event.total) * 100), 100);
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              fileUrl: presigned.publicUrl,
              fileKey: presigned.fileKey,
              fileSize: file.size,
              fileType: mimeType,
              fileName: file.name,
            });
          } else {
            reject(new Error(`فشل رفع الملف إلى التخزين السحابي (كود: ${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error('تعذر الاتصال بخادم التخزين السحابي أثناء الرفع.'));
        xhr.onabort = () => reject(new Error('تم إلغاء عملية الرفع'));
        xhr.send(file);
      });
    } catch (err) {
      console.warn('Direct presigned upload failed; falling back to server raw upload:', err);
      return await coursesVideoUploadApi.uploadRawFile(file, folder, onProgress);
    }
  },

  deleteUploadedFile: async (fileKeyOrUrl?: string | null): Promise<{ success: boolean }> => {
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
  },
};
