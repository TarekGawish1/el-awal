import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { SyncAssessmentsBatchDto } from '../dto/sync-assessments.dto';
import { DomainSyncResult } from './sync.service';
import { QuestionType, SubmissionStatus } from '@prisma/client';

@Injectable()
export class SyncAssessmentsService {
  private readonly logger = new Logger(SyncAssessmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncAssessmentsBatch(
    studentId: string,
    dto: SyncAssessmentsBatchDto,
  ): Promise<DomainSyncResult> {
    const result: DomainSyncResult = {
      syncedCount: 0,
      duplicatesIgnored: 0,
      failedCount: 0,
      processedOperationIds: [],
      conflicts: [],
    };

    if (!dto.operations || dto.operations.length === 0) {
      return result;
    }

    for (const op of dto.operations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const assessment = await tx.assessment.findUnique({
            where: { id: op.assessmentId },
            include: { questions: true },
          });

          if (!assessment) {
            result.conflicts.push({
              operationId: op.id,
              reason: `Assessment [${op.assessmentId}] not found`,
              entityId: op.assessmentId,
            });
            result.failedCount++;
            return;
          }

          const priorSubmissions = await tx.assessmentSubmission.findMany({
            where: {
              assessmentId: op.assessmentId,
              studentId,
            },
            orderBy: { attemptNumber: 'desc' },
          });

          const submittedAt = op.clientTimestamp
            ? new Date(op.clientTimestamp)
            : new Date();

          // Idempotency: a prior submission at the same client timestamp is the very
          // same operation being re-sent (offline retry) — never a new attempt.
          const alreadySynced = priorSubmissions.some(
            (s) => s.submittedAt.getTime() === submittedAt.getTime(),
          );

          if (
            alreadySynced ||
            (priorSubmissions.length > 0 && !assessment.allowMultipleAttempts)
          ) {
            result.duplicatesIgnored++;
            result.processedOperationIds.push(op.id);
            return;
          }

          const attemptNumber = (priorSubmissions[0]?.attemptNumber ?? 0) + 1;

          // Auto-grading computation
          let calculatedScore = 0;
          let hasEssayQuestions = false;

          const questionMap = new Map(assessment.questions.map((q) => [q.id, q]));
          const answersToCreate: Array<{
            questionId: string;
            selectedAnswer: string;
            isCorrect: boolean | null;
            pointsEarned: number | null;
            maxPointsSnapshot: number;
          }> = [];

          for (const ans of op.answers) {
            const question = questionMap.get(ans.questionId);
            if (!question) continue;

            const maxPoints = Number(question.points);
            let isCorrect: boolean | null = null;
            let pointsEarned: number | null = null;

            if (
              question.questionType === QuestionType.MULTIPLE_CHOICE ||
              question.questionType === QuestionType.TRUE_FALSE
            ) {
              isCorrect =
                (ans.selectedAnswer || '').trim().toLowerCase() ===
                (question.correctAnswer || '').trim().toLowerCase();
              pointsEarned = isCorrect ? maxPoints : 0;
              calculatedScore += pointsEarned;
            } else if (question.questionType === QuestionType.ESSAY) {
              hasEssayQuestions = true;
              isCorrect = null;
              pointsEarned = null;
            }

            answersToCreate.push({
              questionId: ans.questionId,
              selectedAnswer: ans.selectedAnswer,
              isCorrect,
              pointsEarned,
              maxPointsSnapshot: maxPoints,
            });
          }

          const finalStatus = hasEssayQuestions
            ? SubmissionStatus.SUBMITTED
            : SubmissionStatus.GRADED;

          const submission = await tx.assessmentSubmission.create({
            data: {
              assessmentId: op.assessmentId,
              studentId,
              attemptNumber,
              status: finalStatus,
              scoreObtained: hasEssayQuestions ? null : calculatedScore,
              isAutoGraded: !hasEssayQuestions,
              gradedAt: hasEssayQuestions ? null : submittedAt,
              submittedAt,
              attachmentUrl: op.attachmentUrl,
            },
          });

          if (answersToCreate.length > 0) {
            await tx.studentAnswer.createMany({
              data: answersToCreate.map((a) => ({
                submissionId: submission.id,
                ...a,
              })),
            });
          }

          result.syncedCount++;
          result.processedOperationIds.push(op.id);
        });
      } catch (err: any) {
        this.logger.error(`Failed to sync assessment op [${op.id}]:`, err);
        result.failedCount++;
        result.conflicts.push({
          operationId: op.id,
          reason: err?.message || 'Assessment sync error',
        });
      }
    }

    return result;
  }
}
