import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async createCertificate(data: any, file?: Express.Multer.File) {
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
      orderBy: { createdAt: 'desc' },
      take: 100, // Fetch up to 100 recent certificates
    });
  }
}
