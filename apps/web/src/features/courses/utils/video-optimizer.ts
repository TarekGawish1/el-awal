/**
 * Video Optimizer & Large Video (up to 2GB) Pre-processing Engine
 * Validates sizes, extracts metadata, formats units, and assists direct Bunny Stream upload.
 */

export const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB = 2,147,483,648 bytes

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  aspectRatio: string;
  qualityLabel: string; // '4K (2160p)' | 'Full HD (1080p)' | 'HD (720p)' | 'SD (480p)' | '360p'
  fileSizeBytes: number;
  formattedSize: string;
  bitrateMbps: number;
  needsCompressionSuggestion: boolean;
}

/**
 * Formats bytes into a localized Arabic readable string (ميجابايت / جيجابايت).
 */
export function formatVideoSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 ميجابايت';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(2)} جيجابايت`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} ميجابايت`;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS format.
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats time remaining in Arabic (دقيقة / ثانية).
 */
export function formatEtaArabic(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return 'جاري الحساب...';
  if (seconds < 60) {
    return `${Math.ceil(seconds)} ثانية`;
  }
  const mins = Math.floor(seconds / 60);
  const remainingSecs = Math.ceil(seconds % 60);
  return `${mins} دقيقة و ${remainingSecs} ثانية`;
}

/**
 * Validates whether the video file is within the 2 GB limit and has a valid video format.
 */
export function validateVideoFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'لم يتم تحديد أي ملف فيديو' };
  }

  // Check 2 GB size limit
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    const currentSize = formatVideoSize(file.size);
    return {
      isValid: false,
      error: `حجم الفيديو (${currentSize}) يتجاوز الحد الأقصى المسموح به وهو 2 جيجابايت`,
    };
  }

  // Check acceptable video mime / extension
  const validExtensions = ['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v', '.wmv', '.flv'];
  const fileNameLower = file.name.toLowerCase();
  const hasValidExt = validExtensions.some((ext) => fileNameLower.endsWith(ext));
  const isVideoMime = file.type ? file.type.startsWith('video/') : hasValidExt;

  if (!isVideoMime && !hasValidExt) {
    return {
      isValid: false,
      error: 'نوع الملف غير مدعوم. يرجى اختيار ملف فيديو بصيغة (MP4, MOV, MKV, WebM)',
    };
  }

  return { isValid: true };
}

/**
 * Inspects a video file in the browser to extract its duration, dimensions, resolution quality, and bitrate.
 */
export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadedmetadata = () => {
      const durationSeconds = Math.round(video.duration) || 0;
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const fileSizeBytes = file.size;
      const formattedSize = formatVideoSize(fileSizeBytes);

      // Calculate approximate bitrate (Mbps)
      let bitrateMbps = 0;
      if (durationSeconds > 0) {
        const bits = fileSizeBytes * 8;
        bitrateMbps = parseFloat((bits / (durationSeconds * 1000 * 1000)).toFixed(2));
      }

      // Determine quality label
      let qualityLabel = 'Full HD (1080p)';
      if (height >= 2160 || width >= 3840) qualityLabel = '4K Ultra HD (2160p)';
      else if (height >= 1440 || width >= 2560) qualityLabel = '2K QHD (1440p)';
      else if (height >= 1080 || width >= 1920) qualityLabel = 'Full HD (1080p)';
      else if (height >= 720 || width >= 1280) qualityLabel = 'HD (720p)';
      else if (height >= 480) qualityLabel = 'SD (480p)';
      else qualityLabel = '360p';

      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(width, height) || 1;
      const aspectRatio = `${width / divisor}:${height / divisor}`;

      // Suggest compression if video is > 500MB and has high bitrate
      const needsCompressionSuggestion = fileSizeBytes > 500 * 1024 * 1024 && bitrateMbps > 8;

      cleanup();
      resolve({
        durationSeconds,
        width,
        height,
        aspectRatio,
        qualityLabel,
        fileSizeBytes,
        formattedSize,
        bitrateMbps,
        needsCompressionSuggestion,
      });
    };

    video.onerror = () => {
      cleanup();
      // Fallback with basic file size info
      resolve({
        durationSeconds: 0,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        qualityLabel: 'Full HD (1080p)',
        fileSizeBytes: file.size,
        formattedSize: formatVideoSize(file.size),
        bitrateMbps: 0,
        needsCompressionSuggestion: file.size > 800 * 1024 * 1024,
      });
    };

    video.src = objectUrl;
  });
}
