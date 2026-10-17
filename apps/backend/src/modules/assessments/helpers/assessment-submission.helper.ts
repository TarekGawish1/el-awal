import { BadRequestException } from '@nestjs/common';
import {
  AssessmentType,
  ExamTimingType,
  QuestionType,
  SubmissionStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { SubmitAssessmentDto } from '../dto/submit-assessment.dto';
import { isAnswerCorrect } from './assessment-evaluator.helper';

export function validateAssessmentTiming(
  assessment: {
    startTime?: Date | null;
    startDate?: Date | null;
    endTime?: Date | null;
    dueDate?: Date | null;
    deadline?: Date | null;
    timingType?: ExamTimingType | null;
    type?: AssessmentType;
    durationMinutes?: number | null;
  },
  priorSubmissions: { startedAt?: Date | null }[],
  effectiveDueDate?: Date | null,
) {
  const now = new Date();
  const GRACE_PERIOD_MS = 60 * 1000; // 60s network latency allowance
  const effectiveStartTime = assessment.startTime || assessment.startDate;
  const effectiveEndTime =
    assessment.endTime || assessment.dueDate || assessment.deadline;
  const timingType =
    assessment.timingType ||
    (assessment.type === AssessmentType.EXAM
      ? ExamTimingType.FIXED_SESSION
      : null);

  if (
    effectiveStartTime &&
    now.getTime() < effectiveStartTime.getTime() - GRACE_PERIOD_MS
  ) {
    throw new BadRequestException({
      message: 'لم يحن موعد الاختبار بعد',
      startTime: effectiveStartTime.toISOString(),
    });
  }

  if (timingType === ExamTimingType.FIXED_SESSION) {
    if (
      effectiveEndTime &&
      now.getTime() > effectiveEndTime.getTime() + GRACE_PERIOD_MS
    ) {
      throw new BadRequestException({
        message: 'انتهت المدة المحددة لتسليم الاختبار',
        code: 'EXAM_TIME_EXPIRED',
      });
    }
  } else if (timingType === ExamTimingType.FLEXIBLE_WINDOW) {
    if (
      effectiveEndTime &&
      now.getTime() > effectiveEndTime.getTime() + GRACE_PERIOD_MS
    ) {
      throw new BadRequestException({
        message: 'انتهت فترة الدخول وتسليم الاختبار',
        code: 'EXAM_WINDOW_EXPIRED',
      });
    }
    if (assessment.durationMinutes) {
      const studentStartedAt = priorSubmissions[0]?.startedAt || now;
      const allowedDurationMs = assessment.durationMinutes * 60 * 1000;
      const individualExpiry = studentStartedAt.getTime() + allowedDurationMs;
      if (now.getTime() > individualExpiry + GRACE_PERIOD_MS) {
        throw new BadRequestException({
          message: 'انتهت المدة المحددة لتسليم الاختبار',
          code: 'EXAM_TIME_EXPIRED',
        });
      }
    }
  } else if ((timingType as any) === 'DURATION_ONLY') {
    if (assessment.durationMinutes) {
      const studentStartedAt = priorSubmissions[0]?.startedAt || now;
      const allowedDurationMs = assessment.durationMinutes * 60 * 1000;
      const individualExpiry = studentStartedAt.getTime() + allowedDurationMs;
      if (now.getTime() > individualExpiry + GRACE_PERIOD_MS) {
        throw new BadRequestException({
          message: 'انتهت المدة المحددة لتسليم الاختبار',
          code: 'EXAM_TIME_EXPIRED',
        });
      }
    }
  } else {
    // Session-linked homework due date check
    if (
      effectiveDueDate &&
      now.getTime() > effectiveDueDate.getTime() + GRACE_PERIOD_MS
    ) {
      throw new BadRequestException(
        'Assessment submission deadline has already passed',
      );
    }
  }
}

export function evaluatePreviewSubmission(
  assessment: any,
  user: AuthenticatedUser,
  dto: SubmitAssessmentDto,
  linkedLesson: any,
) {
  const questionMap = new Map(
    (assessment.questions as any[]).map((q: any) => [q.id, q]),
  );
  let totalScoreObtained = 0;
  let hasPendingEssay = false;
  const answersToCreate = [];

  for (const ans of dto.answers) {
    const question: any = questionMap.get(ans.questionId);
    if (!question) continue;

    if (
      question.questionType === QuestionType.MULTIPLE_CHOICE ||
      question.questionType === QuestionType.TRUE_FALSE
    ) {
      const isCorrect = isAnswerCorrect(
        question.questionType,
        ans.answerGiven,
        question.correctAnswer,
      );

      const pointsEarned = isCorrect ? Number(question.points) : 0;
      totalScoreObtained += pointsEarned;

      answersToCreate.push({
        id: 'preview-ans-' + question.id,
        questionId: question.id,
        selectedAnswer: ans.answerGiven,
        isCorrect,
        pointsEarned,
        maxPointsSnapshot: question.points,
      });
    } else if (question.questionType === QuestionType.ESSAY) {
      hasPendingEssay = true;
      answersToCreate.push({
        id: 'preview-ans-' + question.id,
        questionId: question.id,
        selectedAnswer: ans.answerGiven,
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

  return {
    id: 'preview-submission',
    isPreview: true,
    assessmentId: assessment.id,
    studentId: user.id,
    status,
    scoreObtained: finalScore,
    isAutoGraded,
    gradedAt,
    attachmentUrl: dto.attachmentUrl,
    submittedAt: new Date(),
    answers: answersToCreate,
    lessonId: linkedLesson?.id,
    courseId: linkedLesson?.module?.courseId,
  };
}
