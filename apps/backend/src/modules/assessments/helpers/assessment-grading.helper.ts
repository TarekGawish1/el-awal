import { QuestionType, SubmissionStatus } from '@prisma/client';
import { isAnswerCorrect } from './assessment-evaluator.helper';

export function formatSubmissionDetailResponse(submission: any) {
  return {
    id: submission.id,
    attemptNumber: submission.attemptNumber,
    status: submission.status,
    scoreObtained:
      submission.scoreObtained != null ? Number(submission.scoreObtained) : null,
    isAutoGraded: submission.isAutoGraded,
    submittedAt: submission.submittedAt,
    gradedAt: submission.gradedAt,
    attachmentUrl: submission.attachmentUrl,
    teacherFeedback: submission.teacherFeedback,
    student: {
      id: submission.studentId,
      user: {
        fullName: submission.student.user.fullName,
        phone: submission.student.user.phone,
        email: submission.student.user.email,
      },
      studentCode: submission.student.studentCode,
    },
    assessment: {
      id: submission.assessment.id,
      title: submission.assessment.title,
      totalScore: Number(submission.assessment.totalScore),
      questions: submission.assessment.questions.map((q: any) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        questionType: q.questionType,
        imageUrl: q.imageUrl,
        points: Number(q.points),
        correctAnswer: q.correctAnswer,
        optionsData: q.optionsData ? q.optionsData : undefined,
        optionImages: q.optionImages ? q.optionImages : undefined,
        explanation: q.explanation,
      })),
    },
    answers: submission.answers.map((ans: any) => ({
      id: ans.id,
      questionId: ans.questionId,
      answerGiven: ans.selectedAnswer,
      isCorrect: ans.isCorrect,
      pointsAwarded:
        ans.pointsEarned != null ? Number(ans.pointsEarned) : null,
      teacherFeedback: ans.teacherFeedback,
    })),
  };
}

export async function executeAutoGradingReEvaluation(tx: any, assessment: any) {
  const hasEssayQuestions = assessment.questions.some(
    (q: any) => q.questionType === QuestionType.ESSAY,
  );

  let updatedSubmissionsCount = 0;
  const answersToCreate: any[] = [];
  const answerUpdates: Promise<any>[] = [];
  const submissionUpdates: Promise<any>[] = [];

  for (const submission of assessment.submissions) {
    let totalScore = 0;
    let hasPendingManualEssay = false;

    for (const question of assessment.questions) {
      const ans = submission.answers.find((a: any) => a.questionId === question.id);
      const maxPoints = Number(question.points);

      if (
        question.questionType === QuestionType.MULTIPLE_CHOICE ||
        question.questionType === QuestionType.TRUE_FALSE
      ) {
        const isCorrect = isAnswerCorrect(
          question.questionType,
          ans?.selectedAnswer,
          question.correctAnswer,
        );
        const pointsEarned = isCorrect ? maxPoints : 0;
        totalScore += pointsEarned;

        if (ans) {
          answerUpdates.push(
            tx.studentAnswer.update({
              where: { id: ans.id },
              data: {
                isCorrect,
                pointsEarned,
                maxPointsSnapshot: question.points,
              },
            }),
          );
        } else {
          answersToCreate.push({
            submissionId: submission.id,
            questionId: question.id,
            selectedAnswer: '',
            isCorrect,
            pointsEarned,
            maxPointsSnapshot: question.points,
          });
        }
      } else if (question.questionType === QuestionType.ESSAY) {
        if (ans && ans.pointsEarned !== null) {
          totalScore += Number(ans.pointsEarned);
        } else {
          hasPendingManualEssay = true;
        }
      }
    }

    const isFullyGraded = !hasPendingManualEssay;

    submissionUpdates.push(
      tx.assessmentSubmission.update({
        where: { id: submission.id },
        data: {
          ...(isFullyGraded
            ? {
                status: SubmissionStatus.GRADED,
                scoreObtained: totalScore,
                isAutoGraded: !hasEssayQuestions,
                gradedAt: submission.gradedAt || new Date(),
              }
            : {
                status: submission.status,
              }),
        },
      }),
    );

    updatedSubmissionsCount++;
  }

  if (answersToCreate.length > 0) {
    await tx.studentAnswer.createMany({ data: answersToCreate });
  }
  await Promise.all([...answerUpdates, ...submissionUpdates]);

  return { updatedSubmissionsCount };
}
