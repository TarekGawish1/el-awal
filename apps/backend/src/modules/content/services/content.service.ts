import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { PresignedUploadDto } from '../dto/presigned-upload.dto';
import { CreateContentDto } from '../dto/create-content.dto';
import { ContentType } from '@prisma/client';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Generates a presigned Cloudflare R2 / S3 direct upload URL with secure isolated file keys.
   */
  async generatePresignedUpload(dto: PresignedUploadDto) {
    const folder = dto.folder || 'courses';
    const sanitizedFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `uploads/${folder}/${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizedFileName}`;

    const presigned = await this.storageService.generatePresignedUploadUrl(
      fileKey,
      dto.contentType,
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
   * Registers educational asset metadata in the library attached to a teacher, group, or lesson.
   */
  async createContent(teacherId: string, dto: CreateContentDto) {
    if (dto.groupId) {
      const group = await this.prisma.academicGroup.findUnique({ where: { id: dto.groupId } });
      if (!group) {
        throw new NotFoundException(`Academic group [${dto.groupId}] not found`);
      }
      if (group.teacherId !== teacherId) {
        throw new ForbiddenException('You do not own this academic group');
      }
    }

    if (dto.lessonId) {
      const lesson = await this.prisma.courseLesson.findUnique({
        where: { id: dto.lessonId },
        include: { module: { include: { course: true } } },
      });
      if (!lesson) {
        throw new NotFoundException(`Course lesson [${dto.lessonId}] not found`);
      }
      if (lesson.module.course.teacherId !== teacherId) {
        throw new ForbiddenException('You do not own the course containing this lesson');
      }
    }

    return this.prisma.educationalContent.create({
      data: {
        title: dto.title,
        description: dto.description,
        contentType: dto.contentType,
        fileKey: dto.fileKey,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
        mimeType: dto.mimeType,
        teacherId,
        groupId: dto.groupId,
        lessonId: dto.lessonId,
      },
    });
  }

  /**
   * Lists instructor's uploaded materials with optional group or content type filtering.
   */
  async listTeacherContent(
    teacherId: string,
    groupId?: string,
    lessonId?: string,
    contentType?: ContentType,
  ) {
    const contents = await this.prisma.educationalContent.findMany({
      where: {
        teacherId,
        ...(groupId ? { groupId } : {}),
        ...(lessonId ? { lessonId } : {}),
        ...(contentType ? { contentType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        group: { select: { id: true, name: true } },
        lesson: { select: { id: true, title: true } },
        _count: { select: { progresses: true } },
      },
    });

    return contents.map((c) => ({
      ...c,
      fileSize: c.fileSize ? Number(c.fileSize) : null,
    }));
  }

  /**
   * Deletes a content record and its associated file from storage.
   */
  async deleteContent(id: string, teacherId: string) {
    const content = await this.prisma.educationalContent.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException(`Content [${id}] not found`);
    }

    if (content.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this content');
    }

    // Delete from R2 storage
    if (content.fileKey) {
      await this.storageService.deleteObject(content.fileKey).catch((err) => {
        this.logger.warn(`Failed to delete object [${content.fileKey}] from R2 during content deletion`, err);
      });
    }

    // Delete from DB
    await this.prisma.educationalContent.delete({
      where: { id },
    });

    return { success: true };
  }
}
