import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

export interface CreateVideoResult {
  videoId: string;
  directUploadUrl: string;
}

export interface VideoDetailsResult {
  videoId: string;
  title: string;
  duration: number;
  status: number; // 0 = Created, 1 = Uploaded, 2 = Processing, 3 = Transcoding, 4 = Finished, 5 = Error
  statusText: string;
  encodeProgress: number;
  storageSize: number; // bytes stored in Bunny (0 = no data uploaded yet)
}

export interface UploadVideoResult {
  videoId: string;
  embedUrl: string;
  playbackUrl: string;
}

export interface DirectUploadCredentialsResult {
  videoId: string;
  libraryId: string;
  uploadUrl: string;
  authorizationSignature: string;
  authorizationExpire: number;
  // The browser direct PUT authenticates with this key (Bunny simple upload
  // flow). It is sent along the signature headers.
  accessKey: string;
  embedUrl: string;
  playbackUrl: string;
}

export function generateBunnyEmbedTicket(
  libraryId: string,
  videoId: string,
  tokenSecurityKey: string,
  ttlSeconds = 7200, // 2 hours expiration
): { embedUrl: string; expires: number } {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  // Bunny token formula: SHA256(securityKey + videoId + expires)
  const hashable = `${tokenSecurityKey}${videoId}${expires}`;
  const token = createHash('sha256').update(hashable).digest('hex');

  const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
  return { embedUrl, expires };
}

