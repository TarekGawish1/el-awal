import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

export interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicUrlBase: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID', '').trim();
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID', '').trim();
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY', '').trim();
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'el-awal-assets');
    this.publicUrlBase = this.configService.get<string>('R2_PUBLIC_URL', 'https://assets.elawal.com');

    this.isConfigured = Boolean(
      accountId &&
      accessKeyId &&
      secretAccessKey &&
      accountId !== '' &&
      accessKeyId !== '' &&
      secretAccessKey !== ''
    );

    if (this.isConfigured) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('✅ Cloudflare R2 Storage client initialized successfully');
    } else {
      this.logger.warn('⚠️ Cloudflare R2 credentials missing; fallback local storage active.');
    }
  }

  isR2Configured(): boolean {
    return this.isConfigured && !!this.s3Client;
  }

  private toLocalRelativeKey(key: string): string {
    const withoutLeadingSlash = key.replace(/^\/+/, '');
    let candidate = withoutLeadingSlash;
    try {
      if (/^https?:\/\//i.test(candidate)) {
        const parsed = new URL(candidate);
        candidate = parsed.pathname.replace(/^\/+/, '');
      }
    } catch {
      // keep as-is
    }
    candidate = candidate.replace(/^uploads[\\/]/i, '');
    candidate = candidate.replace(/^uploads[\\/]/i, '');
    return candidate.replace(/\\/g, '/');
  }

  private toLocalPublicUrl(key: string): string {
    return `/uploads/${this.toLocalRelativeKey(key)}`;
  }

  /**
   * Generates a presigned URL allowing client direct upload to Cloudflare R2.
   * If R2 is not configured, returns empty uploadUrl so frontend skips the
   * direct PUT (backend only accepts POST multipart) and uses server fallback.
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600,
  ): Promise<PresignedUploadResult> {
    if (!this.isConfigured || !this.s3Client) {
      this.logger.warn(
        `R2 not configured - signalling multipart fallback for key [${key}]. ` +
          `Configure R2_* env vars in production (local disk is ephemeral).`,
      );
      return {
        uploadUrl: '',
        fileKey: key,
        publicUrl: '',
      };
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return {
        uploadUrl,
        fileKey: key,
        publicUrl: `${this.publicUrlBase}/${key}`,
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned upload URL for key [${key}]:`, error);
      return {
        uploadUrl: '',
        fileKey: key,
        publicUrl: '',
      };
    }
  }

  /**
   * Directly uploads a file buffer to Cloudflare R2 bucket with local fallback.
   */
  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<{ fileKey: string; publicUrl: string }> {
    if (this.isConfigured && this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        });

        await this.s3Client.send(command);
        return {
          fileKey: key,
          publicUrl: `${this.publicUrlBase}/${key}`,
        };
      } catch (error) {
        this.logger.error(`Failed to upload buffer for key [${key}] to R2, falling back:`, error);
      }
    }

    // Local fallback storage. NOTE: ephemeral on Heroku - R2 required in prod.
    try {
      const uploadDir = path.resolve(process.cwd(), 'uploads');
      const relativeKey = this.toLocalRelativeKey(key);
      const targetPath = path.resolve(uploadDir, relativeKey);
      if (!targetPath.startsWith(uploadDir)) {
        throw new Error(`Path traversal attempt blocked for key: ${key}`);
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, buffer);
      return {
        fileKey: key,
        publicUrl: this.toLocalPublicUrl(key),
      };
    } catch (err) {
      if (contentType.startsWith('image/')) {
        return {
          fileKey: key,
          publicUrl: `data:${contentType};base64,${buffer.toString('base64')}`,
        };
      }
      return {
        fileKey: key,
        publicUrl: `${this.publicUrlBase}/${key}`,
      };
    }
  }

  /**
   * Generates a temporary time-bound presigned URL to download private files.
   */
  async generatePresignedDownloadUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    if (!this.isConfigured || !this.s3Client) {
      if (key.startsWith('/') || key.startsWith('data:') || /^https?:\/\//i.test(key)) {
        if (key.startsWith('/uploads/uploads/')) {
          return key.replace('/uploads/uploads/', '/uploads/');
        }
        return key;
      }
      return this.toLocalPublicUrl(key);
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error) {
      this.logger.error(`Failed to generate presigned download URL for key [${key}]:`, error);
      return `${this.publicUrlBase}/${key}`;
    }
  }

  /**
   * Deletes an object from Cloudflare R2 bucket or local fallback storage.
   */
  async deleteObject(key: string): Promise<void> {
    if (!key) return;

    if (this.isConfigured && this.s3Client) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });

        await this.s3Client.send(command);
        this.logger.log(`Deleted object [${key}] from R2 bucket [${this.bucketName}]`);
      } catch (error) {
        this.logger.error(`Failed to delete object [${key}] from R2:`, error);
      }
    }

    // Local deletion handles both single and legacy double-prefix layouts.
    try {
      let candidate = key;
      if (/^https?:\/\//i.test(candidate) && candidate.includes('/uploads/')) {
        candidate = candidate.substring(candidate.indexOf('/uploads/') + 1);
      }
      if (candidate.startsWith('data:')) return;
      const cleanKey = candidate.replace(/^\/+/, '');
      const uploadDir = path.resolve(process.cwd(), 'uploads');
      const candidates = [
        path.resolve(uploadDir, this.toLocalRelativeKey(cleanKey)),
        path.resolve(uploadDir, cleanKey),
      ];
      for (const targetPath of candidates) {
        if (!targetPath.startsWith(uploadDir)) continue;
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
          fs.unlinkSync(targetPath);
          this.logger.log(`Deleted local file [${targetPath}]`);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to delete local fallback file for key [${key}]:`, err);
    }
  }

  /**
   * Formats the public CDN URL for an asset key.
   */
  getPublicUrl(key: string): string {
    if (!key) return key;
    if (key.startsWith('data:') || key.startsWith('/uploads/')) {
      return key.replace('/uploads/uploads/', '/uploads/');
    }
    if (/^https?:\/\//i.test(key)) return key;
    return `${this.publicUrlBase}/${key.replace(/^\/+/, '')}`;
  }
}
