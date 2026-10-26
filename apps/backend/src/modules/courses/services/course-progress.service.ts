import {
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  CourseProgressRepository,
  SyncProgressItemDto,
  SyncBatchResult,
} from '../repositories/course-progress.repository';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UpdateProgressDto } from '../dto/update-progress.dto';
import { CourseAccessStatus, CourseEnrollmentStatus, UserRole } from '@prisma/client';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class CourseProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressRepository: CourseProgressRepository,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Retrieves all courses enrolled by the student with dynamic progress completion percentages.
   */
  async getMyCourses(studentId: string) {
    const cacheKey = `student:my_courses:${studentId}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) return cached;
    }

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

    const courseIds = enrollments.map((e) => e.courseId);
    const activeCourseIds = enrollments
      .filter((e) => e.status === CourseEnrollmentStatus.ACTIVE)
      .map((e) => e.courseId);

    const totalLessonsMap = new Map<string, number>();
    const completedLessonsMap = new Map<string, number>();

    if (courseIds.length > 0) {
      const lessons = await this.prisma.courseLesson.findMany({
        where: { module: { courseId: { in: courseIds } } },
        select: { id: true, module: { select: { courseId: true } } },
      });
      for (const l of lessons) {
        const cId = l.module?.courseId;
        if (cId) {
          totalLessonsMap.set(cId, (totalLessonsMap.get(cId) || 0) + 1);
        }
      }
    }

    if (activeCourseIds.length > 0) {
      if (typeof this.prisma.courseProgress?.groupBy === 'function') {
        try {
          const counts = await this.prisma.courseProgress.groupBy({
            by: ['courseId'],
            where: {
              studentId,
              courseId: { in: activeCourseIds },
              isCompleted: true,
            },
            _count: { _all: true },
          });
          for (const row of counts) {
            if (row.courseId) {
              completedLessonsMap.set(
                row.courseId,
                (row as any)._count?._all ?? (row as any)._count ?? 0,
              );
            }
          }
        } catch {
          const completedProgress = await this.prisma.courseProgress.findMany({
            where: {
              studentId,
              isCompleted: true,
              courseId: { in: activeCourseIds },
            },
            select: { courseId: true },
          });
          for (const cp of completedProgress) {
            if (cp.courseId) {
              completedLessonsMap.set(cp.courseId, (completedLessonsMap.get(cp.courseId) || 0) + 1);
            }
          }
        }
      } else {
        const completedProgress = await this.prisma.courseProgress.findMany({
          where: {
            studentId,
            isCompleted: true,
            courseId: { in: activeCourseIds },
          },
          select: { courseId: true },
        });
        for (const cp of completedProgress) {
          if (cp.courseId) {
            completedLessonsMap.set(cp.courseId, (completedLessonsMap.get(cp.courseId) || 0) + 1);
          }
        }
      }
    }

    const results = await Promise.all(
      enrollments.map(async (e) => {
        const isActive = e.status === CourseEnrollmentStatus.ACTIVE;
        const totalLessons = totalLessonsMap.get(e.courseId) || 0;
        const completedLessons = isActive ? (completedLessonsMap.get(e.courseId) || 0) : 0;
        const progressPercentage = (isActive && totalLessons > 0)
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

        const isCompleted = isActive && totalLessons > 0 && progressPercentage >= 100;

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
          previewVideoUrl: e.course.previewVideoUrl || null,
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

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, results, 60);
    }

    return results;
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

    if (this.redisCache && targetStudentId) {
      setImmediate(() => {
        this.redisCache?.del(`student:my_courses:${targetStudentId}`).catch(() => {});
      });
    }

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
   * Delegates offline batch intake to CourseProgressRepository.
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

    if (validLessons.length === 0) {
      return {
        syncedCount: 0,
        processedOperationIds: [],
        courseId: '',
        overallCourseCompletionPercentage: 0,
      };
    }

    const validLessonMap = new Map<string, string>();
    validLessons.forEach((l) => validLessonMap.set(l.id, l.module.courseId));

    // SEC-10: Verify active course entitlement or preview status for student
    const courseIds = [...new Set(validLessons.map((l) => l.module.courseId))];

    const [activeAccesses, activeEnrollments] = await Promise.all([
      typeof this.prisma.courseAccess?.findMany === 'function'
        ? this.prisma.courseAccess.findMany({
            where: {
              studentId,
              courseId: { in: courseIds },
              accessStatus: CourseAccessStatus.ACTIVE,
              OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
            },
            select: { courseId: true },
          })
        : Promise.resolve([]),
      typeof this.prisma.courseEnrollment?.findMany === 'function'
        ? this.prisma.courseEnrollment.findMany({
            where: {
              studentId,
              courseId: { in: courseIds },
              status: CourseEnrollmentStatus.ACTIVE,
            },
            select: { courseId: true },
          })
        : Promise.resolve([]),
    ]);

    const authorizedCourseIds = new Set([
      ...activeAccesses.map((a: any) => a.courseId),
      ...activeEnrollments.map((e: any) => e.courseId),
    ]);

    const previewLessonIds = new Set(
      validLessons.filter((l) => (l as any).isPreview).map((l) => l.id),
    );

    const enrichedItems = items
      .filter((i) => validLessonMap.has(i.lessonId))
      .filter(
        (i) =>
          authorizedCourseIds.has(validLessonMap.get(i.lessonId)!) ||
          previewLessonIds.has(i.lessonId),
      )
      .map((i) => ({
        ...i,
        courseId: validLessonMap.get(i.lessonId)!,
      }));

    if (enrichedItems.length === 0) {
      return {
        syncedCount: 0,
        processedOperationIds: [],
        courseId: '',
        overallCourseCompletionPercentage: 0,
      };
    }

    return this.progressRepository.syncBatch(studentId, enrichedItems);
  }
}
