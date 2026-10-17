import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CourseVideoService } from './course-video.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { CourseStatus, UserRole } from '@prisma/client';
import { resolveOfficialSubmission } from '../../assessments/utils/submission-grade.util';

@Injectable()
export class CourseQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: CourseVideoService,
  ) {}

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
        previewVideoUrl: this.videoService.signPreviewVideoUrl((c as any).previewVideoUrl),
        totalLessons,
        totalDurationSeconds,
      };
    });
  }

  /**
   * Enriches a quiz summary with the requesting student's official (highest-scoring) submission.
   */
  public async attachStudentSubmission<
    Q extends { id: string; passingScore?: unknown },
  >(quiz: Q | null, studentId: string | null, preloadedSubmissions?: any[]) {
    if (!quiz) return null;

    const base = {
      ...quiz,
      passingScore:
        quiz.passingScore != null ? Number(quiz.passingScore) : null,
    };

    if (!studentId) {
      return { ...base, attemptCount: 0, mySubmission: null };
    }

    const submissions = preloadedSubmissions !== undefined
      ? preloadedSubmissions
      : await this.prisma.assessmentSubmission.findMany({
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

    // Prefetch all student submissions for quizzes in this course in a single batch query
    const quizSubmissionsMap = new Map<string, any[]>();
    if (studentId) {
      const quizIds: string[] = [];
      if (course.courseQuiz?.id) quizIds.push(course.courseQuiz.id);
      for (const mod of course.modules || []) {
        if (mod.unitQuiz?.id) quizIds.push(mod.unitQuiz.id);
        for (const les of mod.lessons || []) {
          if (les.lessonQuiz?.id) quizIds.push(les.lessonQuiz.id);
          for (const ass of (les.assessments || [])) {
            if (ass.id) quizIds.push(ass.id);
          }
        }
      }
      if (quizIds.length > 0) {
        const allSubmissions = await this.prisma.assessmentSubmission.findMany({
          where: { assessmentId: { in: quizIds }, studentId },
          orderBy: { attemptNumber: 'asc' },
          select: { assessmentId: true, attemptNumber: true, status: true, scoreObtained: true },
        });
        for (const sub of allSubmissions) {
          const list = quizSubmissionsMap.get(sub.assessmentId) || [];
          list.push(sub);
          quizSubmissionsMap.set(sub.assessmentId, list);
        }
      }
    }

    const [enrichedCourseQuiz, enrichedModules] = await Promise.all([
      this.attachStudentSubmission(
        course.courseQuiz,
        studentId,
        course.courseQuiz ? (quizSubmissionsMap.get(course.courseQuiz.id) || []) : undefined,
      ),
      Promise.all(
        (course.modules || []).map(async (mod) => {
          const [enrichedUnitQuiz, enrichedLessons] = await Promise.all([
            this.attachStudentSubmission(
              mod.unitQuiz,
              studentId,
              mod.unitQuiz ? (quizSubmissionsMap.get(mod.unitQuiz.id) || []) : undefined,
            ),
            Promise.all(
              (mod.lessons || []).map(async (les) => ({
                ...les,
                lessonQuiz: await this.attachStudentSubmission(
                  les.lessonQuiz,
                  studentId,
                  les.lessonQuiz ? (quizSubmissionsMap.get(les.lessonQuiz.id) || []) : undefined,
                ),
                assessments: await Promise.all(
                  (les.assessments || []).map((ass: any) =>
                    this.attachStudentSubmission(
                      ass,
                      studentId,
                      ass.id ? (quizSubmissionsMap.get(ass.id) || []) : undefined,
                    ),
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
      previewVideoUrl: this.videoService.signPreviewVideoUrl((course as any).previewVideoUrl),
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
}
