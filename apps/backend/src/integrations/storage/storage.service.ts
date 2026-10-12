import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
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
    this.publicUrlBase = publicUrlBase.replace(/\/+$/, '');

    this.isConfigured = Boolean(accountId && accessKeyId && secretAccessKey && bucketName && publicUrlBase);

    if (this.isConfigured) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
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
      const cleanKey = key.replace(/^\/+/, '');
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client!, command, {
        expiresIn: expiresInSeconds,
      });

      return {
        uploadUrl,
        fileKey: cleanKey,
        publicUrl: `${this.publicUrlBase}/${cleanKey}`,
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
      const cleanKey = key.replace(/^\/+/, '');
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client!.send(command);
      return {
        fileKey: cleanKey,
        publicUrl: `${this.publicUrlBase}/${cleanKey}`,
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
   * Deletes an object from Cloudflare R2 by key or full URL.
   */
  async deleteObject(key: string): Promise<void> {
    if (!key) return;
    if (key.startsWith('data:')) return;

    let objectKey = key.trim();
    if (/^https?:\/\//i.test(objectKey)) {
      try {
        const parsed = new URL(objectKey);
        objectKey = parsed.pathname.replace(/^\/+/, '');
      } catch {
        // keep as-is
      }
    } else {
      objectKey = objectKey.replace(/^\/+/, '');
    }

    if (!objectKey) return;

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
   * Lists all objects in the Cloudflare R2 bucket with pagination support.
   */
  async listObjects(prefix = ''): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    this.assertConfigured();
    const results: Array<{ key: string; size: number; lastModified: Date }> = [];
    let continuationToken: string | undefined = undefined;

    try {
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix || undefined,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        });

        const response = await this.s3Client!.send(command);
        if (response.Contents) {
          for (const item of response.Contents) {
            if (item.Key) {
              results.push({
                key: item.Key,
                size: item.Size || 0,
                lastModified: item.LastModified || new Date(),
              });
            }
          }
        }
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return results;
    } catch (error) {
      this.logger.error(`Failed to list objects in R2 bucket [${this.bucketName}]:`, error);
      throw new InternalServerErrorException('فشل سرد الملفات من التخزين السحابي (R2).');
    }
  }

  /**
   * Deletes multiple objects from Cloudflare R2 in batches of up to 1000.
   */
  async deleteObjects(keys: string[]): Promise<number> {
    if (!keys || keys.length === 0) return 0;
    this.assertConfigured();

    let deletedCount = 0;
    const batchSize = 1000;

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize).map((k) => {
        let objectKey = k.trim();
        if (/^https?:\/\//i.test(objectKey)) {
          try {
            const parsed = new URL(objectKey);
            objectKey = parsed.pathname.replace(/^\/+/, '');
          } catch {}
        } else {
          objectKey = objectKey.replace(/^\/+/, '');
        }
        return objectKey;
      }).filter(Boolean);

      if (batch.length === 0) continue;

      try {
        await this.s3Client!.send(
          new DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: {
              Objects: batch.map((Key) => ({ Key })),
              Quiet: true,
            },
          }),
        );
        deletedCount += batch.length;
        this.logger.log(`Deleted batch of ${batch.length} objects from R2 bucket [${this.bucketName}]`);
      } catch (error) {
        this.logger.error(`Failed to batch-delete ${batch.length} objects from R2:`, error);
      }
    }

    return deletedCount;
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
