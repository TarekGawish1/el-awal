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
   * Generates a time-limited token-authenticated HLS playback URL with SHA256 DRM signing.
   */
  generateSecurePlaybackUrl(videoId: string, expiresInSeconds = 7200): string {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const rawSignature = `${this.tokenSecurityKey}${videoId}${expires}`;
    const token = createHash('sha256').update(rawSignature).digest('hex');

    return `https://${this.cdnHostname}/${videoId}/playlist.m3u8?token=${token}&expires=${expires}`;
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
