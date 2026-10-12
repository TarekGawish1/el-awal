import * as tus from 'tus-js-client';

export interface BunnyTusUploadOptions {
  file: File;
  videoId: string;
  libraryId: string;
  authorizationSignature: string;
  authorizationExpire: number;
  title?: string;
  chunkSize?: number;
  retryDelays?: number[];
  onProgress?: (
    progress: number,
    uploadedBytes: number,
    totalBytes: number,
    speedMbps: number,
    etaSeconds: number,
  ) => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface BunnyTusUploadInstance {
  start: () => void;
  abort: () => void;
}

/**
 * Direct client-to-Bunny Stream resumable uploader using the official TUS protocol.
 * Bypasses reverse proxy timeouts (Heroku/Nginx/Cloudflare), server RAM limits, and CORS restrictions.
 * Supports automatic chunked resumption, progress/speed tracking, and clean cancellation.
 */
export function createBunnyTusUpload(options: BunnyTusUploadOptions): BunnyTusUploadInstance {
  const {
    file,
    videoId,
    libraryId,
    authorizationSignature,
    authorizationExpire,
    title,
    chunkSize = 5 * 1024 * 1024, // 5MB chunks (Bunny Stream optimal)
    retryDelays = [0, 1000, 3000, 5000, 10000, 20000],
    onProgress,
    onSuccess,
    onError,
  } = options;

  let lastLoaded = 0;
  let lastTime = Date.now();
  let isAborted = false;

  const upload = new tus.Upload(file, {
    endpoint: 'https://video.bunnycdn.com/tusupload',
    retryDelays,
    chunkSize,
    headers: {
      AuthorizationSignature: authorizationSignature,
      AuthorizationExpire: authorizationExpire.toString(),
      VideoId: videoId,
      LibraryId: libraryId,
    },
    metadata: {
      filename: file.name,
      filetype: file.type || 'video/mp4',
      title: (title || file.name).trim(),
    },
    uploadSize: file.size,
    onError: (err) => {
      if (isAborted) return;
      console.error('[BunnyTusUpload] Upload failed:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      if (isAborted) return;
      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000;
      let currentSpeed = 0;
      let eta = 0;

      if (timeDiff >= 0.5) {
        const bytesDiff = bytesUploaded - lastLoaded;
        currentSpeed = bytesDiff / timeDiff / (1024 * 1024); // MB/s
        const remainingBytes = bytesTotal - bytesUploaded;
        eta = currentSpeed > 0 ? remainingBytes / (1024 * 1024) / currentSpeed : 0;
        lastLoaded = bytesUploaded;
        lastTime = now;
      }

      // Map progress to 15% - 99% during chunk streaming, reserving 100% for final confirmation
      const rawPercent = bytesTotal > 0 ? (bytesUploaded / bytesTotal) : 0;
      const mappedPercent = Math.min(Math.round(rawPercent * 84) + 15, 99);

      onProgress?.(
        mappedPercent,
        bytesUploaded,
        bytesTotal,
        currentSpeed > 0 ? parseFloat(currentSpeed.toFixed(2)) : 0,
        eta > 0 ? Math.ceil(eta) : 0,
      );
    },
    onSuccess: () => {
      if (isAborted) return;
      console.log(`[BunnyTusUpload] Finished upload for video [${videoId}]`);
      onProgress?.(100, file.size, file.size, 0, 0);
      onSuccess?.();
    },
  });

  return {
    start: () => {
      isAborted = false;
      upload.start();
    },
    abort: () => {
      isAborted = true;
      try {
        upload.abort();
      } catch (err) {
        console.warn('[BunnyTusUpload] Error aborting upload:', err);
      }
    },
  };
}
