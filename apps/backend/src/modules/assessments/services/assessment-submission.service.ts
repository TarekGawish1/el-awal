import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  GroupEnrollmentStatus,
  QuestionType,
  SubmissionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';
import { SubmitHomeworkDto } from '../dto/submit-homework.dto';
import { MemoryCache } from '../../../common/utils/memory-cache.util';
import { AssessmentQueryService } from './assessment-query.service';
import { isAnswerCorrect } from '../helpers/assessment-evaluator.helper';
import {
  evaluatePreviewSubmission,
  validateAssessmentTiming,
} from '../helpers/assessment-submission.helper';

@Injectable()
export class AssessmentSubmissionService {
  private readonly logger = new Logger(AssessmentSubmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly queryService: AssessmentQueryService,
    @Optional() private readonly assessmentsListCache?: MemoryCache,
  ) {}

  /**
   * Synchronous Auto-Grading Submission Engine.
   * Handles MCQ/True-False automatic evaluation and marks essay exams for teacher review.
   */
  async submitAssessment(
    assessmentId: string,
    user: AuthenticatedUser,
    dto: SubmitAssessmentDto,
  ) {
    const studentId =
      user.studentProfileId || (user.role === UserRole.STUDENT ? user.id : null);

    const assessment = await this.queryService.getCachedAssessmentBase(assessmentId);

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    if (user.role === UserRole.STUDENT && studentId) {
      if (assessment.courseFinalQuizOf?.enforceSequentialLessons) {
        const course = assessment.courseFinalQuizOf;
        const allCourseLessons = course.modules.flatMap((m: any) => m.lessons);
        const allCourseLessonIds = allCourseLessons.map((l: any) => l.id);

        if (allCourseLessonIds.length > 0) {
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
          .filter(
            (m: any) =>
              m.unitQuiz && !m.unitQuiz.isOptional && m.unitQuiz.id !== assessment.id,
          )
          .map((m: any) => m.unitQuiz!.id);

        if (unitQuizIds.length > 0) {
          const distinctSubmissions =
            await this.prisma.assessmentSubmission.findMany({
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

        if (unitLessonIds.length > 0) {
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

    // If teacher/secretariat previewing or student profile is absent, perform instant preview evaluation
    if (
      user.role === UserRole.TEACHER ||
      user.role === UserRole.SECRETARIAT ||
      !studentId
    ) {
      const linkedLesson = this.prisma.courseLesson?.findFirst
        ? await this.prisma.courseLesson.findFirst({
            where: { lessonQuizId: assessmentId },
            include: { module: true },
          })
        : null;

      return evaluatePreviewSubmission(assessment, user, dto, linkedLesson);
    }

    if (!assessment.isPublished) {
      throw new BadRequestException('Cannot submit to an unpublished assessment');
    }

    if (dto.idempotencyKey) {
      const existingSubmission =
        await this.prisma.assessmentSubmission.findUnique({
          where: { operationId: dto.idempotencyKey },
        });

      if (existingSubmission) {
        this.logger.debug(
          `Idempotent submission replay for assessment ${assessmentId} with key ${dto.idempotencyKey}`,
        );
        return {
          submissionId: existingSubmission.id,
          assessmentId,
          status: existingSubmission.status,
          scoreObtained:
            existingSubmission.scoreObtained != null
              ? Number(existingSubmission.scoreObtained)
              : null,
          totalScore: Number(assessment.totalScore),
          isAutoGraded: existingSubmission.isAutoGraded,
          submittedAt: existingSubmission.submittedAt,
          gradedAt: existingSubmission.gradedAt,
          isIdempotentReplay: true,
        };
      }
    }

    // Verify enrollment entitlement
    if (
      assessment.groupId &&
      assessment.group &&
      !assessment.group.enrollments.some((e: any) => e.studentId === studentId)
    ) {
      throw new ForbiddenException(
        'You are not enrolled in the academic group for this assessment',
      );
    }
    if (
      assessment.targetGroups?.length > 0 &&
      !assessment.targetGroups.some((g: any) =>
        g.enrollments.some((e: any) => e.studentId === studentId),
      )
    ) {
      throw new ForbiddenException(
        'You are not enrolled in any of the target groups for this assessment',
      );
    }
    if (
      assessment.courseId &&
      assessment.course &&
      !assessment.course.enrollments.some((e: any) => e.studentId === studentId)
    ) {
      throw new ForbiddenException(
        'You are not enrolled in the course for this assessment',
      );
    }

    // 1. Enforce the attempt policy and compute the next attempt number.
    const priorSubmissions = await this.prisma.assessmentSubmission.findMany({
      where: { assessmentId, studentId },
      orderBy: { attemptNumber: 'desc' },
    });

    if (priorSubmissions.length > 0 && !assessment.allowMultipleAttempts) {
      throw new BadRequestException({
        code: 'SINGLE_ATTEMPT_ONLY',
        message:
          'غير مسموح بإعادة هذا الاختبار، تم استنفاد المحاولة الوحيدة المتاحة',
      });
    }

    const attemptNumber = (priorSubmissions[0]?.attemptNumber ?? 0) + 1;

    // 2. Validate timing window & submission cutoff (with 60-second grace buffer)
    const effectiveDueDate =
      await this.queryService.resolveEffectiveDueDate(assessment);
    validateAssessmentTiming(assessment, priorSubmissions, effectiveDueDate);

    // 3. Auto-Grading Calculation
    const answerSubmissionMap = new Map(
      dto.answers.map((a) => [a.questionId, a.answerGiven]),
    );
    let totalScoreObtained = 0;
    let hasPendingEssay = false;
    const answersToCreate = [];

    for (const question of assessment.questions) {
      const studentGivenAnswer = answerSubmissionMap.get(question.id) || '';

      if (
        question.questionType === QuestionType.MULTIPLE_CHOICE ||
        question.questionType === QuestionType.TRUE_FALSE
      ) {
        const isCorrect = isAnswerCorrect(
          question.questionType,
          studentGivenAnswer,
          question.correctAnswer,
        );

        const pointsEarned = isCorrect ? Number(question.points) : 0;
        totalScoreObtained += pointsEarned;

        answersToCreate.push({
          questionId: question.id,
          selectedAnswer: studentGivenAnswer,
          isCorrect,
          pointsEarned,
          maxPointsSnapshot: question.points,
        });
      } else if (question.questionType === QuestionType.ESSAY) {
        hasPendingEssay = true;
        answersToCreate.push({
          questionId: question.id,
          selectedAnswer: studentGivenAnswer,
          isCorrect: null,
          pointsEarned: null,
          maxPointsSnapshot: question.points,
        });
      }
    }

    const status = hasPendingEssay
      ? SubmissionStatus.SUBMITTED
      : SubmissionStatus.GRADED;
    const finalScore = hasPendingEssay ? null : totalScoreObtained;
    const isAutoGraded = !hasPendingEssay;
    const gradedAt = hasPendingEssay ? null : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.assessmentSubmission.create({
        data: {
          assessmentId,
          studentId,
          attemptNumber,
          status,
          scoreObtained: finalScore,
          isAutoGraded,
          gradedAt,
          attachmentUrl: dto.attachmentUrl,
          operationId: dto.idempotencyKey || undefined,
        },
      });

      if (answersToCreate.length > 0) {
        await tx.studentAnswer.createMany({
          data: answersToCreate.map((ans) => ({
            submissionId: submission.id,
            questionId: ans.questionId,
            selectedAnswer: ans.selectedAnswer,
            isCorrect: ans.isCorrect,
            pointsEarned: ans.pointsEarned,
            maxPointsSnapshot: ans.maxPointsSnapshot,
          })),
        });
      }

      if (tx.courseLesson?.findFirst && tx.courseProgress?.upsert) {
        const linkedLesson = await tx.courseLesson.findFirst({
          where: { lessonQuizId: assessmentId },
          include: { module: true },
        });

        if (linkedLesson && studentId) {
          await tx.courseProgress.upsert({
            where: {
              lessonId_studentId: {
                lessonId: linkedLesson.id,
                studentId,
              },
            },
            update: {
              isCompleted: true,
              completedAt: new Date(),
            },
            create: {
              studentId,
              lessonId: linkedLesson.id,
              courseId: linkedLesson.module.courseId,
              lastPositionSeconds: 0,
              isCompleted: true,
              completedAt: new Date(),
            },
          });
        }
      }

      return submission;
    });

    if (!hasPendingEssay) {
      this.eventEmitter.emit('assessment.graded', {
        submissionId: result.id,
        assessmentId,
        studentId,
        scoreObtained: finalScore,
      });
    }

    this.logger.log(
      `Assessment [${assessmentId}] submitted by student [${studentId}]. Status: ${status}, Score: ${finalScore}/${assessment.totalScore}`,
    );

    this.assessmentsListCache?.clear();
    await this.queryService.invalidatePortalCaches(studentId);
    return {
      submissionId: result.id,
      assessmentId,
      status,
      scoreObtained: finalScore,
      totalScore: Number(assessment.totalScore),
      isAutoGraded,
      submittedAt: result.submittedAt,
      gradedAt: result.gradedAt,
    };
  }

  /**
   * Records a student's homework answer (PDF/image) for a physical group
   * session assessment.
   */
  async submitHomework(
    assessmentId: string,
    user: AuthenticatedUser,
    dto: SubmitHomeworkDto,
  ) {
    const studentId = user.studentProfileId || user.id;

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        group: {
          include: {
            enrollments: {
              where: { studentId, status: GroupEnrollmentStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (!assessment || !assessment.isPublished) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    if (assessment.courseId || assessment.lessonId) {
      throw new BadRequestException(
        'Homework submission is only supported for physical group assessments',
      );
    }

    if (!assessment.group || assessment.group.enrollments.length === 0) {
      throw new ForbiddenException(
        'You are not enrolled in the physical group for this assessment',
      );
    }

    const session = await this.prisma.lessonSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Lesson session [${dto.sessionId}] not found`);
    }
    if (session.groupId !== assessment.groupId) {
      throw new BadRequestException(
        'The lesson session does not belong to the assessment group',
      );
    }

    const submission = await this.prisma.assessmentSubmission.upsert({
      where: {
        assessmentId_studentId_attemptNumber: {
          assessmentId,
          studentId,
          attemptNumber: 1,
        },
      },
      create: {
        assessmentId,
        studentId,
        attemptNumber: 1,
        status: SubmissionStatus.SUBMITTED,
        attachmentUrl: dto.fileUrl,
        fileKey: dto.fileKey,
        sessionId: dto.sessionId,
        studentNotes: dto.studentNotes,
        submittedAt: new Date(),
      },
      update: {
        status: SubmissionStatus.SUBMITTED,
        attachmentUrl: dto.fileUrl,
        fileKey: dto.fileKey,
        sessionId: dto.sessionId,
        studentNotes: dto.studentNotes,
        submittedAt: new Date(),
        scoreObtained: null,
        gradedAt: null,
      },
    });

    this.logger.log(
      `Homework [${assessmentId}] submitted by student [${studentId}] for session [${dto.sessionId}]`,
    );

    this.assessmentsListCache?.clear();
    await this.queryService.invalidatePortalCaches(studentId);
    return {
      submissionId: submission.id,
      assessmentId,
      sessionId: submission.sessionId,
      status: submission.status,
      fileUrl: submission.attachmentUrl,
      fileKey: submission.fileKey,
      studentNotes: submission.studentNotes,
      submittedAt: submission.submittedAt,
    };
  }
}
