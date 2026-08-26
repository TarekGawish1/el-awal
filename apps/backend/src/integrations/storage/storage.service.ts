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

  /**
   * Generates a presigned URL allowing client direct upload to Cloudflare R2.
   * If R2 is not configured, returns a fallback direct upload endpoint.
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600,
  ): Promise<PresignedUploadResult> {
    if (!this.isConfigured || !this.s3Client) {
      return {
        uploadUrl: '/api/v1/content/upload-file',
        fileKey: key,
        publicUrl: `${this.publicUrlBase}/${key}`,
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
        uploadUrl: '/api/v1/content/upload-file',
        fileKey: key,
        publicUrl: `${this.publicUrlBase}/${key}`,
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

    // Local / Base64 fallback storage
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      const targetPath = path.join(uploadDir, key);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, buffer);
      return {
        fileKey: key,
        publicUrl: `/uploads/${key}`,
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
      return `${this.publicUrlBase}/${key}`;
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

    // Local / fallback file deletion
    try {
      const cleanKey = key.replace(/^\/+/, '');
      const uploadDir = path.join(process.cwd(), 'uploads');
      const targetPath1 = path.join(process.cwd(), cleanKey);
      const targetPath2 = path.join(uploadDir, cleanKey.replace(/^uploads[\\/]/, ''));

      if (fs.existsSync(targetPath1) && fs.statSync(targetPath1).isFile()) {
        fs.unlinkSync(targetPath1);
        this.logger.log(`Deleted local file [${targetPath1}]`);
      } else if (fs.existsSync(targetPath2) && fs.statSync(targetPath2).isFile()) {
        fs.unlinkSync(targetPath2);
        this.logger.log(`Deleted local file [${targetPath2}]`);
      }
    } catch (err) {
      this.logger.warn(`Failed to delete local fallback file for key [${key}]:`, err);
    }
  }

  /**
   * Formats the public CDN URL for an asset key.
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrlBase}/${key}`;
  }
}
