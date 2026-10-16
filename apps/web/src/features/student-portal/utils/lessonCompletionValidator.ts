export interface LessonCompletionValidationResult {
  allowed: boolean;
  errorMessage?: string;
  focusTab?: 'quiz';
}

export function validateLessonCompletionRequirements(lessonViewer: any): LessonCompletionValidationResult {
  const currentQuiz = lessonViewer?.lessonQuiz;
  if (currentQuiz && !currentQuiz.isOptional) {
    if (!currentQuiz.mySubmission) {
      return {
        allowed: false,
        errorMessage: 'لا يمكن إتمام هذا الدرس قبل حل وتسليم اختباره الإلكتروني 📝',
        focusTab: 'quiz',
      };
    }
    const mustPassQuiz = Boolean(currentQuiz.requirePassingScore);
    if (mustPassQuiz) {
      const passScore = currentQuiz.passingScore ?? 0;
      const score = currentQuiz.mySubmission.scoreObtained ?? 0;
      const passed = currentQuiz.mySubmission.isPassed ?? score >= passScore;
      if (!passed && currentQuiz.allowMultipleAttempts) {
        return {
          allowed: false,
          errorMessage: `يجب اجتياز الاختبار بدرجة النجاح (${passScore} من ${currentQuiz.totalScore}) لإتمام هذا الدرس والتقدم 🎯`,
          focusTab: 'quiz',
        };
      }
    }
  }

  const currentHomework = lessonViewer?.lessonHomework;
  if (currentHomework && !currentHomework.isOptional) {
    if (!currentHomework.mySubmission) {
      return {
        allowed: false,
        errorMessage: 'لا يمكن إتمام هذا الدرس قبل حل وتسليم الواجب المنزلي 📝',
        focusTab: 'quiz',
      };
    }
    const mustPassHw = Boolean(currentHomework.requirePassingScore);
    if (mustPassHw) {
      const passScore = currentHomework.passingScore ?? 0;
      const score = currentHomework.mySubmission.scoreObtained ?? 0;
      const passed = currentHomework.mySubmission.isPassed ?? score >= passScore;
      if (!passed && currentHomework.allowMultipleAttempts) {
        return {
          allowed: false,
          errorMessage: `يجب اجتياز الواجب بدرجة النجاح (${passScore} من ${currentHomework.totalScore}) لإتمام هذا الدرس والتقدم 🎯`,
          focusTab: 'quiz',
        };
      }
    }
  }

  return { allowed: true };
}
