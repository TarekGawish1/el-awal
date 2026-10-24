import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuestionType, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { GradeSubmissionDto } from '../dto/grade-submission.dto';
import { MemoryCache } from '../../../common/utils/memory-cache.util';
import { AssessmentQueryService } from './assessment-query.service';
import { resolveOfficialSubmission } from '../utils/submission-grade.util';
import {
  formatSubmissionDetailResponse,
  executeAutoGradingReEvaluation,
} from '../helpers/assessment-grading.helper';

@Injectable()
export class AssessmentGradingService {
  private readonly logger = new Logger(AssessmentGradingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly queryService: AssessmentQueryService,
    @Optional() private readonly assessmentsListCache?: MemoryCache,
  ) {}

  /**
   * Manual grading for essay/subjective questions by instructor.
   */
  async gradeSubmission(
    submissionId: string,
    teacherId: string,
    isSecretariat: boolean,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: {
          include: { questions: true },
        },
        answers: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission [${submissionId}] not found`);
    }

    await this.assertAssessmentAccess(
      submission.assessment.teacherId,
      teacherId,
      isSecretariat,
      'You do not have permission to grade this assessment submission',
    );

    const questionMap = new Map(
      submission.assessment.questions.map((q) => [q.id, q]),
    );
    for (const grade of dto.manualGrades) {
      const q = questionMap.get(grade.questionId);
      if (q && grade.pointsEarned > Number(q.points)) {
        throw new BadRequestException(
          `الدرجة الممنوحة للسؤال (${grade.pointsEarned}) تتجاوز الحد الأقصى للسؤال (${Number(q.points)})`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const questionIds = dto.manualGrades.map((g) => g.questionId);
      const existingAnswers = await tx.studentAnswer.findMany({
        where: {
          submissionId,
          questionId: { in: questionIds },
        },
      });
      const existingMap = new Map(existingAnswers.map((a) => [a.questionId, a]));

      const updates: Promise<any>[] = [];
      const creates: any[] = [];

      for (const grade of dto.manualGrades) {
        const existingAnswer = existingMap.get(grade.questionId);
        if (existingAnswer) {
          updates.push(
            tx.studentAnswer.update({
              where: { id: existingAnswer.id },
              data: {
                pointsEarned: grade.pointsEarned,
                teacherFeedback: grade.teacherFeedback,
                isCorrect: grade.pointsEarned > 0,
              },
            }),
          );
        } else {
          const q = questionMap.get(grade.questionId);
          creates.push({
            submissionId,
            questionId: grade.questionId,
            selectedAnswer: '',
            pointsEarned: grade.pointsEarned,
            maxPointsSnapshot: q?.points ?? 1,
            teacherFeedback: grade.teacherFeedback,
            isCorrect: grade.pointsEarned > 0,
          });
        }
      }

      if (creates.length > 0) {
        updates.push(tx.studentAnswer.createMany({ data: creates }));
      }
      await Promise.all(updates);

      const allAnswers = await tx.studentAnswer.findMany({
        where: { submissionId },
      });

      const totalScore = allAnswers.reduce(
        (sum, a) => sum + (Number(a.pointsEarned) || 0),
        0,
      );

      const maxTotal = Number(submission.assessment.totalScore);
      if (totalScore > maxTotal) {
        throw new BadRequestException(
          `مجموع الدرجات (${totalScore}) يتجاوز الدرجة الكلية للاختبار (${maxTotal})`,
        );
      }

      const passingScore = Number(submission.assessment.passingScore || 0);
      const isPassed = totalScore >= passingScore;

      const graderName = isSecretariat ? 'المساعد' : 'المعلم';
      const updatedSubmission = await tx.assessmentSubmission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.GRADED,
          scoreObtained: totalScore,
          teacherFeedback: dto.feedback,
          gradedAt: new Date(),
          gradedById: teacherId,
          gradedByName: graderName,
        },
        include: {
          answers: { include: { question: true } },
          student: {
            include: { user: { select: { fullName: true, phone: true } } },
          },
        },
      });

      this.eventEmitter.emit('assessment.graded', {
        submissionId: updatedSubmission.id,
        assessmentId: submission.assessmentId,
        studentId: submission.studentId,
        scoreObtained: totalScore,
      });

      this.logger.log(
        `Submission [${submissionId}] manually graded. Score: ${totalScore}/${maxTotal}`,
      );

      this.assessmentsListCache?.clear();
      return {
        id: updatedSubmission.id,
        assessmentId: updatedSubmission.assessmentId,
        student: (updatedSubmission as any).student,
        status: updatedSubmission.status,
        scoreObtained: Number(updatedSubmission.scoreObtained),
        totalScore: maxTotal,
        isPassed,
        teacherFeedback: updatedSubmission.teacherFeedback,
        gradedAt: updatedSubmission.gradedAt,
        answers: (updatedSubmission as any).answers,
      };
    });

    await this.queryService.invalidatePortalCaches(submission.studentId);
    return result;
  }

  /**
   * Retrieves all student submissions for an instructor's assessment.
   */
  async getAssessmentSubmissions(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    await this.assertAssessmentAccess(
      assessment.teacherId,
      teacherId,
      isSecretariat,
      'You do not have permission to view these submissions',
    );

    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: { assessmentId },
      orderBy: { submittedAt: 'desc' },
      include: {
        student: {
          include: {
            user: { select: { fullName: true, phone: true, email: true } },
          },
        },
        _count: { select: { answers: true } },
      },
    });

    const attemptsByStudent = new Map<string, typeof submissions>();
    for (const s of submissions) {
      const existing = attemptsByStudent.get(s.studentId);
      if (existing) existing.push(s);
      else attemptsByStudent.set(s.studentId, [s]);
    }
    const officialSubmissionIds = new Set<string>();
    for (const [, attempts] of attemptsByStudent) {
      const official = resolveOfficialSubmission(attempts);
      if (official) officialSubmissionIds.add(official.id);
    }

    return {
      assessmentId,
      assessmentTitle: assessment.title,
      totalScore: Number(assessment.totalScore),
      totalSubmissions: submissions.length,
      totalStudents: attemptsByStudent.size,
      submissions: submissions.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        studentName: s.student.user.fullName,
        studentPhone: s.student.user.phone,
        attemptNumber: s.attemptNumber,
        isOfficial: officialSubmissionIds.has(s.id),
        status: s.status,
        scoreObtained: s.scoreObtained != null ? Number(s.scoreObtained) : null,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
        isAutoGraded: s.isAutoGraded,
      })),
    };
  }

  /**
   * Retrieves full details of a specific submission including answers for grading.
   */
  async getSubmissionById(
    submissionId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: {
          include: {
            questions: true,
          },
        },
        student: {
          include: {
            user: { select: { fullName: true, phone: true, email: true } },
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission [${submissionId}] not found`);
    }

    await this.assertAssessmentAccess(
      submission.assessment.teacherId,
      teacherId,
      isSecretariat,
      'You do not have permission to view this submission',
    );

    return formatSubmissionDetailResponse(submission);
  }

  /**
   * Batch re-evaluate auto-graded (MCQ / True-False) questions for all submissions of an assessment.
   */
  async reEvaluateAutoGradedSubmissions(
    assessmentId: string,
    teacherId: string,
    isSecretariat: boolean,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: true,
        submissions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment [${assessmentId}] not found`);
    }

    await this.assertAssessmentAccess(
      assessment.teacherId,
      teacherId,
      isSecretariat,
      'You do not have permission to re-evaluate this assessment',
    );

    let updatedSubmissionsCount = 0;

    await this.prisma.$transaction(async (tx) => {
      const res = await executeAutoGradingReEvaluation(tx, assessment);
      updatedSubmissionsCount = res.updatedSubmissionsCount;
    });

    this.logger.log(
      `Re-evaluated ${updatedSubmissionsCount} submissions for assessment [${assessmentId}]`,
    );

    this.assessmentsListCache?.clear();
    return {
      success: true,
      assessmentId,
      reEvaluatedCount: updatedSubmissionsCount,
      message: `تمت إعادة تقييم ${updatedSubmissionsCount} تسليم بنجاح`,
    };
  }

  private async resolveEffectiveTeacherId(
    teacherId: string,
    isSecretariat: boolean,
  ): Promise<string> {
    if (!isSecretariat) {
      return teacherId;
    }
    const link = await this.prisma.teacherAssistant.findFirst({
      where: { assistantId: teacherId, status: 'ACTIVE' },
      select: { teacherId: true },
    });
    if (!link) {
      throw new ForbiddenException('لا يوجد ارتباط نشط كمعاون مع أي معلم');
    }
    return link.teacherId;
  }

  private async assertAssessmentAccess(
    assessmentTeacherId: string,
    callerTeacherId: string,
    isSecretariat: boolean,
    forbiddenMessage: string,
  ): Promise<void> {
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(
      callerTeacherId,
      isSecretariat,
    );
    if (assessmentTeacherId !== effectiveTeacherId) {
      throw new ForbiddenException(forbiddenMessage);
    }
  }
}
