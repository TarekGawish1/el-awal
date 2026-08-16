import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { ContentType } from '@prisma/client';

export interface CreateContentDto {
  title: string;
  description?: string;
  contentType: ContentType;
  fileKey: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  groupId?: string;
  lessonId?: string;
  teacherId: string;
}

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async createContent(dto: CreateContentDto) {
    return this.prisma.educationalContent.create({
      data: {
        title: dto.title,
        description: dto.description,
        contentType: dto.contentType,
        fileKey: dto.fileKey,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
        mimeType: dto.mimeType,
        groupId: dto.groupId,
        lessonId: dto.lessonId,
        teacherId: dto.teacherId,
      },
    });
  }

  async getPresignedUpload(fileName: string, mimeType: string) {
    const key = `uploads/${Date.now()}-${fileName}`;
    return this.storageService.generatePresignedUploadUrl(key, mimeType);
  }
}
