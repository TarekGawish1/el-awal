import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
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
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicUrlBase: string;
  private readonly accountId: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountId = String(this.configService.get<string>('R2_ACCOUNT_ID', '') || '').trim();
    const accessKeyId = String(this.configService.get<string>('R2_ACCESS_KEY_ID', '') || '').trim();
    const secretAccessKey = String(this.configService.get<string>('R2_SECRET_ACCESS_KEY', '') || '').trim();
    const bucketName = String(this.configService.get<string>('R2_BUCKET_NAME', '') || '').trim();
    const publicUrlBase = String(this.configService.get<string>('R2_PUBLIC_URL', '') || '').trim();
    this.accountId = accountId;
    this.bucketName = bucketName || 'el-awal-assets';
    this.publicUrlBase = publicUrlBase;

    this.isConfigured = Boolean(accountId && accessKeyId && secretAccessKey && bucketName && publicUrlBase);

    if (this.isConfigured) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log(`✅ Cloudflare R2 configured (bucket=${this.bucketName} public=${this.publicUrlBase})`);
    } else {
      this.logger.error(
        '❌ Cloudflare R2 is NOT configured. Image uploads are R2-only and will fail until ' +
          'R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PUBLIC_URL are set.',
      );
    }
  }

  /**
   * Verifies R2 credentials on boot: HeadBucket proves account + keys + bucket are correct.
   * Fails fast in production so misconfiguration is caught at deploy, not at first upload.
   */
  async onModuleInit(): Promise<void> {
    if (!this.isConfigured || !this.s3Client) {
      const nodeEnv = String(this.configService.get<string>('NODE_ENV', '') || '').trim();
      if (nodeEnv === 'production') {
        throw new Error(
          'R2 storage is required in production but R2_* env vars are missing. ' +
            'Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.',
        );
      }
      return;
    }
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`✅ R2 credentials verified (bucket=${this.bucketName} reachable)`);
    } catch (error: any) {
      const msg = error?.message || String(error);
      this.logger.error(
        `❌ R2 credential verification failed (bucket=${this.bucketName}): ${msg}. ` +
          `Check R2_ACCOUNT_ID, keys, bucket name, and that the API token has Object Read & Write on this bucket.`,
      );
      const nodeEnv = String(this.configService.get<string>('NODE_ENV', '') || '').trim();
      if (nodeEnv === 'production') {
        throw new Error(`R2 credential verification failed for bucket [${this.bucketName}]: ${msg}`);
      }
    }
  }

  isR2Configured(): boolean {
    return this.isConfigured && !!this.s3Client;
  }

  private assertConfigured(): void {
    if (!this.isConfigured || !this.s3Client) {
      throw new InternalServerErrorException(
        'التخزين السحابي غير مُعد على السيرفر (R2). يرجى ضبط إعدادات Cloudflare R2.',
      );
    }
  }

  /**
   * Generates a presigned URL for direct browser -> Cloudflare R2 upload.
   * R2-only: throws when storage is not configured instead of returning a
   * misleading local fallback URL.
   */
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 3600,
  ): Promise<PresignedUploadResult> {
    this.assertConfigured();

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client!, command, {
        expiresIn: expiresInSeconds,
      });

      return {
        uploadUrl,
        fileKey: key,
        publicUrl: `${this.publicUrlBase}/${key}`,
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned upload URL for key [${key}]:`, error);
      throw new InternalServerErrorException('تعذر تجهيز رابط الرفع السحابي (R2). حاول مرة أخرى.');
    }
  }

  /**
   * Uploads a file buffer directly to Cloudflare R2. No local-disk fallback:
   * local disks are ephemeral (Heroku) and must never store course images.
   */
  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<{ fileKey: string; publicUrl: string }> {
    this.assertConfigured();
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client!.send(command);
      return {
        fileKey: key,
        publicUrl: `${this.publicUrlBase}/${key}`,
      };
    } catch (error) {
      this.logger.error(`Failed to upload buffer for key [${key}] to R2:`, error);
      throw new InternalServerErrorException('فشل رفع الملف إلى التخزين السحابي (R2). حاول مرة أخرى.');
    }
  }

  /**
   * Generates a time-bound presigned URL to download R2 files.
   */
  async generatePresignedDownloadUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    // Pass through already-public URLs (R2 custom domain, legacy local paths).
    if (key.startsWith('data:') || /^https?:\/\//i.test(key)) {
      return key;
    }
    this.assertConfigured();

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client!, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error) {
      this.logger.error(`Failed to generate presigned download URL for key [${key}]:`, error);
      throw new InternalServerErrorException('تعذر تجهيز رابط التحميل السحابي (R2).');
    }
  }

  /**
   * Deletes an object from Cloudflare R2. No local-disk handling.
   */
  async deleteObject(key: string): Promise<void> {
    if (!key) return;
    if (key.startsWith('data:')) return;
    // Legacy local paths or full local URLs have nothing to delete in R2.
    if (key.startsWith('/uploads/') || key.includes('/uploads/')) {
      this.logger.warn(`Skipping R2 delete for legacy local key: ${key} (re-upload to R2)`);
      return;
    }
    let objectKey = key;
    try {
      if (/^https?:\/\//i.test(key)) {
        const parsed = new URL(key);
        objectKey = parsed.pathname.replace(/^\/+/, '');
      }
    } catch {
      // keep as-is
    }

    this.assertConfigured();
    try {
      await this.s3Client!.send(
        new DeleteObjectCommand({ Bucket: this.bucketName, Key: objectKey }),
      );
      this.logger.log(`Deleted object [${objectKey}] from R2 bucket [${this.bucketName}]`);
    } catch (error) {
      this.logger.error(`Failed to delete object [${objectKey}] from R2:`, error);
      throw new InternalServerErrorException('فشل حذف الملف من التخزين السحابي (R2).');
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
