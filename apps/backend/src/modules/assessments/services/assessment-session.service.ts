import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  UserRole,
  AssessmentType,
  ExamTimingType,
  SubmissionStatus,
} from '@prisma/client';
import { resolveOfficialSubmission } from '../utils/submission-grade.util';
import { AssessmentQueryService } from './assessment-query.service';

@Injectable()
export class AssessmentSessionService {
  private readonly logger = new Logger(AssessmentSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: AssessmentQueryService,
  ) {}

  async getAssessmentById(assessmentId: string, user: AuthenticatedUser) {
    const studentId = user.studentProfileId || user.id;

    const baseAssessment = await this.queryService.getCachedAssessmentBase(assessmentId);
    if (!baseAssessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    const submissions: any[] =
      baseAssessment.submissions && Array.isArray(baseAssessment.submissions)
        ? baseAssessment.submissions
        : studentId && this.prisma.assessmentSubmission?.findMany
          ? ((await this.prisma.assessmentSubmission.findMany({
              where: { assessmentId, studentId },
              orderBy: { attemptNumber: 'asc' },
              include: {
                answers: true,
              },
            })) || [])
          : [];

    const assessment: any = {
      ...baseAssessment,
      submissions: submissions || [],
    };

    if (user.role === UserRole.STUDENT) {
      if (!assessment.isPublished) {
        throw new NotFoundException(`Assessment [${assessmentId}] not found`);
      }
      const isEnrolledInGroup = assessment.groupId
        ? assessment.group?.enrollments.some((e: any) => e.studentId === studentId)
        : assessment.targetGroups?.some((g: any) => g.enrollments.some((e: any) => e.studentId === studentId)) || false;
      const isEnrolledInCourse = assessment.courseId
        ? assessment.course?.enrollments.some((e: any) => e.studentId === studentId)
        : false;

      if ((assessment.groupId || assessment.targetGroups?.length > 0) && !isEnrolledInGroup && assessment.courseId && !isEnrolledInCourse) {
        throw new ForbiddenException('You are not enrolled in the group or course for this assessment');
      }

      // Sequential Course Assessment Progression Enforcement
      if (assessment.courseFinalQuizOf?.enforceSequentialLessons) {
        const course = assessment.courseFinalQuizOf;
        const allCourseLessons = course.modules.flatMap((m: any) => m.lessons);
        const allCourseLessonIds = allCourseLessons.map((l: any) => l.id);

        if (allCourseLessonIds.length > 0 && studentId) {
          const completedCount = await this.prisma.courseProgress.count({
            where: {
              studentId,
              lessonId: { in: allCourseLessonIds },
              isCompleted: true,
            },
          });
          if (completedCount < allCourseLessonIds.length) {
            throw new ForbiddenException(
              'الامتحان النهائي للكورس مقفل: يجب إتمام جميع دروس المنهج أولاً وفقاً لترتيب المنهج المحدد من المعلم',
            );
          }
        }

        const unitQuizIds = course.modules
          .filter((m: any) => m.unitQuiz && !m.unitQuiz.isOptional && m.unitQuiz.id !== assessment.id)
          .map((m: any) => m.unitQuiz!.id);

        if (unitQuizIds.length > 0 && studentId) {
          const distinctSubmissions = await this.prisma.assessmentSubmission.findMany({
            where: {
              studentId,
              assessmentId: { in: unitQuizIds },
            },
            select: { assessmentId: true },
            distinct: ['assessmentId'],
          });
          if (distinctSubmissions.length < unitQuizIds.length) {
            throw new ForbiddenException(
              'الامتحان النهائي للكورس مقفل: يجب إنهاء اختبارات جميع الوحدات أولاً قبل دخول الامتحان النهائي',
            );
          }
        }
      } else if (assessment.unitQuizOf?.course?.enforceSequentialLessons) {
        const unit = assessment.unitQuizOf;
        const unitLessonIds = unit.lessons.map((l: any) => l.id);

        if (unitLessonIds.length > 0 && studentId) {
          const completedCount = await this.prisma.courseProgress.count({
            where: {
              studentId,
              lessonId: { in: unitLessonIds },
              isCompleted: true,
            },
          });
          if (completedCount < unitLessonIds.length) {
            throw new ForbiddenException(
              'اختبار الوحدة الشامل مقفل: يجب إتمام جميع دروس الوحدة أولاً وفقاً لترتيب المنهج المحدد من المعلم',
            );
          }
        }
      }
    }

    const mySubmission: any = resolveOfficialSubmission(assessment.submissions);

    const isGraded = mySubmission?.status === SubmissionStatus.GRADED;
    const hasSubmitted = mySubmission?.status === SubmissionStatus.SUBMITTED || isGraded;
    const isPrivileged =
      user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT;

    const effectiveStartTime = assessment.startTime || assessment.startDate;
    const effectiveEndTime = assessment.endTime || assessment.dueDate || assessment.deadline;
    const timingType =
      assessment.timingType ||
      (assessment.type === AssessmentType.EXAM
        ? ExamTimingType.FIXED_SESSION
        : null);
    const now = new Date();

    // Server-side timing enforcement for students attempting exams
    if (user.role === UserRole.STUDENT && (assessment.type === AssessmentType.EXAM || timingType)) {
      if (!hasSubmitted) {
        if (effectiveStartTime && now.getTime() < effectiveStartTime.getTime()) {
          throw new ForbiddenException({
            message: 'لم يحن موعد الاختبار بعد',
            startTime: effectiveStartTime.toISOString(),
          });
        }
        if (effectiveEndTime && now.getTime() > effectiveEndTime.getTime()) {
          throw new ForbiddenException({
            message: 'انتهت فترة الدخول للاختبار',
          });
        }
      }
    }

    // Compute effective student remaining time
    const durationSecs = assessment.durationMinutes
      ? assessment.durationMinutes * 60
      : null;
    let effectiveRemainingSeconds: number | null = null;
    let isLate = false;

    if (timingType === ExamTimingType.FIXED_SESSION) {
      if (effectiveEndTime) {
        const remainingUntilEnd = Math.floor(
          (effectiveEndTime.getTime() - now.getTime()) / 1000,
        );
        const bounded = durationSecs
          ? Math.min(durationSecs, remainingUntilEnd)
          : remainingUntilEnd;
        effectiveRemainingSeconds = Math.max(0, bounded);
      } else {
        effectiveRemainingSeconds = durationSecs;
      }
      if (effectiveStartTime && now.getTime() > effectiveStartTime.getTime()) {
        isLate = true;
      }
    } else if (timingType === ExamTimingType.FLEXIBLE_WINDOW) {
      const startedAtDate = mySubmission?.startedAt
        ? new Date(mySubmission.startedAt)
        : now;
      if (durationSecs) {
        const remainingFromStart = Math.floor(
          (startedAtDate.getTime() + durationSecs * 1000 - now.getTime()) /
            1000,
        );
        effectiveRemainingSeconds = Math.max(
          0,
          Math.min(durationSecs, remainingFromStart),
        );
      } else {
        effectiveRemainingSeconds = null;
      }
      isLate = false;
    } else {
      effectiveRemainingSeconds = durationSecs;
    }

    let sanitizedQuestions: any[] = [];
    if (user.role === UserRole.PARENT) {
      sanitizedQuestions = [];
    } else {
      sanitizedQuestions = assessment.questions.map((q: any) => {
        if (isPrivileged || isGraded) {
          return q;
        }
        const { correctAnswer, explanation, ...safeQuestion } = q;
        return safeQuestion;
      });
    }

    const effectiveDueDate =
      user.role === UserRole.STUDENT || user.role === UserRole.PARENT
        ? await this.queryService.resolveEffectiveDueDate(assessment)
        : assessment.dueDate;

    return {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      type: assessment.type,
      assessmentType: assessment.assessmentType,
      timingType,
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      serverTime: now.toISOString(),
      effectiveRemainingSeconds,
      isLate,
      totalScore: Number(assessment.totalScore),
      passingScore: assessment.passingScore
        ? Number(assessment.passingScore)
        : null,
      durationMinutes: assessment.durationMinutes,
      startDate: effectiveStartTime,
      dueDate: effectiveDueDate,
      deadline: effectiveEndTime,
      isPublished: assessment.isPublished,
      allowMultipleAttempts: assessment.allowMultipleAttempts,
      isOptional: assessment.isOptional,
      requirePassingScore: assessment.requirePassingScore,
      teacher: assessment.teacher,
      group: assessment.group,
      targetGroups: assessment.targetGroups,
      course: assessment.course,
      questions: sanitizedQuestions,
      attemptCount: (assessment.submissions || []).length,
      bestScore:
        mySubmission?.scoreObtained != null
          ? Number(mySubmission.scoreObtained)
          : null,
      attempts: (assessment.submissions || []).map((s: any) => ({
        id: s.id,
        attemptNumber: s.attemptNumber,
        status: s.status,
        scoreObtained: s.scoreObtained != null ? Number(s.scoreObtained) : null,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
      })),

      mySubmission: mySubmission
        ? {
            id: mySubmission.id,
            attemptNumber: mySubmission.attemptNumber,
            status: mySubmission.status,
            scoreObtained:
              mySubmission.scoreObtained != null
                ? Number(mySubmission.scoreObtained)
                : null,
            submittedAt: mySubmission.submittedAt,
            gradedAt: mySubmission.gradedAt,
            teacherFeedback: mySubmission.teacherFeedback,
            answers: mySubmission.answers,
          }
        : null,
    };
  }

  async getMyAssessmentStatus(assessmentId: string, user: AuthenticatedUser) {
    const studentId =
      user.studentProfileId ||
      (user.role === UserRole.STUDENT ? user.id : null);

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        totalScore: true,
        allowMultipleAttempts: true,
        isOptional: true,
        requirePassingScore: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    const totalScore = Number(assessment.totalScore);

    if (!studentId) {
      return {
        hasSubmitted: false,
        score: null,
        totalScore,
        percentage: null,
        attemptsCount: 0,
        allowMultipleAttempts: assessment.allowMultipleAttempts,
        isOptional: assessment.isOptional,
        requirePassingScore: assessment.requirePassingScore,
      };
    }

    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: { assessmentId, studentId },
      orderBy: { attemptNumber: 'asc' },
      select: { attemptNumber: true, status: true, scoreObtained: true },
    });

    const official = resolveOfficialSubmission(submissions);
    const score =
      official?.scoreObtained != null ? Number(official.scoreObtained) : null;
    const percentage =
      score != null && totalScore > 0
        ? Math.round((score / totalScore) * 100)
        : null;

    return {
      hasSubmitted: submissions.length > 0,
      score,
      totalScore,
      percentage,
      attemptsCount: submissions.length,
      allowMultipleAttempts: assessment.allowMultipleAttempts,
      isOptional: assessment.isOptional,
      requirePassingScore: assessment.requirePassingScore,
    };
  }
}
