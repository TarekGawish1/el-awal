import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { CreateCertificateDto } from '../dto/create-certificate.dto';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async createCertificate(data: CreateCertificateDto, file?: Express.Multer.File) {
    let fileUrl = data.fileUrl || null;
    
    if (file) {
      const extension = file.originalname.split('.').pop() || 'png';
      const fileKey = `certificates/${Date.now()}-${Math.round(Math.random() * 10000)}.${extension}`;
      
      try {
        const result = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);
        fileUrl = result.publicUrl;
      } catch (error) {
        this.logger.error('Failed to upload certificate image', error);
      }
    }

    return this.prisma.certificate.create({
      data: {
        studentName: data.studentName,
        gender: data.gender || 'MALE',
        subject: data.subject,
        score: data.score,
        issueDate: data.issueDate,
        year: data.year,
        stage: data.stage,
        grade: data.grade,
        teacherName: data.teacherName,
        fileUrl: fileUrl,
      },
    });
  }

  async getPublicCertificates() {
    return this.prisma.certificate.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 100, // Fetch up to 100 recent certificates
    });
  }

  async setVisibility(id: string, isPublic: boolean) {
    const existing = await this.prisma.certificate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('الشهادة غير موجودة أو تم حذفها مسبقاً');
    }

    return this.prisma.certificate.update({
      where: { id },
      data: { isPublic },
    });
  }

  async deleteCertificate(id: string) {
    const existing = await this.prisma.certificate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('الشهادة غير موجودة أو تم حذفها مسبقاً');
    }

    // Delete the image file from Cloudflare R2 (or local fallback) first.
    // DB deletion must still proceed even if storage deletion fails.
    const fileKey = this.extractFileKey(existing.fileUrl);
    if (fileKey) {
      try {
        await this.storageService.deleteObject(fileKey);
      } catch (error) {
        this.logger.error(`Failed to delete certificate file [${fileKey}] from storage`, error);
      }
    }

    try {
      const deleted = await this.prisma.certificate.delete({
        where: { id },
      });
      return { success: true, message: 'تم حذف الشهادة بنجاح', data: deleted };
    } catch (error) {
      this.logger.error(`Failed to delete certificate ${id}`, error);
      throw error;
    }
  }

  /**
   * Extracts the R2 object key from a stored fileUrl.
   * Returns null for base64 data URLs or unresolvable URLs (nothing to delete in R2).
   */
  private extractFileKey(fileUrl: string | null | undefined): string | null {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('data:')) return null;

    try {
      // Case 1: full URL like https://assets.elawal.com/certificates/123.png
      if (fileUrl.includes('certificates/')) {
        const idx = fileUrl.indexOf('certificates/');
        return fileUrl.substring(idx);
      }
      // Case 2: local fallback like /uploads/certificates/123.png
      if (fileUrl.startsWith('/uploads/')) {
        return fileUrl.replace(/^\/+/, '');
      }
      // Case 3: relative uploads path
      if (fileUrl.startsWith('uploads/')) {
        return fileUrl;
      }
      // Case 4: try URL parsing and use pathname
      if (fileUrl.startsWith('http')) {
        const parsed = new URL(fileUrl);
        const cleanPath = parsed.pathname.replace(/^\/+/, '');
        return cleanPath || null;
      }
    } catch (error) {
      this.logger.warn(`Could not extract file key from fileUrl [${fileUrl}]: ${error}`);
    }
    return null;
  }
}
