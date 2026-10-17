import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import * as crypto from 'crypto';

export function generateBunnyEmbedTicket(
  libraryId: string,
  videoId: string,
  tokenSecurityKey: string,
  ttlSeconds = 7200, // 2 hours expiration
): { embedUrl: string; expires: number } {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  // Bunny token formula: SHA256(securityKey + videoId + expires)
  const hashable = `${tokenSecurityKey}${videoId}${expires}`;
  const token = crypto.createHash('sha256').update(hashable).digest('hex');

  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
  return { embedUrl, expires };
}

@Injectable()
export class CourseVideoService {
  private readonly logger = new Logger(CourseVideoService.name);

  constructor(private readonly bunnyVideoService: BunnyVideoService) {}

  /**
   * Helper to safely extract Bunny Stream Video GUID from a string, URL, or URI.
   * Handles bunny:<id>, bare GUID, iframe/bunnycdn URLs, and custom CDN hostnames.
   */
  public extractBunnyVideoId(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('bunny:')) {
      const id = trimmed.replace('bunny:', '').trim().split(/[?#\s]/)[0];
      return id || null;
    }
    const guidMatch = trimmed.match(
      /(?:iframe\.mediadelivery\.net\/embed\/\d+\/|video\.bunnycdn\.com\/library\/\d+\/videos\/|video\.bunnycdn\.com\/play\/|video\.bunnycdn\.com\/)([a-f0-9\-]{36})/i,
    );
    if (guidMatch) return guidMatch[1];
    const cdnMatch = trimmed.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (cdnMatch && (trimmed.includes('mediadelivery.net') || trimmed.includes('bunnycdn.com') || trimmed.includes('m3u8') || trimmed.includes('/embed/'))) {
      return cdnMatch[1];
    }
    if (cdnMatch && !trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      return cdnMatch[1];
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      return trimmed.split(/[?#\s]/)[0] || null;
    }
    return null;
  }

  public resolveLessonVideoId(lesson?: {
    bunnyVideoId?: string | null;
    videoAssetId?: string | null;
    contentUrl?: string | null;
  } | null): string | null {
    if (!lesson) return null;
    return (
      this.extractBunnyVideoId(lesson.bunnyVideoId) ||
      this.extractBunnyVideoId(lesson.videoAssetId) ||
      this.extractBunnyVideoId(lesson.contentUrl)
    );
  }

  public isBunnyEmbedUrl(value?: string | null): boolean {
    if (!value) return false;
    return (
      value.includes('iframe.mediadelivery.net') ||
      value.includes('video.bunnycdn.com') ||
      value.startsWith('bunny:')
    );
  }

  public resolveFreshLessonEmbed(
    lesson?: { bunnyVideoId?: string | null; videoAssetId?: string | null; contentUrl?: string | null } | null,
  ): string | null {
    const videoId = this.resolveLessonVideoId(lesson);
    if (videoId) {
      try {
        return this.bunnyVideoService.getEmbedUrl(videoId);
      } catch {
        return null;
      }
    }
    if (lesson?.contentUrl && !this.isBunnyEmbedUrl(lesson.contentUrl)) {
      return lesson.contentUrl;
    }
    return null;
  }

  /**
   * Helper to dynamically sign Bunny Stream course preview embed URLs when token auth is active.
   * Handles stale signed URLs, bunny:<id>, and bare GUIDs - always returns fresh.
   */
  public signPreviewVideoUrl(rawUrl?: string | null): string | null {
    if (!rawUrl) return null;
    const videoId = this.extractBunnyVideoId(rawUrl);
    // Non-Bunny direct file - return as-is
    if (!videoId || !this.isBunnyEmbedUrl(rawUrl)) {
      if (videoId && /^[a-f0-9\-]{36}$/i.test(videoId)) {
        try {
          return this.bunnyVideoService.getEmbedUrl(videoId);
        } catch {
          return rawUrl;
        }
      }
      return rawUrl;
    }

    const tokenSecurityKey =
      process.env.BUNNY_STREAM_TOKEN_KEY ||
      (typeof this.bunnyVideoService?.getTokenSecurityKey === 'function'
        ? this.bunnyVideoService.getTokenSecurityKey()
        : '') ||
      '';
    if (!tokenSecurityKey) {
      try {
        return this.bunnyVideoService.getEmbedUrl(videoId);
      } catch {
        return rawUrl;
      }
    }

    const libMatch = rawUrl.match(/iframe\.mediadelivery\.net\/embed\/(\d+)\//i);
    const libraryId =
      libMatch?.[1] ||
      (typeof this.bunnyVideoService?.getLibraryId === 'function'
        ? this.bunnyVideoService.getLibraryId()
        : '');
    if (!libraryId) return rawUrl;
    const ticket = generateBunnyEmbedTicket(libraryId, videoId, tokenSecurityKey, 86400);
    return ticket.embedUrl;
  }

  /**
   * Generates direct upload credentials for Bunny Stream video upload.
   */
  public async generateDirectVideoUploadCredentials(title: string) {
    const creds = await this.bunnyVideoService.generateDirectUploadCredentials(title);
    return {
      ...creds,
      provider: 'bunny' as const,
      contentUrl: creds.embedUrl,
    };
  }

  /**
   * Uploads a video buffer directly to Bunny Stream via server proxy fallback.
   */
  public async uploadVideoDirect(file: Express.Multer.File, title?: string, videoId?: string) {
    if (!file || !file.buffer || file.buffer.length === 0 || file.size === 0) {
      throw new BadRequestException('ملف الفيديو فارغ (0 بايت). يرجى اختيار ملف فيديو صالح وإعادة الرفع.');
    }
    const videoTitle = title?.trim() || file.originalname || 'Course Video';

    if (videoId && videoId.trim() !== '') {
      const targetId = videoId.trim();
      try {
        await this.bunnyVideoService.uploadVideoBuffer(targetId, file.buffer);
        return {
          provider: 'bunny' as const,
          videoId: targetId,
          embedUrl: this.bunnyVideoService.getEmbedUrl(targetId),
          playbackUrl: this.bunnyVideoService.generateSecurePlaybackUrl(targetId),
          contentUrl: this.bunnyVideoService.getEmbedUrl(targetId),
        };
      } catch (reuseError: any) {
        this.logger.warn(
          `Failed to reuse existing video object [${targetId}] for direct upload: ${reuseError?.message || 'status error'}. Deleting orphan and creating fresh Bunny video...`,
        );
        await this.bunnyVideoService.deleteVideo(targetId).catch(() => {});
      }
    }

    try {
      const result = await this.bunnyVideoService.uploadVideo(videoTitle, file.buffer);
      return {
        provider: 'bunny' as const,
        videoId: result.videoId,
        embedUrl: result.embedUrl,
        playbackUrl: result.playbackUrl,
        contentUrl: result.embedUrl,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `فشل رفع الفيديو إلى Bunny Stream: ${error?.message || 'خطأ غير متوقع'}. أعد المحاولة.`,
      );
    }
  }
}
