import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService } from '../../../integrations/storage/storage.service';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { PresignedUploadDto } from '../dto/presigned-upload.dto';

@Injectable()
export class ContentStorageService {
  private readonly logger = new Logger(ContentStorageService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly bunnyVideoService: BunnyVideoService,
  ) {}

  /**
   * Generates a presigned Cloudflare R2 / S3 direct upload URL with secure isolated file keys.
   */
  async generatePresignedUpload(dto: PresignedUploadDto) {
    const folder = dto.folder || 'courses';
    const sanitizedFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `uploads/${folder}/${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizedFileName}`;

    const rawContentType = dto.contentType || dto.fileType || 'application/octet-stream';
    if (rawContentType.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(dto.fileName)) {
      throw new BadRequestException('يجب رفع مقاطع الفيديو عبر Bunny Stream فقط');
    }

    const presigned = await this.storageService.generatePresignedUploadUrl(
      fileKey,
      rawContentType,
      900, // 15 minutes
    );

    return {
      uploadUrl: presigned.uploadUrl,
      fileKey: presigned.fileKey,
      publicUrl: presigned.publicUrl,
      expiresInSeconds: 900,
    };
  }

  /**
   * Generates direct client-to-Bunny Stream upload credentials for video recordings.
   * All videos must reside on Bunny Stream exclusively.
   */
  async generatePresignedVideoUpload(title: string) {
    return await this.bunnyVideoService.generateDirectUploadCredentials(title);
  }

  /**
   * Uploads a raw binary file (image, cover, pdf, etc.) directly with automatic R2 storage / fallback.
   */
  async uploadRawFile(file: Express.Multer.File, folder = 'courses') {
    const sanitizedFileName = (file.originalname || 'file.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueKey = `uploads/${folder}/${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizedFileName}`;
    const mimeType = file.mimetype || 'application/octet-stream';

    const uploadRes = await this.storageService.uploadBuffer(uniqueKey, file.buffer, mimeType);

    return {
      fileUrl: uploadRes.publicUrl,
      fileKey: uploadRes.fileKey,
      fileSize: file.size,
      fileType: mimeType,
      fileName: file.originalname,
    };
  }

  /**
   * Intelligently routes file asset uploads:
   * - Video files -> Bunny Stream DRM Video Cloud
   * - Documents, PDFs, Images, Audios -> Cloudflare R2
   */
  async uploadFileAsset(
    teacherId: string,
    title: string,
    file: Express.Multer.File,
    isVideoRequested = false,
  ) {
    const isVideo =
      isVideoRequested ||
      file.mimetype?.startsWith('video/') ||
      /\.(mp4|webm|mov|mkv)$/i.test(file.originalname);

    if (isVideo) {
      this.logger.log(`🎥 Uploading lecture recording [${title}] directly to Bunny Stream Video Cloud...`);
      const bunnyRes = await this.bunnyVideoService.uploadVideo(title, file.buffer);
      this.logger.log(`✅ Bunny Stream video created successfully: [${bunnyRes.videoId}] -> ${bunnyRes.embedUrl}`);
      return {
        fileKey: `bunny:${bunnyRes.videoId}`,
        fileUrl: bunnyRes.embedUrl,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype || 'video/mp4',
        isVideo: true,
      };
    }

    const fileExt = file.originalname.split('.').pop() || 'bin';
    const uniqueKey = `courses/${teacherId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const mimeType = file.mimetype || 'application/octet-stream';

    const uploadRes = await this.storageService.uploadBuffer(uniqueKey, file.buffer, mimeType);
    return {
      fileKey: uploadRes.fileKey,
      fileUrl: uploadRes.publicUrl,
      fileSize: BigInt(file.size),
      mimeType,
      isVideo: false,
    };
  }

  /**
   * Deletes an unlinked asset directly from Cloudflare R2, Bunny Stream, or local storage.
   */
  async deleteFileFromStorage(params: { fileKey?: string; fileUrl?: string }) {
    let key = params.fileKey;

    if (!key && params.fileUrl) {
      const url = params.fileUrl;
      if (url.includes('/uploads/')) {
        key = url.substring(url.indexOf('/uploads/') + 1);
      } else if (url.includes('bunny:') || url.includes('b-cdn.net') || url.includes('mediadelivery.net')) {
        const match = url.match(/([a-f0-9\-]{36})/i);
        if (match) key = `bunny:${match[1]}`;
      } else {
        try {
          const parsed = new URL(url);
          key = parsed.pathname.replace(/^\/+/, '');
        } catch {
          key = url.replace(/^\/+/, '');
        }
      }
    }

    if (!key) {
      return { success: false, message: 'No file key or URL provided' };
    }

    if (key.startsWith('bunny:')) {
      const videoId = key.replace('bunny:', '');
      await this.bunnyVideoService.deleteVideo(videoId).catch((err) => {
        this.logger.warn(`Failed to delete Bunny video [${videoId}]`, err);
      });
    } else {
      await this.storageService.deleteObject(key).catch((err) => {
        this.logger.warn(`Failed to delete object [${key}] from storage`, err);
      });
    }

    return { success: true, fileKey: key };
  }
}
