import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { CourseVideoService } from './course-video.service';
import { CourseCoreService } from './course-core.service';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { CreateAttachmentDto } from '../dto/lesson-attachment.dto';
import { ReorderLessonsDto } from '../dto/reorder-modules.dto';

@Injectable()
export class CourseCurriculumService {
  private readonly logger = new Logger(CourseCurriculumService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly bunnyVideoService: BunnyVideoService,
    private readonly videoService: CourseVideoService,
    private readonly coreService: CourseCoreService,
  ) {}

  /**
   * Bulk reorders lessons within/across modules.
   * Supports moving a lesson to a different module via `moduleId` on each item.
   */
  async reorderLessons(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: ReorderLessonsDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }
    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to reorder lessons in this course');
    }

    const lessonIds = dto.lessonOrders.map((item) => item.lessonId);
    const lessons = await this.prisma.courseLesson.findMany({
      where: { id: { in: lessonIds } },
      include: { module: { select: { courseId: true, id: true } } },
    });
    if (lessons.length !== lessonIds.length) {
      throw new NotFoundException('One or more lessons were not found');
    }
    for (const lesson of lessons) {
      if (lesson.module.courseId !== courseId) {
        throw new ForbiddenException('You do not have permission to reorder these lessons');
      }
    }

    const targetModuleIds = [
      ...new Set(dto.lessonOrders.map((item) => item.moduleId).filter((id): id is string => Boolean(id))),
    ];
    if (targetModuleIds.length > 0) {
      const targetModules = await this.prisma.courseModule.findMany({
        where: { id: { in: targetModuleIds } },
        select: { id: true, courseId: true },
      });
      if (
        targetModules.length !== targetModuleIds.length ||
        targetModules.some((m) => m.courseId !== courseId)
      ) {
        throw new NotFoundException('One or more target modules were not found in this course');
      }
    }

    const result = await this.prisma.$transaction([
      ...dto.lessonOrders.map((item, i) =>
        this.prisma.courseLesson.update({
          where: { id: item.lessonId },
          data: {
            orderIndex: -(i + 1),
            ...(item.moduleId ? { moduleId: item.moduleId } : {}),
          },
        }),
      ),
      ...dto.lessonOrders.map((item) =>
        this.prisma.courseLesson.update({
          where: { id: item.lessonId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    ]);
    await this.coreService.clearCatalogCache();
    return result;
  }

  /**
   * Creates a lesson in a module with summary, DRM video, attachments, and quiz.
   */
  async createLesson(
    moduleId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateLessonDto,
  ) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });

    if (!module) {
      const b1 = this.videoService.extractBunnyVideoId(dto.bunnyVideoId);
      if (b1) await this.bunnyVideoService.deleteVideo(b1).catch(() => {});
      throw new NotFoundException(`Course module [${moduleId}] not found`);
    }

    if (!isSecretariat && module.course.teacherId !== teacherId) {
      const b1 = this.videoService.extractBunnyVideoId(dto.bunnyVideoId);
      if (b1) await this.bunnyVideoService.deleteVideo(b1).catch(() => {});
      throw new ForbiddenException('You do not have permission to manage this module');
    }

    let orderIndex = dto.orderIndex;
    if (!orderIndex) {
      const lessonCount = await this.prisma.courseLesson.count({ where: { moduleId } });
      orderIndex = lessonCount + 1;
    }

    let normalizedBunnyId = this.videoService.extractBunnyVideoId(dto.bunnyVideoId);
    const contentBunnyId = this.videoService.extractBunnyVideoId(dto.contentUrl);
    if (!normalizedBunnyId && contentBunnyId) normalizedBunnyId = contentBunnyId;
    let normalizedContentUrl = dto.contentUrl;
    if (normalizedContentUrl && this.videoService.isBunnyEmbedUrl(normalizedContentUrl)) {
      normalizedContentUrl = undefined as any;
    }

    const effectiveLessonType = dto.lessonType || 'VIDEO';
    const hasVideo = !!normalizedBunnyId || (!!normalizedContentUrl && !this.videoService.isBunnyEmbedUrl(normalizedContentUrl));
    if (effectiveLessonType === 'VIDEO' && !hasVideo) {
      throw new BadRequestException('لا يمكن إنشاء درس بدون فيديو. يرجى رفع أو تحديد فيديو للدرس.');
    }

    let effectiveDurationSeconds = dto.videoDurationSeconds;
    if ((!effectiveDurationSeconds || effectiveDurationSeconds <= 0) && normalizedBunnyId) {
      try {
        const bDetails = await this.bunnyVideoService.getVideoDetails(normalizedBunnyId);
        if (bDetails?.duration > 0) {
          effectiveDurationSeconds = Math.round(bDetails.duration);
        }
      } catch {}
    }

    const effectiveQuizId =
      dto.quizId !== undefined
        ? (dto.quizId || null)
        : (dto.lessonQuizId || null);
    const effectiveHomeworkId =
      dto.homeworkId !== undefined
        ? (dto.homeworkId || null)
        : (dto.lessonHomeworkId || null);

    try {
      const lesson = await this.prisma.courseLesson.create({
        data: {
          moduleId,
          title: dto.title,
          description: dto.description,
          summary: dto.summary || null,
          orderIndex,
          lessonType: effectiveLessonType,
          bunnyVideoId: normalizedBunnyId || dto.bunnyVideoId,
          contentUrl: normalizedContentUrl,
          videoDurationSeconds: effectiveDurationSeconds,
          isPreview: dto.isFreePreview !== undefined ? dto.isFreePreview : (dto.isPreview !== undefined ? dto.isPreview : false),
          lessonQuizId: effectiveQuizId,
          attachments: dto.attachments?.length
            ? {
                create: dto.attachments.map((att) => ({
                  title: att.title,
                  fileUrl: att.fileUrl,
                  fileKey: att.fileKey,
                  fileSize: att.fileSize,
                  fileType: att.fileType || 'application/pdf',
                })),
              }
            : undefined,
        },
        include: {
          attachments: true,
          lessonQuiz: { select: { id: true, title: true, type: true } },
          assessments: { select: { id: true, title: true, type: true, assessmentType: true } },
        },
      });

      if (effectiveQuizId) {
        try {
          const quizData: any = { lessonId: lesson.id, courseId: module.courseId };
          if (dto.allowMultipleAttempts !== undefined) quizData.allowMultipleAttempts = dto.allowMultipleAttempts;
          if (dto.isQuizOptional !== undefined) quizData.isOptional = dto.isQuizOptional;
          if (dto.isQuizPassRequired !== undefined) quizData.requirePassingScore = dto.isQuizPassRequired;
          if (dto.requirePassingScore !== undefined && quizData.requirePassingScore === undefined) {
            quizData.requirePassingScore = dto.requirePassingScore;
          }
          await this.prisma.assessment.update({
            where: { id: effectiveQuizId },
            data: quizData,
          });
        } catch (err) {
          this.logger.warn(`Failed to link quiz [${effectiveQuizId}] to lesson [${lesson.id}]:`, err);
        }
      }

      if (effectiveHomeworkId) {
        try {
          const hwData: any = { lessonId: lesson.id, courseId: module.courseId };
          if (dto.isHomeworkOptional !== undefined) hwData.isOptional = dto.isHomeworkOptional;
          if (dto.isHomeworkPassRequired !== undefined) hwData.requirePassingScore = dto.isHomeworkPassRequired;
          if (dto.allowHomeworkMultipleAttempts !== undefined) {
            hwData.allowHomeworkMultipleAttempts = dto.allowHomeworkMultipleAttempts;
          }
          await this.prisma.assessment.update({
            where: { id: effectiveHomeworkId },
            data: hwData,
          });
        } catch (err) {
          this.logger.warn(`Failed to link homework [${effectiveHomeworkId}] to lesson [${lesson.id}]:`, err);
        }
      }

      await this.coreService.clearCatalogCache();
      return lesson;
    } catch (error) {
      const bunnyIdsToCleanup = new Set<string>();
      const b1 = this.videoService.extractBunnyVideoId(dto.bunnyVideoId);
      const b2 = this.videoService.extractBunnyVideoId(dto.contentUrl);
      if (b1) bunnyIdsToCleanup.add(b1);
      if (b2) bunnyIdsToCleanup.add(b2);

      for (const videoId of bunnyIdsToCleanup) {
        await this.bunnyVideoService.deleteVideo(videoId).catch((delErr) => {
          this.logger.warn(`Failed to clean up Bunny video [${videoId}] after failed lesson creation:`, delErr);
        });
      }

      if (dto.attachments?.length) {
        for (const att of dto.attachments) {
          const key = att.fileKey || att.fileUrl;
          if (key) {
            await this.storageService.deleteObject(key).catch(() => {});
          }
        }
      }
      throw error;
    }
  }

  /**
   * Updates an existing lesson's metadata, rich summary, or linked quiz.
   */
  async updateLesson(
    lessonId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: UpdateLessonDto,
  ) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }
    if (!isSecretariat && lesson.module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to modify this lesson');
    }

    const isPreviewVal = dto.isFreePreview !== undefined ? dto.isFreePreview : dto.isPreview;

    const oldBunnyIds = new Set(
      [
        this.videoService.extractBunnyVideoId(lesson.bunnyVideoId),
        this.videoService.extractBunnyVideoId(lesson.videoAssetId),
        this.videoService.extractBunnyVideoId(lesson.contentUrl),
      ].filter(Boolean) as string[],
    );

    const newBunnyId = this.videoService.extractBunnyVideoId(dto.bunnyVideoId);
    const newContentBunnyId = this.videoService.extractBunnyVideoId(dto.contentUrl);

    let sanitizedContentUrl = dto.contentUrl;
    if (sanitizedContentUrl && this.videoService.isBunnyEmbedUrl(sanitizedContentUrl)) {
      sanitizedContentUrl = null as any;
    }
    let sanitizedBunnyId = dto.bunnyVideoId;
    if ((!sanitizedBunnyId || !sanitizedBunnyId.trim()) && newContentBunnyId) {
      sanitizedBunnyId = newContentBunnyId;
    }

    const effectiveLessonType = dto.lessonType || lesson.lessonType || 'VIDEO';
    if (effectiveLessonType === 'VIDEO') {
      const willHaveBunny = sanitizedBunnyId !== undefined ? !!sanitizedBunnyId : !!lesson.bunnyVideoId;
      const willHaveContent = sanitizedContentUrl !== undefined ? !!sanitizedContentUrl : !!lesson.contentUrl;
      if (!willHaveBunny && !willHaveContent) {
        throw new BadRequestException('لا يمكن إزالة الفيديو من الدرس. يجب أن يحتوي الدرس على فيديو.');
      }
    }

    let effectiveDurationSeconds = dto.videoDurationSeconds;
    const targetBunnyId = sanitizedBunnyId || (lesson.bunnyVideoId && !dto.bunnyVideoId ? lesson.bunnyVideoId : undefined);
    if ((!effectiveDurationSeconds || effectiveDurationSeconds <= 0) && targetBunnyId && (!lesson.videoDurationSeconds || sanitizedBunnyId)) {
      try {
        const bDetails = await this.bunnyVideoService.getVideoDetails(targetBunnyId);
        if (bDetails?.duration > 0) {
          effectiveDurationSeconds = Math.round(bDetails.duration);
        }
      } catch {}
    }

    const effectiveQuizId =
      dto.quizId !== undefined
        ? (dto.quizId || null)
        : (dto.lessonQuizId !== undefined ? (dto.lessonQuizId || null) : undefined);
    const effectiveHomeworkId =
      dto.homeworkId !== undefined
        ? (dto.homeworkId || null)
        : (dto.lessonHomeworkId !== undefined ? (dto.lessonHomeworkId || null) : undefined);

    let updatedLesson;
    try {
      updatedLesson = await this.prisma.courseLesson.update({
        where: { id: lessonId },
        data: {
          ...(dto.title ? { title: dto.title } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
          ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
          ...(dto.lessonType ? { lessonType: dto.lessonType } : {}),
          ...(sanitizedBunnyId !== undefined ? { bunnyVideoId: sanitizedBunnyId } : {}),
          ...(sanitizedContentUrl !== undefined ? { contentUrl: sanitizedContentUrl } : {}),
          ...(effectiveDurationSeconds !== undefined ? { videoDurationSeconds: effectiveDurationSeconds } : {}),
          ...(isPreviewVal !== undefined ? { isPreview: isPreviewVal } : {}),
          ...(effectiveQuizId !== undefined ? { lessonQuizId: effectiveQuizId } : {}),
          ...(dto.attachments?.length
            ? {
                attachments: {
                  create: dto.attachments.map((att) => ({
                    title: att.title,
                    fileUrl: att.fileUrl,
                    fileKey: att.fileKey,
                    fileSize: att.fileSize,
                    fileType: att.fileType || 'application/pdf',
                  })),
                },
              }
            : {}),
        },
        include: {
          attachments: true,
          lessonQuiz: { select: { id: true, title: true, type: true } },
          assessments: { select: { id: true, title: true, type: true, assessmentType: true } },
        },
      });

      if (effectiveQuizId !== undefined) {
        if (effectiveQuizId) {
          try {
            const quizData: any = { lessonId, courseId: lesson.module.courseId };
            if (dto.allowMultipleAttempts !== undefined) quizData.allowMultipleAttempts = dto.allowMultipleAttempts;
            if (dto.isQuizOptional !== undefined) quizData.isOptional = dto.isQuizOptional;
            if (dto.isQuizPassRequired !== undefined) quizData.requirePassingScore = dto.isQuizPassRequired;
            if (dto.requirePassingScore !== undefined && quizData.requirePassingScore === undefined) {
              quizData.requirePassingScore = dto.requirePassingScore;
            }
            await this.prisma.assessment.update({
              where: { id: effectiveQuizId },
              data: quizData,
            });
            if (lesson.lessonQuizId && lesson.lessonQuizId !== effectiveQuizId) {
              await this.prisma.assessment.updateMany({
                where: { id: lesson.lessonQuizId, lessonId },
                data: { lessonId: null },
              });
            }
          } catch (err) {
            this.logger.warn(`Failed to update quiz link [${effectiveQuizId}] for lesson [${lessonId}]:`, err);
          }
        } else {
          if (lesson.lessonQuizId) {
            await this.prisma.assessment.updateMany({
              where: { id: lesson.lessonQuizId, lessonId },
              data: { lessonId: null },
            }).catch(() => {});
          }
        }
      }

      if (effectiveHomeworkId !== undefined) {
        if (effectiveHomeworkId) {
          try {
            const hwData: any = { lessonId, courseId: lesson.module.courseId };
            if (dto.isHomeworkOptional !== undefined) hwData.isOptional = dto.isHomeworkOptional;
            if (dto.isHomeworkPassRequired !== undefined) hwData.requirePassingScore = dto.isHomeworkPassRequired;
            if (dto.allowHomeworkMultipleAttempts !== undefined) {
              hwData.allowHomeworkMultipleAttempts = dto.allowHomeworkMultipleAttempts;
            }
            await this.prisma.assessment.update({
              where: { id: effectiveHomeworkId },
              data: hwData,
            });
            await this.prisma.assessment.updateMany({
              where: {
                lessonId,
                id: { not: effectiveHomeworkId },
                OR: [
                  { type: 'ASSIGNMENT' },
                  { assessmentType: 'HOMEWORK' },
                ],
              },
              data: { lessonId: null },
            });
          } catch (err) {
            this.logger.warn(`Failed to update homework link [${effectiveHomeworkId}] for lesson [${lessonId}]:`, err);
          }
        } else {
          await this.prisma.assessment.updateMany({
            where: {
              lessonId,
              OR: [
                { type: 'ASSIGNMENT' },
                { assessmentType: 'HOMEWORK' },
              ],
            },
            data: { lessonId: null },
          }).catch(() => {});
        }
      }
    } catch (error) {
      const newIdsToClean = [newBunnyId, newContentBunnyId].filter(
        (id): id is string => Boolean(id && !oldBunnyIds.has(id)),
      );
      for (const videoId of newIdsToClean) {
        await this.bunnyVideoService.deleteVideo(videoId).catch((delErr) => {
          this.logger.warn(`Failed to clean up newly uploaded Bunny video [${videoId}] after failed lesson update:`, delErr);
        });
      }
      throw error;
    }

    if (dto.bunnyVideoId !== undefined || dto.contentUrl !== undefined) {
      for (const oldId of oldBunnyIds) {
        if (oldId !== newBunnyId && oldId !== newContentBunnyId) {
          await this.bunnyVideoService.deleteVideo(oldId).catch((err) => {
            this.logger.warn(`Failed to delete replaced Bunny video [${oldId}]:`, err);
          });
        }
      }
    }

    await this.coreService.clearCatalogCache();
    return updatedLesson;
  }

  /**
   * Deletes a lesson and purges all related Bunny Stream videos and storage attachments.
   */
  async deleteLesson(lessonId: string, teacherId: string, isSecretariat: boolean) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }
    if (!isSecretariat && lesson.module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to delete this lesson');
    }

    const bunnyIdsToDelete = new Set<string>();
    const b1 = this.videoService.extractBunnyVideoId(lesson.bunnyVideoId);
    const b2 = this.videoService.extractBunnyVideoId(lesson.videoAssetId);
    const b3 = this.videoService.extractBunnyVideoId(lesson.contentUrl);
    if (b1) bunnyIdsToDelete.add(b1);
    if (b2) bunnyIdsToDelete.add(b2);
    if (b3) bunnyIdsToDelete.add(b3);

    for (const videoId of bunnyIdsToDelete) {
      await this.bunnyVideoService.deleteVideo(videoId).catch((err) => {
        this.logger.warn(`Failed to delete Bunny Stream video [${videoId}] for lesson [${lessonId}]:`, err);
      });
    }

    const attachments = await this.prisma.lessonAttachment.findMany({
      where: { lessonId },
      select: { fileKey: true, fileUrl: true },
    });
    for (const att of attachments) {
      const key = att.fileKey || att.fileUrl;
      if (key) {
        await this.storageService.deleteObject(key).catch(() => {});
      }
    }

    const deleted = await this.prisma.courseLesson.delete({ where: { id: lessonId } });
    await this.coreService.clearCatalogCache();
    return deleted;
  }

  /**
   * Adds a downloadable PDF / summary attachment to a lesson.
   */
  async addLessonAttachment(
    lessonId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateAttachmentDto,
  ) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }
    if (!isSecretariat && lesson.module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage attachments for this lesson');
    }

    const created = await this.prisma.lessonAttachment.create({
      data: {
        lessonId,
        title: dto.title,
        fileUrl: dto.fileUrl,
        fileKey: dto.fileKey,
        fileSize: dto.fileSize,
        fileType: dto.fileType || 'application/pdf',
      },
    });
    await this.coreService.clearCatalogCache();
    return created;
  }

  /**
   * Deletes a lesson attachment.
   */
  async deleteLessonAttachment(
    attachmentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    const attachment = await this.prisma.lessonAttachment.findUnique({
      where: { id: attachmentId },
      include: { lesson: { include: { module: { include: { course: true } } } } },
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment [${attachmentId}] not found`);
    }
    if (!isSecretariat && attachment.lesson.module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to delete this attachment');
    }
    const deleted = await this.prisma.lessonAttachment.delete({ where: { id: attachmentId } });
    await this.coreService.clearCatalogCache();
    return deleted;
  }
}
