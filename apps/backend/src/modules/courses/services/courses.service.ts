import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  CourseProgressRepository,
  SyncProgressItemDto,
  SyncBatchResult,
} from '../repositories/course-progress.repository';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CreateModuleDto } from '../dto/create-module.dto';
import { UpdateModuleDto } from '../dto/update-module.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-lesson.dto';
import { CourseQueryDto } from '../dto/course-query.dto';
import { UpdateProgressDto } from '../dto/update-progress.dto';
import {
  CreateQuestionDto,
  CreateQuestionReplyDto,
  UpdateQuestionDto,
  UpdateQuestionReplyDto,
} from '../dto/lesson-qa.dto';
import { assertCleanContent } from '../../../common/utils/content-moderation.util';
import { AiModerationService } from '../../../integrations/ai/ai-moderation.service';
import { CreateAttachmentDto } from '../dto/lesson-attachment.dto';
import { GrantGroupAccessDto } from '../dto/group-access.dto';
import { ReorderModulesDto, ReorderLessonsDto } from '../dto/reorder-modules.dto';
import {
  EnrollStudentsBatchDto,
  CreateAndEnrollStudentDto,
  EnrollByQrDto,
  CourseSubscriptionRequestDto,
  RejectSubscriptionRequestDto,
} from '../dto/enrollment.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  CourseStatus,
  CourseEnrollmentStatus,
  CourseAccessStatus,
  UserRole,
  NotificationType,
  NotificationChannel,
} from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import { resolveOfficialSubmission } from '../../assessments/utils/submission-grade.util';
import { normalizeEgyptianPhone } from '../../../common/utils/phone.util';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progressRepository: CourseProgressRepository,
    private readonly bunnyVideoService: BunnyVideoService,
    private readonly storageService: StorageService,
    private readonly aiModeration: AiModerationService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  /**
   * Helper to safely extract Bunny Stream Video GUID from a string, URL, or URI.
   */
  private extractBunnyVideoId(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('bunny:')) return trimmed.replace('bunny:', '').trim();
    const match = trimmed.match(
      /(?:iframe\.mediadelivery\.net\/embed\/\d+\/|video\.bunnycdn\.com\/library\/\d+\/videos\/|video\.bunnycdn\.com\/play\/|video\.bunnycdn\.com\/)([a-f0-9\-]{36})/i,
    );
    if (match) return match[1];
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      return trimmed;
    }
    return null;
  }

  /**
   * Creates a new course scoped to the instructor.
   */
  async createCourse(teacherId: string, dto: CreateCourseDto) {
    try {
      return await this.prisma.course.create({
        data: {
          title: dto.title,
          description: dto.description,
          subject: dto.subject,
          gradeLevel: dto.gradeLevel,
          academicStage: dto.academicStage,
          academicYear: dto.academicYear || '2026-2027',
          academicTerm: dto.academicTerm || 'FIRST_TERM',
          price: dto.price || 0.0,
          coverImageUrl: dto.coverImageUrl,
          previewVideoUrl: dto.previewVideoUrl || null,
          courseQuizId: dto.courseQuizId || null,
          enforceSequentialLessons: dto.enforceSequentialLessons ?? false,
          requireExamPassingToUnlock: dto.requireExamPassingToUnlock ?? false,
          hasCertificate: dto.hasCertificate ?? true,
          teacherId,
          status: CourseStatus.DRAFT,
        },
      });
    } catch (error) {
      if (dto.coverImageUrl) {
        await this.storageService.deleteObject(dto.coverImageUrl).catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Returns all courses created by the teacher with stats and quiz linkages.
   */
  async getTeacherCourses(teacherId: string) {
    const courses = await this.prisma.course.findMany({
      where: { teacherId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        courseQuiz: {
          select: { id: true, title: true, type: true, totalScore: true },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            unitQuiz: {
              select: { id: true, title: true, type: true, totalScore: true },
            },
            lessons: {
              orderBy: { orderIndex: 'asc' },
              include: {
                lessonQuiz: {
                  select: { id: true, title: true, type: true, totalScore: true },
                },
                _count: {
                  select: { attachments: true, questions: true },
                },
              },
            },
          },
        },
        groupAccess: {
          include: {
            group: { select: { id: true, name: true, gradeLevel: true } },
          },
        },
        _count: {
          select: { enrollments: true, modules: true },
        },
      },
    });

    return courses.map((c) => {
      let totalLessons = 0;
      let totalDurationSeconds = 0;
      for (const m of c.modules) {
        totalLessons += m.lessons.length;
        for (const l of m.lessons) {
          totalDurationSeconds += l.videoDurationSeconds || 0;
        }
      }
      return {
        ...c,
        totalLessons,
        totalDurationSeconds,
      };
    });
  }

  /**
   * Keyset cursor-paginated catalog of published courses with multi-criteria filtering.
   */
  async getPublishedCatalog(query: CourseQueryDto) {
    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor ? CursorPaginationHelper.decodeCursor(query.cursor) : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');

    let stageFilter: any = undefined;
    if (query.academicStage && query.academicStage !== 'ALL') {
      const stageUpper = query.academicStage.toUpperCase();
      if (stageUpper.includes('SEC') || query.academicStage.includes('ثانوي')) {
        stageFilter = { in: ['SECONDARY', 'المرحلة الثانوية', 'ثانوي'] };
      } else if (stageUpper.includes('MID') || stageUpper.includes('PREP') || query.academicStage.includes('إعدادي') || query.academicStage.includes('اعدادي')) {
        stageFilter = { in: ['MIDDLE', 'PREPARATORY', 'المرحلة الإعدادية', 'إعدادي'] };
      } else if (stageUpper.includes('PRIM') || query.academicStage.includes('ابتدائي')) {
        stageFilter = { in: ['PRIMARY', 'المرحلة الابتدائية', 'ابتدائي'] };
      } else {
        stageFilter = query.academicStage;
      }
    }

    const where: any = {
      status: CourseStatus.PUBLISHED,
      ...(query.gradeLevel && query.gradeLevel !== 'ALL' ? { gradeLevel: query.gradeLevel } : {}),
      ...(stageFilter ? { academicStage: stageFilter } : {}),
      ...(query.subject ? { subject: query.subject } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(cursorFilter || {}),
    };

    const courses = await this.prisma.course.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        teacher: {
          include: { user: { select: { fullName: true } } },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                summary: true,
                orderIndex: true,
                videoDurationSeconds: true,
                lessonType: true,
                isPreview: true,
                bunnyVideoId: true,
                contentUrl: true,
              },
            },
          },
        },
        _count: { select: { modules: true, enrollments: true } },
      },
    });

    const mappedCourses = courses.map((c) => {
      let totalLessons = 0;
      let firstFreeLesson: any = null;
      let firstAnyLessonWithVideo: any = null;

      const formattedModules = c.modules.map((m) => {
        const formattedLessons = m.lessons.map((l) => {
          totalLessons++;

          let embedUrl: string | null = null;
          if (l.bunnyVideoId) {
            embedUrl = this.bunnyVideoService.getEmbedUrl(l.bunnyVideoId);
          } else if (l.contentUrl) {
            embedUrl = l.contentUrl;
          }

          if (embedUrl && !firstAnyLessonWithVideo) {
            firstAnyLessonWithVideo = { ...l, freeVideoUrl: embedUrl };
          }

          if (l.isPreview && embedUrl && !firstFreeLesson) {
            firstFreeLesson = { ...l, freeVideoUrl: embedUrl };
          }

          return {
            id: l.id,
            title: l.title,
            description: l.description,
            summary: l.summary,
            orderIndex: l.orderIndex,
            videoDurationSeconds: l.videoDurationSeconds,
            lessonType: l.lessonType,
            isPreview: l.isPreview,
            freeVideoUrl: l.isPreview ? embedUrl : null,
          };
        });

        return {
          id: m.id,
          title: m.title,
          description: m.description,
          orderIndex: m.orderIndex,
          lessonsCount: formattedLessons.length,
          lessons: formattedLessons,
        };
      });

      const previewLesson = firstFreeLesson || firstAnyLessonWithVideo;
      const hasFreeVideo = Boolean(previewLesson?.freeVideoUrl);

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        subject: c.subject,
        gradeLevel: c.gradeLevel,
        academicStage: c.academicStage,
        academicYear: c.academicYear,
        academicTerm: c.academicTerm,
        price: c.price,
        coverImageUrl: c.coverImageUrl,
        previewVideoUrl: c.previewVideoUrl || null,
        hasCertificate: c.hasCertificate,
        createdAt: c.createdAt,
        teacher: c.teacher,
        modules: formattedModules,
        totalModules: formattedModules.length,
        totalLessons,
        hasFreeVideo,
        freeVideoLessonId: previewLesson?.id || null,
        freeVideoUrl: previewLesson?.freeVideoUrl || null,
      };
    });

    return CursorPaginationHelper.formatResponse(mappedCourses, limit);
  }

  /**
   * Retrieves public course details and syllabus for unauthenticated guests.
   */
  async getPublicCourseDetails(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          include: { user: { select: { fullName: true } } },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                summary: true,
                orderIndex: true,
                videoDurationSeconds: true,
                lessonType: true,
                isPreview: true,
                bunnyVideoId: true,
                contentUrl: true,
              },
            },
          },
        },
        _count: { select: { modules: true, enrollments: true } },
      },
    });

    if (!course || course.status !== CourseStatus.PUBLISHED) {
      throw new NotFoundException(`Course [${courseId}] not found or not published`);
    }

    let totalLessons = 0;
    let firstFreeLesson: any = null;
    let firstAnyLessonWithVideo: any = null;

    const formattedModules = course.modules.map((m) => {
      const formattedLessons = m.lessons.map((l) => {
        totalLessons++;
        let embedUrl: string | null = null;
        if (l.bunnyVideoId) {
          embedUrl = this.bunnyVideoService.getEmbedUrl(l.bunnyVideoId);
        } else if (l.contentUrl) {
          embedUrl = l.contentUrl;
        }

        if (embedUrl && !firstAnyLessonWithVideo) {
          firstAnyLessonWithVideo = { ...l, freeVideoUrl: embedUrl };
        }
        if (l.isPreview && embedUrl && !firstFreeLesson) {
          firstFreeLesson = { ...l, freeVideoUrl: embedUrl };
        }

        return {
          id: l.id,
          title: l.title,
          description: l.description,
          summary: l.summary,
          orderIndex: l.orderIndex,
          videoDurationSeconds: l.videoDurationSeconds,
          lessonType: l.lessonType,
          isPreview: l.isPreview,
          freeVideoUrl: l.isPreview ? embedUrl : null,
        };
      });

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        orderIndex: m.orderIndex,
        lessonsCount: formattedLessons.length,
        lessons: formattedLessons,
      };
    });

    const previewLesson = firstFreeLesson || firstAnyLessonWithVideo;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      subject: course.subject,
      gradeLevel: course.gradeLevel,
      academicStage: course.academicStage,
      academicYear: course.academicYear,
      academicTerm: course.academicTerm,
      price: course.price,
      coverImageUrl: course.coverImageUrl,
      previewVideoUrl: course.previewVideoUrl || null,
      hasCertificate: course.hasCertificate,
      createdAt: course.createdAt,
      teacher: course.teacher,
      modules: formattedModules,
      totalModules: formattedModules.length,
      totalLessons,
      hasFreeVideo: Boolean(previewLesson?.freeVideoUrl),
      freeVideoLessonId: previewLesson?.id || null,
      freeVideoUrl: previewLesson?.freeVideoUrl || null,
    };
  }

  /**
   * Enriches a quiz summary with the requesting student's official (highest-scoring)
   * submission so the lesson-viewer quiz card can render the final mark directly from
   * the payload the room already loads — no dependence on a second per-card fetch.
   * Returns the quiz untouched (plus `mySubmission: null`) for non-student viewers.
   */
  private async attachStudentSubmission<
    Q extends { id: string; passingScore?: unknown },
  >(quiz: Q | null, studentId: string | null) {
    if (!quiz) return null;

    const base = {
      ...quiz,
      passingScore:
        quiz.passingScore != null ? Number(quiz.passingScore) : null,
    };

    if (!studentId) {
      return { ...base, attemptCount: 0, mySubmission: null };
    }

    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: { assessmentId: quiz.id, studentId },
      orderBy: { attemptNumber: 'asc' },
      select: { attemptNumber: true, status: true, scoreObtained: true },
    });

    const official = resolveOfficialSubmission(submissions);
    const isPassed = official
      ? base.passingScore != null && official.scoreObtained != null
        ? Number(official.scoreObtained) >= Number(base.passingScore)
        : (official.status === 'SUBMITTED' || official.status === 'GRADED')
      : false;

    return {
      ...base,
      attemptCount: submissions.length,
      mySubmission: official
        ? {
            status: official.status,
            scoreObtained:
              official.scoreObtained != null
                ? Number(official.scoreObtained)
                : null,
            attemptNumber: official.attemptNumber,
            isPassed,
          }
        : null,
    };
  }

  /**
   * Retrieves full course outline including ordered modules, lessons, attachments, and quizzes.
   */
  async getCourseDetails(courseId: string, user?: AuthenticatedUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          include: { user: { select: { fullName: true, email: true, phone: true } } },
        },
        courseQuiz: {
          select: { id: true, title: true, type: true, totalScore: true, durationMinutes: true, passingScore: true, allowMultipleAttempts: true, isOptional: true },
        },
        groupAccess: {
          include: {
            group: { select: { id: true, name: true, gradeLevel: true } },
          },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            unitQuiz: {
              select: { id: true, title: true, type: true, totalScore: true, durationMinutes: true, passingScore: true, allowMultipleAttempts: true, isOptional: true, requirePassingScore: true },
            },
            lessons: {
              orderBy: { orderIndex: 'asc' },
              include: {
                attachments: true,
                lessonQuiz: {
                  select: { id: true, title: true, type: true, totalScore: true, durationMinutes: true, passingScore: true, allowMultipleAttempts: true, isOptional: true, requirePassingScore: true },
                },
                assessments: {
                  select: { id: true, title: true, type: true, assessmentType: true, totalScore: true, durationMinutes: true, passingScore: true, allowMultipleAttempts: true, isPublished: true, isOptional: true, requirePassingScore: true },
                },
                _count: {
                  select: { questions: true },
                },
              },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (user && course.status !== CourseStatus.PUBLISHED) {
      const isSecretariat = user.role === UserRole.SECRETARIAT;
      const isOwnerTeacher =
        user.role === UserRole.TEACHER &&
        (course.teacherId === user.teacherProfileId || course.teacherId === user.id);

      if (!isSecretariat && !isOwnerTeacher) {
        throw new NotFoundException(`Course [${courseId}] not found`);
      }
    }

    let completedLessonIds: string[] = [];
    const studentId = user?.studentProfileId || (user?.role === UserRole.STUDENT ? user?.id : null);
    if (studentId) {
      const progresses = await this.prisma.courseProgress.findMany({
        where: {
          courseId,
          studentId,
          isCompleted: true,
        },
        select: { lessonId: true },
      });
      completedLessonIds = progresses.map((p) => p.lessonId);
    }

    const [enrichedCourseQuiz, enrichedModules] = await Promise.all([
      this.attachStudentSubmission(course.courseQuiz, studentId),
      Promise.all(
        (course.modules || []).map(async (mod) => {
          const [enrichedUnitQuiz, enrichedLessons] = await Promise.all([
            this.attachStudentSubmission(mod.unitQuiz, studentId),
            Promise.all(
              (mod.lessons || []).map(async (les) => ({
                ...les,
                lessonQuiz: await this.attachStudentSubmission(les.lessonQuiz, studentId),
                assessments: await Promise.all(
                  (les.assessments || []).map((ass: any) =>
                    this.attachStudentSubmission(ass, studentId),
                  ),
                ),
              })),
            ),
          ]);
          return {
            ...mod,
            unitQuiz: enrichedUnitQuiz,
            lessons: enrichedLessons,
          };
        }),
      ),
    ]);

    const allLessons = (enrichedModules || []).flatMap((m) => m.lessons || []);
    const totalLessons = allLessons.length;
    const allLessonsCompleted = totalLessons > 0 && completedLessonIds.length >= totalLessons;

    const courseQuizzes: { id: string; mySubmission: any; passingScore: number | null }[] = [];
    if (enrichedCourseQuiz) {
      courseQuizzes.push(enrichedCourseQuiz);
    }
    (enrichedModules || []).forEach((m) => {
      if (m.unitQuiz) {
        courseQuizzes.push(m.unitQuiz);
      }
      (m.lessons || []).forEach((l) => {
        if (l.lessonQuiz) {
          courseQuizzes.push(l.lessonQuiz);
        }
      });
    });

    const uniqueQuizMap = new Map<string, { id: string; mySubmission: any; passingScore: number | null }>();
    courseQuizzes.forEach((q) => {
      if (q && q.id) uniqueQuizMap.set(q.id, q);
    });
    const uniqueQuizzes = Array.from(uniqueQuizMap.values());
    const totalQuizzesCount = uniqueQuizzes.length;

    let completedQuizzesCount = 0;
    if (studentId) {
      completedQuizzesCount = uniqueQuizzes.filter((q) => {
        const sub = q.mySubmission;
        if (!sub) return false;
        const isSubmitted = sub.status === 'SUBMITTED' || sub.status === 'GRADED';
        if (!isSubmitted) return false;
        if (course.requireExamPassingToUnlock) {
          return sub.isPassed === true;
        }
        return true;
      }).length;
    }

    const allQuizzesCompleted = totalQuizzesCount === 0 || completedQuizzesCount === totalQuizzesCount;
    const isCertificateEligible = allLessonsCompleted && allQuizzesCompleted;

    return {
      ...course,
      modules: enrichedModules,
      courseQuiz: enrichedCourseQuiz,
      completedLessonIds,
      allLessonsCompleted,
      allQuizzesCompleted,
      totalQuizzesCount,
      completedQuizzesCount,
      isCertificateEligible,
    };
  }

  /**
   * Updates course metadata or transitions status (Draft -> Published -> Archived).
   */
  async updateCourse(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: UpdateCourseDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to modify this course');
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.subject ? { subject: dto.subject } : {}),
        ...(dto.gradeLevel ? { gradeLevel: dto.gradeLevel } : {}),
        ...(dto.academicStage !== undefined ? { academicStage: dto.academicStage } : {}),
        ...(dto.academicYear !== undefined ? { academicYear: dto.academicYear } : {}),
        ...(dto.academicTerm !== undefined ? { academicTerm: dto.academicTerm } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.coverImageUrl !== undefined ? { coverImageUrl: dto.coverImageUrl } : {}),
        ...(dto.previewVideoUrl !== undefined ? { previewVideoUrl: dto.previewVideoUrl } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.courseQuizId !== undefined ? { courseQuizId: dto.courseQuizId } : {}),
        ...(dto.enforceSequentialLessons !== undefined ? { enforceSequentialLessons: dto.enforceSequentialLessons } : {}),
        ...(dto.requireExamPassingToUnlock !== undefined ? { requireExamPassingToUnlock: dto.requireExamPassingToUnlock } : {}),
        ...(dto.hasCertificate !== undefined ? { hasCertificate: dto.hasCertificate } : {}),
      },
    });
  }

  /**
   * Deletes / archives a course and purges all related Bunny Stream videos and storage attachments.
   */
  async deleteCourse(courseId: string, teacherId: string, isSecretariat: boolean) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }
    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to delete this course');
    }

    // Clean up all Bunny Stream videos belonging to all lessons in this course
    const lessons = await this.prisma.courseLesson.findMany({
      where: { module: { courseId } },
      select: { bunnyVideoId: true, videoAssetId: true, contentUrl: true },
    });

    const bunnyIdsToDelete = new Set<string>();
    for (const l of lessons) {
      const b1 = this.extractBunnyVideoId(l.bunnyVideoId);
      const b2 = this.extractBunnyVideoId(l.videoAssetId);
      const b3 = this.extractBunnyVideoId(l.contentUrl);
      if (b1) bunnyIdsToDelete.add(b1);
      if (b2) bunnyIdsToDelete.add(b2);
      if (b3) bunnyIdsToDelete.add(b3);
    }

    for (const videoId of bunnyIdsToDelete) {
      await this.bunnyVideoService.deleteVideo(videoId).catch((err) => {
        this.logger.warn(`Failed to delete Bunny video [${videoId}] for course [${courseId}]:`, err);
      });
    }

    // Clean up all lesson attachments in this course from storage
    const attachments = await this.prisma.lessonAttachment.findMany({
      where: { lesson: { module: { courseId } } },
      select: { fileKey: true, fileUrl: true },
    });
    for (const att of attachments) {
      const key = att.fileKey || att.fileUrl;
      if (key) {
        await this.storageService.deleteObject(key).catch(() => {});
      }
    }

    // Clean up course cover image
    if (course.coverImageUrl) {
      await this.storageService.deleteObject(course.coverImageUrl).catch(() => {});
    }

    return this.prisma.course.delete({ where: { id: courseId } });
  }

  /**
   * Adds a module/chapter to a course with auto-computed order index and optional unit quiz.
   */
  async createModule(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateModuleDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage this course curriculum');
    }

    let orderIndex = dto.orderIndex;
    if (!orderIndex) {
      const moduleCount = await this.prisma.courseModule.count({ where: { courseId } });
      orderIndex = moduleCount + 1;
    }

    return this.prisma.courseModule.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description,
        orderIndex,
        unitQuizId: dto.unitQuizId || null,
      },
      include: {
        unitQuiz: { select: { id: true, title: true, type: true } },
      },
    });
  }

  /**
   * Updates an existing course module / unit.
   */
  async updateModule(
    moduleId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: UpdateModuleDto,
  ) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) {
      throw new NotFoundException(`Module [${moduleId}] not found`);
    }
    if (!isSecretariat && module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to modify this module');
    }

    return this.prisma.courseModule.update({
      where: { id: moduleId },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),
        ...(dto.unitQuizId !== undefined ? { unitQuizId: dto.unitQuizId } : {}),
      },
      include: {
        unitQuiz: { select: { id: true, title: true, type: true } },
      },
    });
  }

  /**
   * Deletes a module and purges all related Bunny Stream videos and attachments.
   */
  async deleteModule(moduleId: string, teacherId: string, isSecretariat: boolean) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) {
      throw new NotFoundException(`Module [${moduleId}] not found`);
    }
    if (!isSecretariat && module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to delete this module');
    }

    // Clean up all Bunny Stream videos belonging to this module
    const lessons = await this.prisma.courseLesson.findMany({
      where: { moduleId },
      select: { bunnyVideoId: true, videoAssetId: true, contentUrl: true },
    });

    const bunnyIdsToDelete = new Set<string>();
    for (const l of lessons) {
      const b1 = this.extractBunnyVideoId(l.bunnyVideoId);
      const b2 = this.extractBunnyVideoId(l.videoAssetId);
      const b3 = this.extractBunnyVideoId(l.contentUrl);
      if (b1) bunnyIdsToDelete.add(b1);
      if (b2) bunnyIdsToDelete.add(b2);
      if (b3) bunnyIdsToDelete.add(b3);
    }

    for (const videoId of bunnyIdsToDelete) {
      await this.bunnyVideoService.deleteVideo(videoId).catch((err) => {
        this.logger.warn(`Failed to delete Bunny video [${videoId}] for module [${moduleId}]:`, err);
      });
    }

    // Clean up all lesson attachments in this module from storage
    const attachments = await this.prisma.lessonAttachment.findMany({
      where: { lesson: { moduleId } },
      select: { fileKey: true, fileUrl: true },
    });
    for (const att of attachments) {
      const key = att.fileKey || att.fileUrl;
      if (key) {
        await this.storageService.deleteObject(key).catch(() => {});
      }
    }

    return this.prisma.courseModule.delete({ where: { id: moduleId } });
  }

  /**
   * Bulk reorders modules in a course.
   */
  async reorderModules(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: ReorderModulesDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }
    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to reorder modules in this course');
    }

    // Two-phase update to avoid the (course_id, order_index) unique constraint
    // colliding mid-transaction. A reorder is a permutation of the indexes that
    // already exist, so writing a final index directly clashes with the row that
    // still holds it (Postgres checks unique constraints per-statement). Phase 1
    // parks every module at a distinct negative index — never used at rest, so it
    // can't collide — then phase 2 assigns the final positive indexes into the
    // now-free slots.
    return this.prisma.$transaction([
      ...dto.moduleOrders.map((item, i) =>
        this.prisma.courseModule.update({
          where: { id: item.moduleId },
          data: { orderIndex: -(i + 1) },
        }),
      ),
      ...dto.moduleOrders.map((item) =>
        this.prisma.courseModule.update({
          where: { id: item.moduleId },
          data: { orderIndex: item.orderIndex },
        }),
      ),
    ]);
  }

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

    // Validate all lessons belong to this course and target modules belong to it too
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

    // Two-phase update to avoid the (module_id, order_index) unique constraint
    // colliding mid-transaction (same reasoning as reorderModules). Phase 1 parks
    // every lesson at a distinct negative index AND moves it to its target module,
    // so the destination unit's final slots are freed before we fill them. Phase 2
    // then assigns the final positive order indexes with no collision.
    return this.prisma.$transaction([
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
  }

  /**
   * Creates a lesson in a module with summary, DRM video, attachments, and quiz.
   * Cleans up Bunny video and storage attachments if creation fails.
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
      // Clean up uploaded video if module not found
      const b1 = this.extractBunnyVideoId(dto.bunnyVideoId);
      if (b1) await this.bunnyVideoService.deleteVideo(b1).catch(() => {});
      throw new NotFoundException(`Course module [${moduleId}] not found`);
    }

    if (!isSecretariat && module.course.teacherId !== teacherId) {
      const b1 = this.extractBunnyVideoId(dto.bunnyVideoId);
      if (b1) await this.bunnyVideoService.deleteVideo(b1).catch(() => {});
      throw new ForbiddenException('You do not have permission to manage this module');
    }

    let orderIndex = dto.orderIndex;
    if (!orderIndex) {
      const lessonCount = await this.prisma.courseLesson.count({ where: { moduleId } });
      orderIndex = lessonCount + 1;
    }

    try {
      return await this.prisma.courseLesson.create({
        data: {
          moduleId,
          title: dto.title,
          description: dto.description,
          summary: dto.summary || null,
          orderIndex,
          lessonType: dto.lessonType || 'VIDEO',
          bunnyVideoId: dto.bunnyVideoId,
          contentUrl: dto.contentUrl,
          videoDurationSeconds: dto.videoDurationSeconds,
          isPreview: dto.isFreePreview !== undefined ? dto.isFreePreview : (dto.isPreview !== undefined ? dto.isPreview : false),
          lessonQuizId: dto.lessonQuizId || null,
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
        },
      });
    } catch (error) {
      // ⚠️ ROLLBACK CLEANUP: Purge newly created Bunny video(s) and attachments if database creation failed
      const bunnyIdsToCleanup = new Set<string>();
      const b1 = this.extractBunnyVideoId(dto.bunnyVideoId);
      const b2 = this.extractBunnyVideoId(dto.contentUrl);
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
   * Cleans up orphaned Bunny videos if replacement or update fails.
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
        this.extractBunnyVideoId(lesson.bunnyVideoId),
        this.extractBunnyVideoId(lesson.videoAssetId),
        this.extractBunnyVideoId(lesson.contentUrl),
      ].filter(Boolean) as string[],
    );

    const newBunnyId = this.extractBunnyVideoId(dto.bunnyVideoId);
    const newContentBunnyId = this.extractBunnyVideoId(dto.contentUrl);

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
          ...(dto.bunnyVideoId !== undefined ? { bunnyVideoId: dto.bunnyVideoId } : {}),
          ...(dto.contentUrl !== undefined ? { contentUrl: dto.contentUrl } : {}),
          ...(dto.videoDurationSeconds !== undefined ? { videoDurationSeconds: dto.videoDurationSeconds } : {}),
          ...(isPreviewVal !== undefined ? { isPreview: isPreviewVal } : {}),
          ...(dto.lessonQuizId !== undefined ? { lessonQuizId: dto.lessonQuizId } : {}),
        },
        include: {
          attachments: true,
          lessonQuiz: { select: { id: true, title: true, type: true } },
        },
      });
    } catch (error) {
      // If database update failed, purge any newly uploaded Bunny video that was not previously saved
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

    // Only after update succeeds: If video was replaced or removed, delete the old video(s) from Bunny
    if (dto.bunnyVideoId !== undefined || dto.contentUrl !== undefined) {
      for (const oldId of oldBunnyIds) {
        if (oldId !== newBunnyId && oldId !== newContentBunnyId) {
          await this.bunnyVideoService.deleteVideo(oldId).catch((err) => {
            this.logger.warn(`Failed to delete replaced Bunny video [${oldId}]:`, err);
          });
        }
      }
    }

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

    // Delete all associated Bunny Stream video assets for this lesson
    const bunnyIdsToDelete = new Set<string>();
    const b1 = this.extractBunnyVideoId(lesson.bunnyVideoId);
    const b2 = this.extractBunnyVideoId(lesson.videoAssetId);
    const b3 = this.extractBunnyVideoId(lesson.contentUrl);
    if (b1) bunnyIdsToDelete.add(b1);
    if (b2) bunnyIdsToDelete.add(b2);
    if (b3) bunnyIdsToDelete.add(b3);

    for (const videoId of bunnyIdsToDelete) {
      await this.bunnyVideoService.deleteVideo(videoId).catch((err) => {
        this.logger.warn(`Failed to delete Bunny Stream video [${videoId}] for lesson [${lessonId}]:`, err);
      });
    }

    // Also delete any attachments from storage
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

    return this.prisma.courseLesson.delete({ where: { id: lessonId } });
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

    return this.prisma.lessonAttachment.create({
      data: {
        lessonId,
        title: dto.title,
        fileUrl: dto.fileUrl,
        fileKey: dto.fileKey,
        fileSize: dto.fileSize,
        fileType: dto.fileType || 'application/pdf',
      },
    });
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
    return this.prisma.lessonAttachment.delete({ where: { id: attachmentId } });
  }

  /**
   * Fetches timestamped Q&A questions for a lesson with threaded replies.
   */
  async getLessonQuestions(lessonId: string) {
    const questions = await this.prisma.lessonQuestion.findMany({
      where: { lessonId },
      orderBy: [{ videoTimestamp: 'asc' }, { createdAt: 'desc' }],
      include: {
        student: {
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return questions.map((q) => ({
      id: q.id,
      content: q.content,
      videoTimestamp: q.videoTimestamp,
      lessonId: q.lessonId,
      studentId: q.studentId,
      studentUserId: q.student?.user?.id || q.studentId,
      studentName: q.student?.user?.fullName || 'طالب مسجل',
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      replies: q.replies,
    }));
  }

  /**
   * Submits a timestamped question on a video lesson.
   */
  async createLessonQuestion(
    lessonId: string,
    user: AuthenticatedUser,
    dto: CreateQuestionDto,
  ) {
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('نص السؤال مطلوب');
    }

    await this.aiModeration.assertValidContent(dto.content);

    let studentProfile = null;

    if (user.studentProfileId) {
      studentProfile = await this.prisma.studentProfile.findUnique({
        where: { id: user.studentProfileId },
        include: { user: { select: { fullName: true } } },
      });
    }

    if (!studentProfile) {
      studentProfile = await this.prisma.studentProfile.findUnique({
        where: { id: user.id },
        include: { user: { select: { fullName: true } } },
      });
    }

    // If user is a Teacher or Secretariat previewing or testing the learning room,
    // ensure a student profile exists for this user so FK constraints are respected.
    if (!studentProfile) {
      const existingUser = await this.prisma.user.findUnique({
        where: { id: user.id },
      });

      if (existingUser) {
        studentProfile = await this.prisma.studentProfile.create({
          data: {
            id: user.id,
            studentCode: `T-${user.id.slice(0, 6)}`,
            qrCodeToken: `qr_tok_${user.id.replace(/-/g, '')}`,
            gradeLevel: 'المعلم - معاينة',
            academicStage: 'SECONDARY',
          },
          include: { user: { select: { fullName: true } } },
        });
      } else {
        studentProfile = await this.prisma.studentProfile.findFirst({
          include: { user: { select: { fullName: true } } },
        });
      }
    }

    if (!studentProfile) {
      throw new NotFoundException('تعذر العثور على الملف التعريفي للطالب');
    }

    const timestamp =
      dto.videoTimestamp !== undefined && dto.videoTimestamp !== null
        ? Math.floor(Number(dto.videoTimestamp))
        : null;

    const question = await this.prisma.lessonQuestion.create({
      data: {
        lessonId,
        studentId: studentProfile.id,
        content: dto.content.trim(),
        videoTimestamp: timestamp !== null && !isNaN(timestamp) && timestamp >= 0 ? timestamp : null,
      },
      include: {
        student: {
          include: { user: { select: { id: true, fullName: true } } },
        },
        replies: true,
      },
    });

    return {
      id: question.id,
      content: question.content,
      videoTimestamp: question.videoTimestamp,
      lessonId: question.lessonId,
      studentId: question.studentId,
      studentUserId: question.student?.user?.id || user.id,
      studentName: question.student?.user?.fullName || user.email || 'طالب مسجل',
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      replies: [],
    };
  }

  /**
   * Updates an existing lesson question (author or instructor).
   */
  async updateLessonQuestion(
    questionId: string,
    user: AuthenticatedUser,
    dto: UpdateQuestionDto,
  ) {
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('نص السؤال مطلوب');
    }

    await this.aiModeration.assertValidContent(dto.content);

    const question = await this.prisma.lessonQuestion.findUnique({
      where: { id: questionId },
      include: {
        student: {
          include: { user: { select: { id: true } } },
        },
        lesson: {
          include: { module: { include: { course: true } } },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`السؤال غير موجود [${questionId}]`);
    }

    const course = question.lesson.module.course;
    const isAuthor =
      question.student?.user?.id === user.id ||
      question.studentId === user.studentProfileId ||
      question.studentId === user.id;
    const isTeacher =
      user.role === UserRole.TEACHER &&
      (course.teacherId === user.teacherProfileId || course.teacherId === user.id);
    const isSecretariat = user.role === UserRole.SECRETARIAT;

    if (!isAuthor && !isTeacher && !isSecretariat) {
      throw new ForbiddenException('ليس لديك صلاحية لتعديل هذا السؤال');
    }

    return this.prisma.lessonQuestion.update({
      where: { id: questionId },
      data: { content: dto.content.trim() },
    });
  }

  /**
   * Deletes a lesson question and all its replies (author, instructor, or secretariat).
   */
  async deleteLessonQuestion(questionId: string, user: AuthenticatedUser) {
    const question = await this.prisma.lessonQuestion.findUnique({
      where: { id: questionId },
      include: {
        student: {
          include: { user: { select: { id: true } } },
        },
        lesson: {
          include: { module: { include: { course: true } } },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`السؤال غير موجود [${questionId}]`);
    }

    const course = question.lesson.module.course;
    const isAuthor =
      question.student?.user?.id === user.id ||
      question.studentId === user.studentProfileId ||
      question.studentId === user.id;
    const isTeacher =
      user.role === UserRole.TEACHER &&
      (course.teacherId === user.teacherProfileId || course.teacherId === user.id);
    const isSecretariat = user.role === UserRole.SECRETARIAT;

    if (!isAuthor && !isTeacher && !isSecretariat) {
      throw new ForbiddenException('ليس لديك صلاحية لحذف هذا السؤال');
    }

    return this.prisma.lessonQuestion.delete({
      where: { id: questionId },
    });
  }

  /**
   * Adds a reply to a student's timestamped question.
   */
  async createQuestionReply(
    questionId: string,
    user: AuthenticatedUser,
    dto: CreateQuestionReplyDto,
  ) {
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('نص الرد مطلوب');
    }

    await this.aiModeration.assertValidContent(dto.content);

    const question = await this.prisma.lessonQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      throw new NotFoundException(`السؤال غير موجود [${questionId}]`);
    }

    const author = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true },
    });
    const authorName = author?.fullName || user.email || 'مستخدم المنصة';

    return this.prisma.lessonQuestionReply.create({
      data: {
        questionId,
        content: dto.content.trim(),
        authorId: user.id,
        authorRole: user.role,
        authorName,
      },
    });
  }

  /**
   * Updates an existing Q&A reply (author or instructor).
   */
  async updateQuestionReply(
    replyId: string,
    user: AuthenticatedUser,
    dto: UpdateQuestionReplyDto,
  ) {
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('نص الرد مطلوب');
    }

    await this.aiModeration.assertValidContent(dto.content);

    const reply = await this.prisma.lessonQuestionReply.findUnique({
      where: { id: replyId },
      include: {
        question: {
          include: {
            lesson: {
              include: { module: { include: { course: true } } },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new NotFoundException(`الرد غير موجود [${replyId}]`);
    }

    const course = reply.question.lesson.module.course;
    const isAuthor = reply.authorId === user.id;
    const isTeacher =
      user.role === UserRole.TEACHER &&
      (course.teacherId === user.teacherProfileId || course.teacherId === user.id);
    const isSecretariat = user.role === UserRole.SECRETARIAT;

    if (!isAuthor && !isTeacher && !isSecretariat) {
      throw new ForbiddenException('ليس لديك صلاحية لتعديل هذا الرد');
    }

    return this.prisma.lessonQuestionReply.update({
      where: { id: replyId },
      data: { content: dto.content.trim() },
    });
  }

  /**
   * Deletes an existing Q&A reply (author, instructor, or secretariat).
   */
  async deleteQuestionReply(replyId: string, user: AuthenticatedUser) {
    const reply = await this.prisma.lessonQuestionReply.findUnique({
      where: { id: replyId },
      include: {
        question: {
          include: {
            lesson: {
              include: { module: { include: { course: true } } },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new NotFoundException(`الرد غير موجود [${replyId}]`);
    }

    const course = reply.question.lesson.module.course;
    const isAuthor = reply.authorId === user.id;
    const isTeacher =
      user.role === UserRole.TEACHER &&
      (course.teacherId === user.teacherProfileId || course.teacherId === user.id);
    const isSecretariat = user.role === UserRole.SECRETARIAT;

    if (!isAuthor && !isTeacher && !isSecretariat) {
      throw new ForbiddenException('ليس لديك صلاحية لحذف هذا الرد');
    }

    return this.prisma.lessonQuestionReply.delete({
      where: { id: replyId },
    });
  }

  /**
   * Batch grants course access to all students in specified physical AcademicGroups.
   */
  async grantGroupAccess(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: GrantGroupAccessDto,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }
    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to grant access to this course');
    }

    return this.prisma.$transaction(async (tx) => {
      const addedGroupAccess = [];

      for (const groupId of dto.groupIds) {
        // Link group to course
        const groupAccess = await tx.groupCourseAccess.upsert({
          where: {
            courseId_groupId: { courseId, groupId },
          },
          create: { courseId, groupId },
          update: {},
        });
        addedGroupAccess.push(groupAccess);

        // Fetch all active enrolled students in this group
        const groupEnrollments = await tx.groupEnrollment.findMany({
          where: { groupId, status: 'ACTIVE' },
          select: { studentId: true },
        });

        // Provision CourseEnrollment and CourseAccess for all students in group
        for (const ge of groupEnrollments) {
          const enrollment = await tx.courseEnrollment.upsert({
            where: {
              courseId_studentId: { courseId, studentId: ge.studentId },
            },
            create: {
              courseId,
              studentId: ge.studentId,
              status: CourseEnrollmentStatus.ACTIVE,
            },
            update: {
              status: CourseEnrollmentStatus.ACTIVE,
            },
          });

          await tx.courseAccess.upsert({
            where: { enrollmentId: enrollment.id },
            create: {
              enrollmentId: enrollment.id,
              studentId: ge.studentId,
              courseId,
              accessStatus: CourseAccessStatus.ACTIVE,
              validFrom: new Date(),
            },
            update: {
              accessStatus: CourseAccessStatus.ACTIVE,
            },
          });
        }
      }

      return {
        courseId,
        groupsGranted: dto.groupIds.length,
      };
    });
  }

  /**
   * Generates direct upload credentials for Bunny Stream video upload.
   */
  async generateDirectVideoUploadCredentials(title: string) {
    const creds = await this.bunnyVideoService.generateDirectUploadCredentials(title);
    return {
      ...creds,
      provider: 'bunny' as const,
      contentUrl: creds.embedUrl,
    };
  }

  /**
   * Student course enrollment with atomic CourseEnrollment and CourseAccess provisioning.
   */
  async enrollCourse(courseId: string, studentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({ where: { id: courseId } });
      if (!course) {
        throw new NotFoundException(`Course [${courseId}] not found`);
      }

      if (course.status !== CourseStatus.PUBLISHED) {
        throw new BadRequestException('Cannot enroll in an unpublished or archived course');
      }

      let student = await tx.studentProfile.findUnique({ where: { id: studentId } });
      if (!student) {
        student = await tx.studentProfile.findFirst({ where: { user: { id: studentId } } });
      }
      if (!student) {
        throw new NotFoundException(`Student [${studentId}] not found`);
      }

      const resolvedStudentId = student.id;

      // Upsert enrollment
      const enrollment = await tx.courseEnrollment.upsert({
        where: {
          courseId_studentId: {
            courseId,
            studentId: resolvedStudentId,
          },
        },
        create: {
          courseId,
          studentId: resolvedStudentId,
          status: CourseEnrollmentStatus.ACTIVE,
        },
        update: {
          status: CourseEnrollmentStatus.ACTIVE,
        },
      });

      // Upsert access entitlement
      const access = await tx.courseAccess.upsert({
        where: { enrollmentId: enrollment.id },
        create: {
          enrollmentId: enrollment.id,
          studentId: resolvedStudentId,
          courseId,
          accessStatus: CourseAccessStatus.ACTIVE,
          validFrom: new Date(),
        },
        update: {
          accessStatus: CourseAccessStatus.ACTIVE,
        },
      });

      this.logger.log(`Student [${studentId}] enrolled in course [${courseId}]`);

      return {
        enrollmentId: enrollment.id,
        courseId,
        studentId,
        status: enrollment.status,
        accessStatus: access.accessStatus,
        enrolledAt: enrollment.enrolledAt,
      };
    });
  }

  /**
   * Handles student application to subscribe to an online course with Vodafone Cash payment receipt.
   */
  async requestCourseSubscription(
    courseId: string,
    studentId: string,
    dto: CourseSubscriptionRequestDto,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
      },
    });

    if (!course) {
      throw new NotFoundException('الكورس المطلوب غير موجود');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('لا يمكن الاشتراك في كورس غير منشور أو مؤرشف');
    }

    let student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { id: true, fullName: true, phone: true } } },
    });
    if (!student) {
      student = await this.prisma.studentProfile.findFirst({
        where: { user: { id: studentId } },
        include: { user: { select: { id: true, fullName: true, phone: true } } },
      });
    }
    if (!student) {
      throw new NotFoundException('بيانات الطالب غير موجودة');
    }

    const resolvedStudentId = student.id;
    const isFree = Number(course.price) === 0;

    if (isFree) {
      // Free course: instantly activate
      return this.enrollCourse(courseId, resolvedStudentId);
    }

    // Ensure progress is completely reset to zero when applying for a new subscription
    await this.prisma.courseProgress.deleteMany({
      where: {
        studentId: resolvedStudentId,
        courseId,
      },
    });

    // Paid course: validate receipt if provided or save pending application
    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: {
        courseId_studentId: {
          courseId,
          studentId: resolvedStudentId,
        },
      },
      create: {
        courseId,
        studentId: resolvedStudentId,
        status: CourseEnrollmentStatus.PENDING,
        senderPhone: dto.senderPhone || null,
        transferAmount: dto.transferAmount ? Number(dto.transferAmount) : Number(course.price),
        receiptImageUrl: dto.receiptImageUrl || null,
        paymentMethod: dto.paymentMethod || 'VODAFONE_CASH',
        rejectionReason: null,
      },
      update: {
        status: CourseEnrollmentStatus.PENDING,
        senderPhone: dto.senderPhone || undefined,
        transferAmount: dto.transferAmount ? Number(dto.transferAmount) : Number(course.price),
        receiptImageUrl: dto.receiptImageUrl || undefined,
        paymentMethod: dto.paymentMethod || 'VODAFONE_CASH',
        rejectionReason: null,
        enrolledAt: new Date(),
      },
    });

    // Notify teacher of the new subscription application in real time
    if (this.notificationsService && course.teacher?.user?.id) {
      this.notificationsService
        .sendNotification({
          recipientId: course.teacher.user.id,
          notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
          type: 'COURSE_SUBSCRIPTION_REQUEST',
          title: `طلب اشتراك جديد في كورس: ${course.title}`,
          body: `قام الطالب ${student.user?.fullName || student.studentCode} بتقديم طلب اشتراك في كورس "${course.title}" وإرفاق إيصال التحويل بمبلغ ${dto.transferAmount ? Number(dto.transferAmount) : Number(course.price)} ج.م`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
          data: {
            courseId,
            enrollmentId: enrollment.id,
            studentId: resolvedStudentId,
            studentName: student.user?.fullName,
            receiptImageUrl: dto.receiptImageUrl,
            senderPhone: dto.senderPhone,
            transferAmount: dto.transferAmount,
          },
          referenceEntityId: enrollment.id,
        })
        .catch((err) => {
          this.logger.warn(`Failed to dispatch teacher notification for course subscription`, err);
        });
    }

    // Broadcast instant realtime push to teacher's subscription dashboard
    this.realtimeGateway?.notifyCourseSubscriptionsChanged([
      course.teacherId,
      course.teacher?.user?.id,
    ]);

    return {
      enrollmentId: enrollment.id,
      courseId,
      studentId: resolvedStudentId,
      status: CourseEnrollmentStatus.PENDING,
      message: 'تم إرسال طلب الاشتراك وإيصال التحويل بنجاح! سيتم مراجعة المعلم وتفعيل الكورس.',
    };
  }

  /**
   * Retrieves pending subscription requests with receipts for teacher / secretariat review.
   */
  async getPendingEnrollmentRequests(courseId: string, user: AuthenticatedUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true, title: true, price: true },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (
      user.role === UserRole.TEACHER &&
      course.teacherId !== user.teacherProfileId &&
      course.teacherId !== user.id
    ) {
      throw new ForbiddenException('Not authorized to review enrollments for this course');
    }

    const pendingEnrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        courseId,
        status: CourseEnrollmentStatus.PENDING,
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return pendingEnrollments.map((e) => ({
      enrollmentId: e.id,
      courseId: e.courseId,
      studentId: e.studentId,
      fullName: e.student.user.fullName,
      studentCode: e.student.studentCode,
      phone: e.student.user.phone,
      parentPhone: e.student.emergencyPhone,
      senderPhone: e.senderPhone,
      transferAmount: e.transferAmount ? Number(e.transferAmount) : Number(course.price),
      receiptImageUrl: e.receiptImageUrl,
      paymentMethod: e.paymentMethod,
      enrolledAt: e.enrolledAt,
      status: e.status,
    }));
  }

  /**
   * Retrieves all subscription applications (pending with receipts and active enrolled students)
   * across all courses belonging to the authenticated teacher.
   */
  async getTeacherSubscriptions(user: AuthenticatedUser) {
    const teacherProfileId = user.teacherProfileId || user.id;

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        course: { teacherId: teacherProfileId },
      },
      include: {
        course: { select: { id: true, title: true, price: true, gradeLevel: true, subject: true } },
        student: {
          include: {
            user: { select: { id: true, fullName: true, phone: true, email: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const pendingRequests = enrollments
      .filter((e) => e.status === CourseEnrollmentStatus.PENDING)
      .map((e) => ({
        enrollmentId: e.id,
        courseId: e.courseId,
        courseName: e.course.title,
        coursePrice: Number(e.course.price),
        studentId: e.studentId,
        studentName: e.student?.user?.fullName || 'طالب',
        studentCode: e.student?.studentCode || '',
        studentPhone: e.student?.user?.phone || '',
        senderPhone: e.senderPhone || e.student?.user?.phone || '',
        transferAmount: e.transferAmount ? Number(e.transferAmount) : Number(e.course.price),
        receiptImageUrl: e.receiptImageUrl || null,
        paymentMethod: e.paymentMethod,
        date: e.enrolledAt ? new Date(e.enrolledAt).toISOString().split('T')[0] : '',
        enrolledAt: e.enrolledAt,
        status: e.status,
      }));

    const activeStudents = enrollments
      .filter((e) => e.status === CourseEnrollmentStatus.ACTIVE)
      .map((e) => ({
        enrollmentId: e.id,
        courseId: e.courseId,
        courseName: e.course.title,
        coursePrice: Number(e.course.price),
        studentId: e.studentId,
        studentName: e.student?.user?.fullName || 'طالب',
        studentCode: e.student?.studentCode || '',
        studentPhone: e.student?.user?.phone || '',
        senderPhone: e.senderPhone || e.student?.user?.phone || '',
        transferAmount: e.transferAmount ? Number(e.transferAmount) : Number(e.course.price),
        receiptImageUrl: e.receiptImageUrl || null,
        paymentMethod: e.paymentMethod,
        date: e.enrolledAt ? new Date(e.enrolledAt).toISOString().split('T')[0] : '',
        enrolledAt: e.enrolledAt,
        status: e.status,
      }));

    return {
      pendingRequests,
      activeStudents,
      counts: {
        pending: pendingRequests.length,
        active: activeStudents.length,
      },
    };
  }

  /**
   * Approves a student's subscription request, activating the enrollment and CourseAccess.
   */
  async approveSubscriptionRequest(enrollmentId: string, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.courseEnrollment.findUnique({
        where: { id: enrollmentId },
        include: { course: true, student: { include: { user: true } } },
      });

      if (!enrollment) {
        throw new NotFoundException(`Enrollment request [${enrollmentId}] not found`);
      }

      if (
        user.role === UserRole.TEACHER &&
        enrollment.course.teacherId !== user.teacherProfileId &&
        enrollment.course.teacherId !== user.id
      ) {
        throw new ForbiddenException('Not authorized to approve this course enrollment');
      }

      const updatedEnrollment = await tx.courseEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: CourseEnrollmentStatus.ACTIVE,
          reviewedAt: new Date(),
          reviewedById: user.id,
          rejectionReason: null,
        },
      });

      const access = await tx.courseAccess.upsert({
        where: { enrollmentId: enrollment.id },
        create: {
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          accessStatus: CourseAccessStatus.ACTIVE,
          validFrom: new Date(),
          grantedById: user.id,
        },
        update: {
          accessStatus: CourseAccessStatus.ACTIVE,
          validFrom: new Date(),
          grantedById: user.id,
        },
      });

      this.logger.log(
        `Approved enrollment [${enrollmentId}] for student [${enrollment.studentId}] in course [${enrollment.courseId}]`,
      );

      // Notify student of approval
      if (this.notificationsService && enrollment.student?.user?.id) {
        this.notificationsService
          .sendNotification({
            recipientId: enrollment.student.user.id,
            notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
            type: 'COURSE_SUBSCRIPTION_APPROVED',
            title: `تمت الموافقة على اشتراكك في الكورس 🎉`,
            body: `تم تفعيل اشتراكك في كورس "${enrollment.course.title}" بنجاح! يمكنك الآن مشاهدة جميع الدروس والبدء في المذاكرة.`,
            channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
            data: {
              courseId: enrollment.courseId,
              enrollmentId: enrollment.id,
            },
            referenceEntityId: enrollment.id,
          })
          .catch((err) => {
            this.logger.warn(`Failed to dispatch student approval notification`, err);
          });
      }

      this.realtimeGateway?.notifyCourseSubscriptionsChanged([
        enrollment.course.teacherId,
        enrollment.student?.user?.id,
      ]);

      return {
        enrollmentId: updatedEnrollment.id,
        courseId: updatedEnrollment.courseId,
        studentId: updatedEnrollment.studentId,
        status: updatedEnrollment.status,
        accessStatus: access.accessStatus,
        message: 'تم قبول وتفعيل اشتراك الطالب بنجاح',
      };
    });
  }

  /**
   * Rejects a student's subscription request with optional rejection reason.
   */
  async rejectSubscriptionRequest(
    enrollmentId: string,
    user: AuthenticatedUser,
    dto: RejectSubscriptionRequestDto,
  ) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true, student: { include: { user: true } } },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment request [${enrollmentId}] not found`);
    }

    if (
      user.role === UserRole.TEACHER &&
      enrollment.course.teacherId !== user.teacherProfileId &&
      enrollment.course.teacherId !== user.id
    ) {
      throw new ForbiddenException('Not authorized to reject this course enrollment');
    }

    const updated = await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: CourseEnrollmentStatus.DROPPED,
        rejectionReason:
          dto.rejectionReason || 'تم رفض طلب الاشتراك أو لم يتم التحقق من صحة الإيصال.',
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
    });

    // Revoke any existing access
    await this.prisma.courseAccess.updateMany({
      where: { enrollmentId },
      data: { accessStatus: CourseAccessStatus.SUSPENDED },
    });

    // Notify student of rejection with reason
    if (this.notificationsService && enrollment.student?.user?.id) {
      this.notificationsService
        .sendNotification({
          recipientId: enrollment.student.user.id,
          notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
          type: 'COURSE_SUBSCRIPTION_REJECTED',
          title: `تم رفض طلب الاشتراك في الكورس`,
          body: `نأسف، تم رفض طلب اشتراكك في كورس "${enrollment.course.title}". السبب: ${updated.rejectionReason}`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
          data: {
            courseId: enrollment.courseId,
            enrollmentId: enrollment.id,
            rejectionReason: updated.rejectionReason,
          },
          referenceEntityId: enrollment.id,
        })
        .catch((err) => {
          this.logger.warn(`Failed to dispatch student rejection notification`, err);
        });
    }

    this.realtimeGateway?.notifyCourseSubscriptionsChanged([
      enrollment.course.teacherId,
      enrollment.student?.user?.id,
    ]);

    return {
      enrollmentId: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      message: 'تم رفض طلب الاشتراك.',
    };
  }

  /**
   * Cancels/revokes an active student's enrollment and suspends course access.
   */
  async cancelStudentSubscription(
    enrollmentId: string,
    user: AuthenticatedUser,
    reason?: string,
  ) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true, student: { include: { user: true } } },
    });

    if (!enrollment) {
      throw new NotFoundException(`اشتراك الطالب [${enrollmentId}] غير موجود`);
    }

    if (
      user.role === UserRole.TEACHER &&
      enrollment.course.teacherId !== user.teacherProfileId &&
      enrollment.course.teacherId !== user.id
    ) {
      throw new ForbiddenException('غير مصرح لك بإلغاء هذا الاشتراك');
    }

    const updated = await this.prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: CourseEnrollmentStatus.DROPPED,
        rejectionReason: reason || 'تم إلغاء الاشتراك في الكورس من قبل المعلم.',
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
    });

    // Suspend course access
    await this.prisma.courseAccess.updateMany({
      where: { enrollmentId },
      data: { accessStatus: CourseAccessStatus.SUSPENDED },
    });

    // Reset student course progress so that if they re-enroll they start from zero
    await this.prisma.courseProgress.deleteMany({
      where: {
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
      },
    });

    // Reset student's submissions on any quizzes/exams attached to this course
    const [courseRecord, unitQuizzes, lessonQuizzes] = await Promise.all([
      this.prisma.course.findUnique({
        where: { id: enrollment.courseId },
        select: { courseQuizId: true },
      }),
      this.prisma.courseModule.findMany({
        where: { courseId: enrollment.courseId, unitQuizId: { not: null } },
        select: { unitQuizId: true },
      }),
      this.prisma.courseLesson.findMany({
        where: { module: { courseId: enrollment.courseId }, lessonQuizId: { not: null } },
        select: { lessonQuizId: true },
      }),
    ]);

    const quizIds: string[] = [
      ...(courseRecord?.courseQuizId ? [courseRecord.courseQuizId] : []),
      ...unitQuizzes.map((u) => u.unitQuizId as string),
      ...lessonQuizzes.map((l) => l.lessonQuizId as string),
    ];

    if (quizIds.length > 0) {
      await this.prisma.assessmentSubmission.deleteMany({
        where: {
          assessmentId: { in: quizIds },
          studentId: enrollment.studentId,
        },
      });
    }

    // Notify student
    if (this.notificationsService && enrollment.student?.user?.id) {
      this.notificationsService
        .sendNotification({
          recipientId: enrollment.student.user.id,
          notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
          type: 'COURSE_SUBSCRIPTION_CANCELLED',
          title: `تم إلغاء اشتراكك في الكورس`,
          body: `تم إلغاء اشتراكك في كورس "${enrollment.course.title}" من قبل المعلم.${reason ? ` السبب: ${reason}` : ''}`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
          data: {
            courseId: enrollment.courseId,
            enrollmentId: enrollment.id,
            reason: updated.rejectionReason,
          },
          referenceEntityId: enrollment.id,
        })
        .catch((err) => {
          this.logger.warn(`Failed to dispatch student cancellation notification`, err);
        });
    }

    this.realtimeGateway?.notifyCourseSubscriptionsChanged([
      enrollment.course.teacherId,
      enrollment.student?.user?.id,
    ]);

    return {
      enrollmentId: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      message: 'تم إلغاء اشتراك الطالب وتعليق وصوله للكورس بنجاح.',
    };
  }

  /**
   * Gets the student's enrollment and subscription review status for a course.
   */
  async getStudentCourseSubscriptionStatus(courseId: string, studentId: string) {
    let student = await this.prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) {
      student = await this.prisma.studentProfile.findFirst({ where: { user: { id: studentId } } });
    }
    if (!student) {
      return { isEnrolled: false, status: null };
    }

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId: student.id,
        },
      },
      include: { access: true },
    });

    if (!enrollment) {
      return { isEnrolled: false, status: null };
    }

    return {
      isEnrolled:
        enrollment.status === CourseEnrollmentStatus.ACTIVE &&
        enrollment.access?.accessStatus === CourseAccessStatus.ACTIVE,
      status: enrollment.status,
      senderPhone: enrollment.senderPhone,
      transferAmount: enrollment.transferAmount ? Number(enrollment.transferAmount) : null,
      receiptImageUrl: enrollment.receiptImageUrl,
      rejectionReason: enrollment.rejectionReason,
      enrolledAt: enrollment.enrolledAt,
      reviewedAt: enrollment.reviewedAt,
    };
  }

  /**
   * Retrieves all courses enrolled by the student with dynamic progress completion percentages.
   */
  async getMyCourses(studentId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        studentId,
        status: {
          in: [
            CourseEnrollmentStatus.ACTIVE,
            CourseEnrollmentStatus.PENDING,
            CourseEnrollmentStatus.DROPPED,
          ],
        },
      },
      include: {
        course: {
          include: {
            teacher: {
              include: { user: { select: { fullName: true } } },
            },
            _count: { select: { modules: true } },
          },
        },
        access: true,
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const results = await Promise.all(
      enrollments.map(async (e) => {
        const isActive = e.status === CourseEnrollmentStatus.ACTIVE;
        const progressPercentage = isActive
          ? await this.progressRepository.calculateCourseProgressPercentage(
              studentId,
              e.courseId,
            )
          : 0;

        const totalLessons = await this.prisma.courseLesson.count({
          where: { module: { courseId: e.courseId } },
        });

        const completedLessons = isActive
          ? await this.prisma.courseProgress.count({
              where: {
                studentId,
                isCompleted: true,
                lesson: { module: { courseId: e.courseId } },
              },
            })
          : 0;

        const isCompleted = isActive && totalLessons > 0 && progressPercentage >= 100;

        // Compute certificate eligibility (all lessons AND all quizzes completed)
        let isCertificateEligible = false;
        if (isActive && progressPercentage >= 100 && totalLessons > 0) {
          const [courseRecord, unitQuizzes, lessonQuizzes] = await Promise.all([
            this.prisma.course.findUnique({
              where: { id: e.courseId },
              select: { courseQuizId: true, requireExamPassingToUnlock: true, hasCertificate: true },
            }),
            this.prisma.courseModule.findMany({
              where: { courseId: e.courseId, unitQuizId: { not: null } },
              select: { unitQuizId: true },
            }),
            this.prisma.courseLesson.findMany({
              where: { module: { courseId: e.courseId }, lessonQuizId: { not: null } },
              select: { lessonQuizId: true },
            }),
          ]);

          if (courseRecord?.hasCertificate !== false) {
            const quizIds = [
              ...(courseRecord?.courseQuizId ? [courseRecord.courseQuizId] : []),
              ...unitQuizzes.map((u) => u.unitQuizId as string),
              ...lessonQuizzes.map((l) => l.lessonQuizId as string),
            ];

            if (quizIds.length === 0) {
              isCertificateEligible = true;
            } else {
              const assessments = await this.prisma.assessment.findMany({
                where: { id: { in: quizIds } },
                select: { id: true, passingScore: true },
              });

              const submissions = await this.prisma.assessmentSubmission.findMany({
                where: {
                  assessmentId: { in: quizIds },
                  studentId,
                  status: { in: ['SUBMITTED', 'GRADED'] },
                },
                select: { assessmentId: true, scoreObtained: true },
              });

              let allSatisfied = true;
              for (const ass of assessments) {
                const studentSubs = submissions.filter((s) => s.assessmentId === ass.id);
                if (studentSubs.length === 0) {
                  allSatisfied = false;
                  break;
                }
                const mustPass = (ass as any).requirePassingScore !== undefined
                  ? Boolean((ass as any).requirePassingScore)
                  : Boolean(courseRecord?.requireExamPassingToUnlock);
                if (mustPass && ass.passingScore != null) {
                  const passed = studentSubs.some(
                    (s) => s.scoreObtained != null && Number(s.scoreObtained) >= Number(ass.passingScore),
                  );
                  if (!passed) {
                    allSatisfied = false;
                    break;
                  }
                }
              }
              isCertificateEligible = allSatisfied;
            }
          }
        }

        return {
          courseId: e.course.id,
          id: e.course.id,
          title: e.course.title,
          description: e.course.description,
          subject: e.course.subject,
          gradeLevel: e.course.gradeLevel,
          coverImageUrl: e.course.coverImageUrl,
          teacherName: e.course.teacher.user.fullName,
          enrolledAt: e.enrolledAt,
          enrollmentStatus: e.status,
          rejectionReason: e.rejectionReason,
          accessStatus:
            e.access?.accessStatus ||
            (isActive ? CourseAccessStatus.ACTIVE : CourseAccessStatus.SUSPENDED),
          totalModules: e.course._count.modules,
          totalLessons,
          completedLessons,
          progressPercentage,
          isCompleted,
          isCertificateEligible,
        };
      }),
    );

    return results;
  }

  /**
   * Secure Lesson Viewer:
   * 1. Verifies preview flag, active access entitlement, or teacher ownership.
   * 2. Issues signed time-limited Bunny Stream DRM HLS URLs or Cloudflare R2 download links.
   * 3. Returns student resume position, attachments, summary, and linked quiz.
   */
  async getLessonViewer(lessonId: string, user: AuthenticatedUser) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        attachments: true,
        lessonQuiz: {
          select: { id: true, title: true, type: true, totalScore: true, durationMinutes: true, passingScore: true, allowMultipleAttempts: true, isOptional: true, requirePassingScore: true },
        },
        assessments: {
          select: { id: true, title: true, type: true, assessmentType: true, totalScore: true, durationMinutes: true, passingScore: true, allowMultipleAttempts: true, isPublished: true, isOptional: true, requirePassingScore: true },
        },
        module: {
          include: {
            unitQuiz: {
              select: { id: true, title: true, type: true, totalScore: true, durationMinutes: true, passingScore: true, allowMultipleAttempts: true, isOptional: true, requirePassingScore: true },
            },
            course: {
              include: {
                teacher: {
                  include: { user: { select: { fullName: true } } },
                },
                courseQuiz: {
                  select: { id: true, title: true, type: true, totalScore: true, durationMinutes: true, passingScore: true, allowMultipleAttempts: true, isOptional: true, requirePassingScore: true },
                },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }

    const course = lesson.module.course;
    const studentId = user.studentProfileId || user.id;

    // Authorization verification
    let isAuthorized = false;

    if (lesson.isPreview) {
      isAuthorized = true;
    } else if (
      user.role === UserRole.TEACHER &&
      (course.teacherId === user.teacherProfileId || course.teacherId === user.id)
    ) {
      isAuthorized = true;
    } else if (user.role === UserRole.SECRETARIAT) {
      isAuthorized = true;
    } else if (user.role === UserRole.STUDENT || user.studentProfileId) {
      const access = await this.prisma.courseAccess.findFirst({
        where: {
          courseId: course.id,
          studentId,
          accessStatus: CourseAccessStatus.ACTIVE,
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        },
      });

      if (access) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const pendingEnrollment = await this.prisma.courseEnrollment.findFirst({
        where: {
          courseId: course.id,
          studentId,
          status: CourseEnrollmentStatus.PENDING,
        },
      });

      if (pendingEnrollment) {
        throw new ForbiddenException(
          'طلب اشتراكك في الكورس وإيصال التحويل قيد المراجعة حالياً من قبل المعلم. سيتم تفعيل الكورس فور تأكيد التحويل ⏳',
        );
      }

      throw new ForbiddenException(
        'Active course enrollment or entitlement is required to access this lesson material',
      );
    }

    // Media Token / Signed URLs Generation
    let videoPlayerUrl: string | null = null;
    let documentDownloadUrl: string | null = null;

    if (lesson.lessonType === 'VIDEO' && lesson.bunnyVideoId) {
      videoPlayerUrl = await this.bunnyVideoService.generateSecurePlaybackUrl(
        lesson.bunnyVideoId,
        7200, // 2 hours
      );
    }

    if (lesson.lessonType === 'DOCUMENT' && lesson.contentUrl) {
      documentDownloadUrl = await this.storageService.generatePresignedDownloadUrl(
        lesson.contentUrl,
        3600, // 1 hour
      );
    }

    // Retrieve Student's existing playback progress
    let lastPositionSeconds = 0;
    let isCompleted = false;

    if (user.role === UserRole.STUDENT || user.studentProfileId) {
      const progress = await this.prisma.courseProgress.findUnique({
        where: {
          lessonId_studentId: {
            lessonId: lesson.id,
            studentId,
          },
        },
      });

      if (progress) {
        lastPositionSeconds = progress.lastPositionSeconds;
        isCompleted = progress.isCompleted;
      }
    }

    // Enrich the quiz cards with the student's official (highest) submission so the
    // lesson-viewer renders the final mark from this payload directly.
    const quizViewerStudentId =
      user.role === UserRole.STUDENT || user.studentProfileId ? studentId : null;
    const homeworkAssessment = lesson.assessments?.find(
      (a) => a.type === 'ASSIGNMENT' || a.type === 'HOMEWORK' || a.assessmentType === 'HOMEWORK',
    );
    const [lessonQuiz, unitQuiz, courseQuiz, lessonHomework] = await Promise.all([
      this.attachStudentSubmission(lesson.lessonQuiz, quizViewerStudentId),
      this.attachStudentSubmission(lesson.module.unitQuiz, quizViewerStudentId),
      this.attachStudentSubmission(course.courseQuiz, quizViewerStudentId),
      this.attachStudentSubmission(homeworkAssessment || null, quizViewerStudentId),
    ]);

    return {
      lessonId: lesson.id,
      moduleId: lesson.moduleId,
      courseId: course.id,
      courseTitle: course.title,
      title: lesson.title,
      description: lesson.description,
      summary: lesson.summary,
      lessonType: lesson.lessonType,
      isPreview: lesson.isPreview,
      videoDurationSeconds: lesson.videoDurationSeconds,
      videoPlayerUrl,
      documentDownloadUrl,
      attachments: lesson.attachments,
      lessonQuiz,
      lessonHomework,
      unitQuiz,
      courseQuiz,
      assessments: lesson.assessments,
      lastPositionSeconds,
      isCompleted,
    };
  }

  /**
   * Real-time heartbeat lesson progress updater.
   */
  async updateLessonProgress(
    user: AuthenticatedUser,
    lessonId: string,
    dto: UpdateProgressDto,
  ) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }

    const courseId = lesson.module.courseId;
    const studentId = user.studentProfileId || (user.role === UserRole.STUDENT ? user.id : null);

    // If teacher/secretariat previewing or student profile is absent, return graceful preview response
    if (!studentId) {
      return {
        lessonId,
        courseId,
        lastPositionSeconds: dto.lastPositionSeconds || 0,
        isCompleted: dto.isCompleted || false,
        overallCourseCompletionPercentage: dto.isCompleted ? 100 : 0,
        lastSyncedAt: new Date(),
      };
    }

    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [
          ...(studentId ? [{ id: studentId }] : []),
          ...(user.id ? [{ id: user.id }] : []),
        ],
      },
    });

    const targetStudentId = studentProfile?.id || studentId;

    // Enforce that lessons with linked quizzes CANNOT be marked complete without quiz submission (and passing if required)
    let isCompletedToSave = dto.isCompleted || false;
    if (isCompletedToSave && lesson.lessonQuizId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { requireExamPassingToUnlock: true, enforceSequentialLessons: true },
      });

      const assessment = await this.prisma.assessment.findUnique({
        where: { id: lesson.lessonQuizId },
        select: { passingScore: true, requirePassingScore: true },
      });

      const quizSubmissions = await this.prisma.assessmentSubmission.findMany({
        where: {
          assessmentId: lesson.lessonQuizId,
          studentId: targetStudentId,
        },
        select: { status: true, scoreObtained: true },
      });

      const hasSubmittedQuiz = quizSubmissions.some(
        (s) => s.status === 'SUBMITTED' || s.status === 'GRADED',
      );

      if (!hasSubmittedQuiz) {
        // Demote completion to false until quiz is submitted
        isCompletedToSave = false;
      } else {
        const mustPass = assessment?.requirePassingScore !== undefined
          ? Boolean(assessment.requirePassingScore)
          : Boolean(course?.requireExamPassingToUnlock);
        if (mustPass && assessment?.passingScore != null) {
          const hasPassedQuiz = quizSubmissions.some(
            (s) => s.scoreObtained != null && Number(s.scoreObtained) >= Number(assessment.passingScore),
          );
          if (!hasPassedQuiz) {
            isCompletedToSave = false;
          }
        }
      }
    }

    const progress = await this.progressRepository.upsertRealtimeProgress(
      targetStudentId,
      lessonId,
      courseId,
      dto.lastPositionSeconds,
      isCompletedToSave,
    );

    const overallCourseCompletionPercentage =
      await this.progressRepository.calculateCourseProgressPercentage(
        targetStudentId,
        courseId,
      );

    return {
      lessonId,
      courseId,
      lastPositionSeconds: progress.lastPositionSeconds,
      isCompleted: progress.isCompleted,
      overallCourseCompletionPercentage,
      lastSyncedAt: progress.lastSyncedAt,
    };
  }

  /**
   * Delegates offline batch intake to CourseProgressRepository after validating lesson-course integrity and student entitlements.
   */
  async applyMonotonicProgressBatch(
    studentId: string,
    items: SyncProgressItemDto[],
  ): Promise<SyncBatchResult> {
    if (!items || items.length === 0) {
      return {
        syncedCount: 0,
        processedOperationIds: [],
        courseId: '',
        overallCourseCompletionPercentage: 0,
      };
    }

    const lessonIds = items.map((i) => i.lessonId);
    const validLessons = await this.prisma.courseLesson.findMany({
      where: { id: { in: lessonIds } },
      include: { module: true },
    });

    const validLessonMap = new Map<string, string>();
    validLessons.forEach((l) => validLessonMap.set(l.id, l.module.courseId));

    const enrichedItems = items
      .filter((i) => validLessonMap.has(i.lessonId))
      .map((i) => ({
        ...i,
        courseId: validLessonMap.get(i.lessonId)!,
      }));

    return this.progressRepository.syncBatch(studentId, enrichedItems);
  }

  /**
   * Generates DRM signed playback and embed tokens for secure video playback with anti-piracy validation.
   */
  async getLessonStreamAuth(lessonId: string, user: AuthenticatedUser) {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                groupAccess: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson [${lessonId}] not found`);
    }

    const course = lesson.module.course;
    const isTeacherOrSecretariat =
      user.role === UserRole.TEACHER ||
      user.role === UserRole.SECRETARIAT;

    let isAuthorized = isTeacherOrSecretariat || lesson.isPreview;

    let studentProfile: any = null;
    if (user.role === UserRole.STUDENT) {
      const studentId = user.studentProfileId || user.id;
      studentProfile = await this.prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: { user: true, groupEnrollments: true },
      });

      if (!isAuthorized && studentProfile) {
        // 1. Direct enrollment check
        const enrollment = await this.prisma.courseEnrollment.findUnique({
          where: {
            courseId_studentId: {
              courseId: course.id,
              studentId: studentProfile.id,
            },
          },
        });

        if (enrollment && enrollment.status === CourseEnrollmentStatus.ACTIVE) {
          isAuthorized = true;
        } else {
          // 2. Physical group batch access check
          const studentGroupIds = studentProfile.groupEnrollments?.map((g: any) => g.groupId) || [];
          const courseGroupIds = course.groupAccess?.map((ga) => ga.groupId) || [];
          const hasMatchingGroup = studentGroupIds.some((gid: string) => courseGroupIds.includes(gid));
          if (hasMatchingGroup) {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException('يجب الاشتراك في هذا الكورس أولاً لمشاهدة شرح هذا الدرس');
    }

    const videoId = lesson.bunnyVideoId || lesson.contentUrl || '';
    let embedUrl = '';
    let playbackUrl = '';
    let videoStatus: 'READY' | 'PROCESSING' | 'ERROR' = 'READY';

    if (videoId) {
      try {
        const details = await this.bunnyVideoService.getVideoDetails(videoId);
        if (details.status === 0 || details.status === 1 || details.status === 2 || details.status === 3) {
          videoStatus = 'PROCESSING';
        } else if (details.status === 5) {
          videoStatus = 'ERROR';
        } else {
          videoStatus = 'READY';
        }
      } catch {
        // Fallback: default to READY if status check not available or in test env
        videoStatus = 'READY';
      }

      playbackUrl = this.bunnyVideoService.generateSecurePlaybackUrl(videoId);
      embedUrl = this.bunnyVideoService.getEmbedUrl(videoId);
    }

    const watermark = {
      studentName: studentProfile?.user?.fullName || user.email || 'طالب مسجل',
      studentPhone: studentProfile?.user?.phone || user.phone || '',
      studentCode: studentProfile?.studentCode || user.id.slice(0, 8),
    };

    return {
      lessonId: lesson.id,
      courseId: course.id,
      title: lesson.title,
      videoId,
      videoStatus,
      libraryId: this.bunnyVideoService.getLibraryId(),
      embedUrl,
      playbackUrl,
      isPreview: lesson.isPreview,
      watermark,
    };
  }

  /**
   * Retrieves all enrolled students for a specific course.
   */
  async getCourseEnrollments(courseId: string, teacherId: string, isSecretariat: boolean) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true, title: true },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to view enrollments for this course');
    }

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { courseId },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
            groupEnrollments: {
              include: {
                group: {
                  select: { id: true, name: true, gradeLevel: true },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments.map((e) => ({
      id: e.id,
      studentId: e.studentId,
      studentCode: e.student.studentCode,
      fullName: e.student.user.fullName,
      phone: e.student.user.phone,
      gradeLevel: e.student.gradeLevel,
      status: e.status,
      enrolledAt: e.enrolledAt,
      groups: e.student.groupEnrollments.map((g) => g.group.name),
    }));
  }

  /**
   * Bulk enrolls a list of student IDs into a course.
   */
  async enrollStudentsBatch(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: EnrollStudentsBatchDto,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage enrollments for this course');
    }

    const { studentIds } = dto;
    if (!studentIds || studentIds.length === 0) {
      throw new BadRequestException('يجب تحديد طالب واحد على الأقل للضم');
    }

    const results = await this.prisma.$transaction(async (tx) => {
      const createdEnrollments = [];
      for (const studentId of studentIds) {
        const enrollment = await tx.courseEnrollment.upsert({
          where: {
            courseId_studentId: {
              courseId,
              studentId,
            },
          },
          update: {
            status: CourseEnrollmentStatus.ACTIVE,
          },
          create: {
            courseId,
            studentId,
            status: CourseEnrollmentStatus.ACTIVE,
          },
        });

        await tx.courseAccess.upsert({
          where: { enrollmentId: enrollment.id },
          update: { accessStatus: CourseAccessStatus.ACTIVE },
          create: {
            enrollmentId: enrollment.id,
            studentId,
            courseId,
            accessStatus: CourseAccessStatus.ACTIVE,
          },
        });

        createdEnrollments.push(enrollment);
      }
      return createdEnrollments;
    });

    return {
      success: true,
      enrolledCount: results.length,
      message: `تم ضم ${results.length} طالب إلى الكورس بنجاح`,
    };
  }

  /**
   * Creates a new student and enrolls them into the course immediately.
   */
  async createAndEnrollStudent(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: CreateAndEnrollStudentDto,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage enrollments for this course');
    }

    const studentPhone = normalizeEgyptianPhone(dto.phone);
    const parentPhone = normalizeEgyptianPhone(dto.parentPhone);

    const generatedPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Check existing user by phone
      let user = await tx.user.findFirst({
        where: { phone: studentPhone },
        include: { studentProfile: true },
      });

      let studentProfile = user?.studentProfile;

      if (!user) {
        const studentCode = await generateUniqueStudentCode(tx);
        const qrCodeToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

        user = await tx.user.create({
          data: {
            fullName: dto.fullName.trim(),
            phone: studentPhone,
            passwordHash,
            role: UserRole.STUDENT,
            isActive: true,
            studentProfile: {
              create: {
                studentCode,
                qrCodeToken,
                gradeLevel: dto.gradeLevel || course.gradeLevel,
                academicStage: dto.academicStage || course.academicStage || 'SECONDARY',
                emergencyPhone: parentPhone,
              },
            },
          },
          include: { studentProfile: true },
        });

        studentProfile = user.studentProfile;
      }

      if (!studentProfile) {
        throw new BadRequestException('تعذر إنشاء ملف الطالب الأكاديمي');
      }

      // If group specified, enroll in group
      if (dto.groupId) {
        await tx.groupEnrollment.upsert({
          where: {
            groupId_studentId: {
              groupId: dto.groupId,
              studentId: studentProfile.id,
            },
          },
          update: {},
          create: {
            groupId: dto.groupId,
            studentId: studentProfile.id,
          },
        });
      }

      // 2. Enroll in course
      const enrollment = await tx.courseEnrollment.upsert({
        where: {
          courseId_studentId: {
            courseId,
            studentId: studentProfile.id,
          },
        },
        update: { status: CourseEnrollmentStatus.ACTIVE },
        create: {
          courseId,
          studentId: studentProfile.id,
          status: CourseEnrollmentStatus.ACTIVE,
        },
      });

      await tx.courseAccess.upsert({
        where: { enrollmentId: enrollment.id },
        update: { accessStatus: CourseAccessStatus.ACTIVE },
        create: {
          enrollmentId: enrollment.id,
          studentId: studentProfile.id,
          courseId,
          accessStatus: CourseAccessStatus.ACTIVE,
        },
      });

      return {
        studentId: studentProfile.id,
        studentCode: studentProfile.studentCode,
        fullName: user.fullName,
        phone: user.phone,
        generatedPassword,
        enrollmentId: enrollment.id,
      };
    });

    return {
      success: true,
      student: result,
      message: 'تم تسجيل الطالب وضمّه إلى الكورس بنجاح',
    };
  }

  /**
   * Enrolls a student into a course using their scanned QR code token or student code.
   */
  async enrollByQrToken(
    courseId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: EnrollByQrDto,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage enrollments for this course');
    }

    const trimmedToken = dto.qrToken?.trim();
    if (!trimmedToken) {
      throw new BadRequestException('رمز الـ QR مطلوب');
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedToken);

    // Try parsing JSON payload if present (e.g. { type: 'STUDENT_QR', studentId: '...' })
    let parsedStudentId: string | null = null;
    let parsedToken: string | null = null;
    try {
      if (trimmedToken.startsWith('{') && trimmedToken.endsWith('}')) {
        const json = JSON.parse(trimmedToken);
        if (json.studentId) parsedStudentId = json.studentId;
        if (json.token) parsedToken = json.token;
      }
    } catch {
      // Not JSON
    }

    const student = await this.prisma.studentProfile.findFirst({
      where: {
        OR: [
          { qrCodeToken: trimmedToken },
          { studentCode: trimmedToken },
          ...(isUuid ? [{ id: trimmedToken }] : []),
          ...(parsedStudentId ? [{ id: parsedStudentId }] : []),
          ...(parsedToken ? [{ qrCodeToken: parsedToken }] : []),
        ],
      },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('لم يتم العثور على طالب مطابق لرمز الـ QR الممسوح');
    }

    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: {
        courseId_studentId: {
          courseId,
          studentId: student.id,
        },
      },
      update: { status: CourseEnrollmentStatus.ACTIVE },
      create: {
        courseId,
        studentId: student.id,
        status: CourseEnrollmentStatus.ACTIVE,
      },
    });

    await this.prisma.courseAccess.upsert({
      where: { enrollmentId: enrollment.id },
      update: { accessStatus: CourseAccessStatus.ACTIVE },
      create: {
        enrollmentId: enrollment.id,
        studentId: student.id,
        courseId,
        accessStatus: CourseAccessStatus.ACTIVE,
      },
    });

    return {
      success: true,
      student: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.user.fullName,
        phone: student.user.phone,
        gradeLevel: student.gradeLevel,
      },
      message: `تم ضم الطالب ${student.user.fullName} إلى الكورس بنجاح عبر الـ QR`,
    };
  }

  /**
   * Revokes student enrollment from a course.
   */
  async revokeStudentEnrollment(
    courseId: string,
    studentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course [${courseId}] not found`);
    }

    if (!isSecretariat && course.teacherId !== teacherId) {
      throw new ForbiddenException('You do not have permission to manage enrollments for this course');
    }

    await this.prisma.courseEnrollment.deleteMany({
      where: {
        courseId,
        studentId,
      },
    });

    return {
      success: true,
      message: 'تم إلغاء اشتراك الطالب في هذا الكورس بنجاح',
    };
  }
}
