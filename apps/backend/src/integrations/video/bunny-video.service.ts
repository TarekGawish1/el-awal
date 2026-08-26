import { Injectable, Logger } from '@nestjs/common';
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
  accessKey: string;
  embedUrl: string;
  playbackUrl: string;
}

@Injectable()
export class BunnyVideoService {
  private readonly logger = new Logger(BunnyVideoService.name);
  private readonly apiKey: string;
  private readonly libraryId: string;
  private readonly cdnHostname: string;
  private readonly tokenSecurityKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BUNNY_API_KEY', '');
    this.libraryId = this.configService.get<string>('BUNNY_LIBRARY_ID', '');
    this.cdnHostname = this.configService.get<string>('BUNNY_CDN_HOSTNAME', 'video.elawal.com');
    this.tokenSecurityKey = this.configService.get<string>('BUNNY_TOKEN_SECURITY_KEY', '');
  }

  getLibraryId(): string {
    return this.libraryId;
  }

  /**
   * Creates a video object in Bunny Stream and returns video ID and direct upload URL.
   */
  async createDirectUploadVideo(title: string): Promise<CreateVideoResult> {
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
        throw new Error(`Bunny API responded with status ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as { guid: string };
      const videoId = data.guid;
      const directUploadUrl = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;

      return {
        videoId,
        directUploadUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to create Bunny Stream video [${title}]:`, error);
      throw error;
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
   */
  async uploadVideoBuffer(videoId: string, buffer: Buffer): Promise<void> {
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

      this.logger.log(`✅ Video [${videoId}] buffer successfully uploaded to Bunny Stream`);
    } catch (error) {
      this.logger.error(`Error uploading video buffer to Bunny Stream for [${videoId}]:`, error);
      throw error;
    }
  }

  /**
   * Creates a video record in Bunny Stream and uploads the buffer in one integrated operation.
   */
  async uploadVideo(title: string, buffer: Buffer): Promise<UploadVideoResult> {
    const { videoId } = await this.createDirectUploadVideo(title);
    await this.uploadVideoBuffer(videoId, buffer);

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
      };
    } catch (error) {
      this.logger.error(`Failed to get Bunny Stream video details for [${videoId}]:`, error);
      throw error;
    }
  }
}
