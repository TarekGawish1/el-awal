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
   * Registers educational asset metadata in the library attached to a teacher, gradeLevel, group, session, or lesson.
   */
  async createContent(teacherId: string, dto: CreateContentDto) {
    let academicYear = dto.academicYear;
    let academicTerm = dto.academicTerm;
    let gradeLevel = dto.gradeLevel;

    if (dto.groupId) {
      const group = await this.prisma.academicGroup.findUnique({ where: { id: dto.groupId } });
      if (!group) {
        throw new NotFoundException(`Academic group [${dto.groupId}] not found`);
      }
      if (group.teacherId !== teacherId) {
        throw new ForbiddenException('You do not own this academic group');
      }
      if (!gradeLevel) gradeLevel = group.gradeLevel;
      if (!academicYear) academicYear = group.academicYear;
      if (!academicTerm) academicTerm = group.academicTerm;
    }

    if (!academicYear || !academicTerm) {
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { id: teacherId },
        select: { activeAcademicYear: true, activeAcademicTerm: true },
      });
      if (!academicYear) academicYear = teacher?.activeAcademicYear || '2025-2026';
      if (!academicTerm) academicTerm = teacher?.activeAcademicTerm || 'FIRST_TERM';
    }

    if (dto.sessionId) {
      const session = await this.prisma.lessonSession.findUnique({
        where: { id: dto.sessionId },
        include: { group: true },
      });
      if (!session) {
        throw new NotFoundException(`Lesson session [${dto.sessionId}] not found`);
      }
      if (session.group.teacherId !== teacherId) {
        throw new ForbiddenException('You do not own this session');
      }
      if (!dto.sessionTopic && session.topic) {
        dto.sessionTopic = session.topic;
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
        gradeLevel: gradeLevel || null,
        academicYear,
        academicTerm,
        sessionTopic: dto.sessionTopic || null,
        sessionId: dto.sessionId || null,
        teacherId,
        groupId: dto.groupId || null,
        lessonId: dto.lessonId || null,
      },
    });
  }

  /**
   * Directly uploads buffer to Cloudflare R2 and creates the EducationalContent record in one shot.
   */
  async uploadAndCreateContent(
    teacherId: string,
    file: Express.Multer.File,
    meta: {
      title: string;
      description?: string;
      contentType: ContentType;
      gradeLevel?: string;
      academicYear?: string;
      academicTerm?: string;
      groupId?: string;
      sessionId?: string;
      sessionTopic?: string;
      lessonId?: string;
    },
  ) {
    const fileExt = file.originalname.split('.').pop() || 'bin';
    const uniqueKey = `courses/${teacherId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const contentType = file.mimetype || 'application/octet-stream';

    const uploadRes = await this.storageService.uploadBuffer(uniqueKey, file.buffer, contentType);

    return this.createContent(teacherId, {
      title: meta.title,
      description: meta.description,
      contentType: meta.contentType,
      fileKey: uploadRes.fileKey,
      fileUrl: uploadRes.publicUrl,
      fileSize: file.size,
      mimeType: contentType,
      gradeLevel: meta.gradeLevel,
      academicYear: meta.academicYear,
      academicTerm: meta.academicTerm,
      groupId: meta.groupId,
      sessionId: meta.sessionId,
      sessionTopic: meta.sessionTopic,
      lessonId: meta.lessonId,
    });
  }

  /**
   * Lists instructor's uploaded materials with academic period, grade level, group, session, or content type filtering.
   */
  async listTeacherContent(
    teacherId: string,
    params?: {
      groupId?: string;
      gradeLevel?: string;
      academicYear?: string;
      academicTerm?: string;
      sessionId?: string;
      sessionTopic?: string;
      lessonId?: string;
      contentType?: ContentType;
      includeGradeScope?: boolean;
    },
  ) {
    const {
      groupId,
      gradeLevel,
      academicYear,
      academicTerm,
      sessionId,
      sessionTopic,
      lessonId,
      contentType,
      includeGradeScope,
    } = params || {};

    const where: any = { teacherId };

    if (contentType) {
      where.contentType = contentType;
    }
    if (lessonId) {
      where.lessonId = lessonId;
    }
    if (sessionId) {
      where.sessionId = sessionId;
    }
    if (sessionTopic) {
      where.sessionTopic = sessionTopic;
    }

    if (groupId) {
      if (includeGradeScope) {
        const group = await this.prisma.academicGroup.findUnique({
          where: { id: groupId },
          select: { id: true, gradeLevel: true, academicYear: true, academicTerm: true },
        });

        if (group) {
          where.OR = [
            { groupId: group.id },
            {
              groupId: null,
              gradeLevel: group.gradeLevel,
              academicYear: group.academicYear,
              academicTerm: group.academicTerm,
            },
          ];
        } else {
          where.groupId = groupId;
        }
      } else {
        where.groupId = groupId;
      }
    } else {
      if (gradeLevel) {
        where.gradeLevel = gradeLevel;
      }
      if (academicYear) {
        where.academicYear = academicYear;
      }
      if (academicTerm) {
        where.academicTerm = academicTerm;
      }
    }

    const contents = await this.prisma.educationalContent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        group: { select: { id: true, name: true, gradeLevel: true, academicYear: true, academicTerm: true } },
        session: { select: { id: true, topic: true, sessionDate: true, startTime: true } },
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
