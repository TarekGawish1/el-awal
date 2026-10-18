import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { BunnyVideoService } from '../../../integrations/video/bunny-video.service';
import { StorageService } from '../../../integrations/storage/storage.service';
import { CourseVideoService } from './course-video.service';
import { CourseQueryService } from './course-query.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { CourseAccessStatus, CourseEnrollmentStatus, UserRole } from '@prisma/client';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class CourseViewerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bunnyVideoService: BunnyVideoService,
    private readonly storageService: StorageService,
    private readonly videoService: CourseVideoService,
    private readonly queryService: CourseQueryService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Secure Lesson Viewer:
   * 1. Verifies preview flag, active access entitlement, or teacher ownership.
   * 2. Issues signed time-limited Bunny Stream DRM HLS URLs or Cloudflare R2 download links.
   * 3. Returns student resume position, attachments, summary, and linked quiz.
   */
  async getLessonViewer(lessonId: string, user: AuthenticatedUser) {
    const fetchLesson = async () => {
      return this.prisma.courseLesson.findUnique({
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
    };

    const lesson = this.redisCache
      ? await this.redisCache.getOrSet(`course:lesson_viewer:${lessonId}`, fetchLesson, 60)
      : await fetchLesson();

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
      const accessCacheKey = `student:access:${course.id}:${studentId}`;
      let hasAccess = this.redisCache ? await this.redisCache.get<boolean>(accessCacheKey) : null;
      if (hasAccess === true) {
        isAuthorized = true;
      } else {
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
          if (this.redisCache) {
            await this.redisCache.set(accessCacheKey, true, 60);
          }
        }
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

    let videoPlayerUrl: string | null = null;
    let documentDownloadUrl: string | null = null;

    const resolvedViewerVideoId = this.videoService.resolveLessonVideoId(lesson as any);
    if (lesson.lessonType === 'VIDEO' && resolvedViewerVideoId) {
      videoPlayerUrl = await this.bunnyVideoService.generateSecurePlaybackUrl(
        resolvedViewerVideoId,
        7200, // 2 hours
      );
    }

    if (lesson.lessonType === 'DOCUMENT' && lesson.contentUrl) {
      if (!this.videoService.isBunnyEmbedUrl(lesson.contentUrl)) {
        documentDownloadUrl = await this.storageService.generatePresignedDownloadUrl(
          lesson.contentUrl,
          3600, // 1 hour
        );
      } else if (resolvedViewerVideoId) {
        videoPlayerUrl = await this.bunnyVideoService.generateSecurePlaybackUrl(
          resolvedViewerVideoId,
          7200,
        );
      }
    }

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

    const quizViewerStudentId =
      user.role === UserRole.STUDENT || user.studentProfileId ? studentId : null;
    const homeworkAssessment = lesson.assessments?.find(
      (a) => a.type === 'ASSIGNMENT' || a.type === 'HOMEWORK' || a.assessmentType === 'HOMEWORK',
    );
    const [lessonQuiz, unitQuiz, courseQuiz, lessonHomework] = await Promise.all([
      this.queryService.attachStudentSubmission(lesson.lessonQuiz, quizViewerStudentId),
      this.queryService.attachStudentSubmission(lesson.module.unitQuiz, quizViewerStudentId),
      this.queryService.attachStudentSubmission(course.courseQuiz, quizViewerStudentId),
      this.queryService.attachStudentSubmission(homeworkAssessment || null, quizViewerStudentId),
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
}
