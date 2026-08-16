import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrlBase: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID', '');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID', '');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY', '');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'el-awal-assets');
    this.publicUrlBase = this.configService.get<string>('R2_PUBLIC_URL', 'https://assets.elawal.com');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Generates a presigned URL allowing client direct upload to Cloudflare R2.
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600,
  ): Promise<PresignedUploadResult> {
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
      throw error;
    }
  }

  /**
   * Generates a temporary time-bound presigned URL to download private files.
   */
  async generatePresignedDownloadUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
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
      throw error;
    }
  }

  /**
   * Deletes an object from Cloudflare R2 bucket.
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted object [${key}] from R2 bucket [${this.bucketName}]`);
    } catch (error) {
      this.logger.error(`Failed to delete object [${key}] from R2:`, error);
      throw error;
    }
  }

  /**
   * Formats the public CDN URL for an asset key.
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrlBase}/${key}`;
  }
}