@Injectable()
export class BunnyVideoService {
  private readonly logger = new Logger(BunnyVideoService.name);
  private readonly apiKey: string;
  private readonly libraryId: string;
  private readonly cdnHostname: string;
  private readonly tokenSecurityKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BUNNY_API_KEY', '').trim();
    this.libraryId = (
      this.configService.get<string>('BUNNY_STREAM_LIBRARY_ID') ||
      this.configService.get<string>('BUNNY_LIBRARY_ID', '')
    ).trim();
    this.cdnHostname = this.configService.get<string>('BUNNY_CDN_HOSTNAME', 'video.elawal.com').trim();
    this.tokenSecurityKey = (
      this.configService.get<string>('BUNNY_STREAM_TOKEN_KEY') ||
      this.configService.get<string>('BUNNY_TOKEN_SECURITY_KEY', '')
    ).trim();
  }

  getLibraryId(): string {
    return this.libraryId;
  }

  getTokenSecurityKey(): string {
    return this.tokenSecurityKey;
  }

  generateEmbedTicket(videoId: string, ttlSeconds = 7200): { embedUrl: string; expires: number } {
    return generateBunnyEmbedTicket(this.libraryId, videoId, this.tokenSecurityKey, ttlSeconds);
  }

  /**
   * Creates a video object in Bunny Stream and returns video ID and direct upload URL.
   */
  async createDirectUploadVideo(title: string): Promise<CreateVideoResult> {
    if (!this.libraryId || !this.apiKey) {
      this.logger.error('Bunny Stream credentials missing: BUNNY_LIBRARY_ID or BUNNY_API_KEY is not configured');
      throw new BadRequestException(
        'إعدادات سيرفر Bunny Stream غير مكتملة على السيرفر (BUNNY_LIBRARY_ID أو BUNNY_API_KEY مفقود). يرجى ضبط المتغيرات في إعدادات المنصة.',
      );
    }

    try {
      const response = await fetch(
        `https://video.bunnycdn.com/library/${this.libraryId}/videos`,
        {
          method: 'POST',
          headers: {
            AccessKey: this.apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ title }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(`Bunny Stream API error (${response.status}): ${errorText}`);

        if (response.status === 401) {
          throw new BadRequestException(
            'فشل التحقق من مفتاح Bunny Stream (401 Unauthorized). يرجى التأكد من صحة Stream API Key ومطابقته لـ Video Library ID في إعدادات المنصة.',
          );
        }
        throw new BadRequestException(
          `فشل إنشاء الفيديو في Bunny Stream (كود ${response.status}): ${errorText || 'طلب غير صالح'}`,
        );
      }

      const data = (await response.json()) as { guid: string };
      const videoId = data.guid;
      const directUploadUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;

      return {
        videoId,
        directUploadUrl,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create Bunny Stream video [${title}]:`, error);
      throw new BadRequestException(
        `تعذر الاتصال بسيرفر Bunny Stream: ${error?.message || 'خطأ غير متوقع'}`,
      );
    }
  }

  /**
   * Generates direct client-to-Bunny upload credentials with SHA256 signature for secure browser uploads.
   */
  async generateDirectUploadCredentials(title: string, expiresInSeconds = 7200): Promise<DirectUploadCredentialsResult> {
    const { videoId } = await this.createDirectUploadVideo(title);
    const expirationTime = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const rawAuth = `${this.libraryId}${this.apiKey}${expirationTime}${videoId}`;
    const authorizationSignature = createHash('sha256').update(rawAuth).digest('hex');

    const embedUrl = this.getEmbedUrl(videoId);
    const playbackUrl = this.tokenSecurityKey
      ? this.generateSecurePlaybackUrl(videoId)
      : `https://${this.cdnHostname}/${videoId}/playlist.m3u8`;

    return {
      videoId,
      libraryId: this.libraryId,
      uploadUrl: `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`,
      authorizationSignature,
      authorizationExpire: expirationTime,
      accessKey: this.apiKey,
      embedUrl,
      playbackUrl,
    };
  }

  /**
   * Uploads a raw binary video buffer to Bunny Stream for a specified video ID.
   * Rejects empty buffers BEFORE touching the network so we never create
   * 0-byte videos that sit in "Processing" forever. A 2xx PUT means Bunny
   * accepted the bytes; the follow-up status check is best-effort only and
   * never fails the upload (Bunny's read API can lag seconds behind a PUT,
   * and a strict check here caused false "could not be verified" loops).
   */
  async uploadVideoBuffer(videoId: string, buffer: Buffer): Promise<void> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('ملف الفيديو فارغ (0 بايت). يرجى اختيار ملف فيديو صالح وإعادة الرفع.');
    }
    try {
      const uploadUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          AccessKey: this.apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(buffer) as unknown as BodyInit,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        this.logger.error(`Bunny Stream video buffer upload failed for [${videoId}]: ${response.status} ${errText}`);
        throw new Error(`Failed to upload video to Bunny Stream (status ${response.status})`);
      }

      // Best-effort confirmation poll: give Bunny a few seconds to register
      // the bytes. Never throws - the 2xx above is the source of truth.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const details = await this.getVideoDetails(videoId);
          if (details.storageSize > 0 || details.status >= 1) break;
        } catch {
          // ignore and retry
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      this.logger.log(`✅ Video [${videoId}] buffer successfully uploaded to Bunny Stream`);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Error uploading video buffer to Bunny Stream for [${videoId}]:`, error);
      throw error;
    }
  }

  /**
   * Creates a video record in Bunny Stream and uploads the buffer in one integrated operation.
   */
  async uploadVideo(title: string, buffer: Buffer): Promise<UploadVideoResult> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('ملف الفيديو فارغ (0 بايت). يرجى اختيار ملف فيديو صالح وإعادة الرفع.');
    }
    const { videoId } = await this.createDirectUploadVideo(title);
    try {
      await this.uploadVideoBuffer(videoId, buffer);
    } catch (error) {
      // Don't leave a 0-byte orphan behind when the bytes never landed.
      await this.deleteVideo(videoId).catch(() => {});
      throw error;
    }

    const embedUrl = this.getEmbedUrl(videoId);
    const playbackUrl = this.tokenSecurityKey
      ? this.generateSecurePlaybackUrl(videoId)
      : `https://${this.cdnHostname}/${videoId}/playlist.m3u8`;

    return {
      videoId,
      embedUrl,
      playbackUrl,
    };
  }

  /**
   * Generates a time-limited token-authenticated HLS playback URL with SHA256 DRM signing.
   */
  generateSecurePlaybackUrl(videoId: string, expiresInSeconds = 7200): string {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    if (this.tokenSecurityKey) {
      const rawSignature = `${this.tokenSecurityKey}${videoId}${expires}`;
      const token = createHash('sha256').update(rawSignature).digest('hex');
      return `https://${this.cdnHostname}/${videoId}/playlist.m3u8?token=${token}&expires=${expires}`;
    }
    return `https://${this.cdnHostname}/${videoId}/playlist.m3u8`;
  }

  /**
   * Returns iframe embed URL for Bunny Stream player with optional token signing.
   */
  getEmbedUrl(videoId: string, expiresInSeconds = 7200): string {
    if (this.tokenSecurityKey) {
      const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
      const rawSignature = `${this.tokenSecurityKey}${videoId}${expires}`;
      const token = createHash('sha256').update(rawSignature).digest('hex');
      return `https://iframe.mediadelivery.net/embed/${this.libraryId}/${videoId}?token=${token}&expires=${expires}`;
    }
    return `https://iframe.mediadelivery.net/embed/${this.libraryId}/${videoId}`;
  }

  /**
   * Deletes a video from Bunny Stream.
   */
  async deleteVideo(videoId: string): Promise<void> {
    try {
      const url = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          AccessKey: this.apiKey,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errText = await response.text().catch(() => '');
        this.logger.warn(`Failed to delete Bunny Stream video [${videoId}]: ${response.status} ${errText}`);
      } else {
        this.logger.log(`🗑️ Deleted Bunny Stream video [${videoId}]`);
      }
    } catch (error) {
      this.logger.warn(`Error deleting Bunny Stream video [${videoId}]:`, error);
    }
  }

  /**
   * Fetches video encoding and transcoding status from Bunny Stream.
   */
  async getVideoDetails(videoId: string): Promise<VideoDetailsResult> {
    try {
      const response = await fetch(
        `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`,
        {
          method: 'GET',
          headers: {
            AccessKey: this.apiKey,
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        // Deleted-in-dashboard or otherwise missing videos must surface as
        // 404 (so callers stop generating player URLs for them) instead of
        // blending into generic errors that get swallowed as READY.
        if (response.status === 404) {
          throw new NotFoundException(`Bunny video [${videoId}] not found in library`);
        }
        throw new Error(`Bunny API responded with status ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as any;
      const statusMap: Record<number, string> = {
        0: 'CREATED',
        1: 'UPLOADED',
        2: 'PROCESSING',
        3: 'TRANSCODING',
        4: 'FINISHED',
        5: 'ERROR',
      };

      return {
        videoId: data.guid,
        title: data.title,
        duration: data.length || 0,
        status: data.status,
        statusText: statusMap[data.status] || 'UNKNOWN',
        encodeProgress: data.encodeProgress || 0,
        storageSize: Number(data.storageSize ?? data.size ?? 0) || 0,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get Bunny Stream video details for [${videoId}]:`, error);
      throw error;
    }
  }
}
