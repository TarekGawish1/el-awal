import { QuestionType } from '@prisma/client';

/**
 * Normalizes and compares student answer with model answer for MCQ & True/False questions.
 */
export function isAnswerCorrect(
  questionType: QuestionType,
  answerGiven: string | null | undefined,
  correctAnswer: string | null | undefined,
): boolean {
  if (!answerGiven || !correctAnswer) return false;
  const a = answerGiven.trim().toLowerCase();
  const c = correctAnswer.trim().toLowerCase();
  if (a === c) return true;

  if (questionType === QuestionType.TRUE_FALSE) {
    const trueVariants = ['true', 'صح', 'صحيحة', 'صواب', '1', 'نعم'];
    const falseVariants = ['false', 'خطأ', 'خاطئة', 'غلط', '0', 'لا'];
    if (trueVariants.includes(a) && trueVariants.includes(c)) return true;
    if (falseVariants.includes(a) && falseVariants.includes(c)) return true;
  }
  return false;
}
