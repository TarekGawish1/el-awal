import { useState, useEffect, useMemo } from 'react';
import { useGradeSubmission, useReEvaluateAssessment } from './use-assessments';
import { QuestionType } from '../types/assessments.types';
import toast from 'react-hot-toast';

export interface QuestionGradeState {
  pointsEarned: number | '';
  teacherFeedback: string;
  error?: string;
}

export function isAnswerMatch(
  questionType: QuestionType,
  answerGiven?: string | null,
  correctAnswer?: string | null,
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

interface UseSubmissionGradingProps {
  submissionId: string;
  submission: any;
  questions: any[];
  refetch: () => void;
}

export function useSubmissionGrading({
  submissionId,
  submission,
  questions,
  refetch,
}: UseSubmissionGradingProps) {
  const { mutate: gradeSubmission, isPending } = useGradeSubmission();
  const { mutate: reEvaluateAssessment, isPending: isReEvaluating } = useReEvaluateAssessment();

  const [activeTab, setActiveTab] = useState<'all' | 'essay' | 'mcq'>('all');
  const [gradesState, setGradesState] = useState<Record<string, QuestionGradeState>>({});
  const [generalFeedback, setGeneralFeedback] = useState<string>('');
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  const assessment = submission?.assessment;
  const answers = useMemo(() => submission?.answers || [], [submission]);

  useEffect(() => {
    if (submission && questions.length > 0) {
      const initial: Record<string, QuestionGradeState> = {};
      const answerMap = new Map<string, any>((submission.answers || []).map((a: any) => [a.questionId, a]));

      questions.forEach((q) => {
        const ans = answerMap.get(q.id);
        const maxPoints = Number(q.points) || 1;
        const isAutoGradedType = q.questionType === QuestionType.MULTIPLE_CHOICE || q.questionType === QuestionType.TRUE_FALSE;
        let initialScore: number | '' = '';
        
        if (ans && ans.pointsAwarded !== null && ans.pointsAwarded !== undefined) {
          initialScore = Number(ans.pointsAwarded);
        } else if (isAutoGradedType) {
          if (ans?.isCorrect === true) {
            initialScore = maxPoints;
          } else if (ans?.isCorrect === false) {
            initialScore = 0;
          } else if (ans?.answerGiven) {
            initialScore = isAnswerMatch(q.questionType, ans.answerGiven, q.correctAnswer) ? maxPoints : 0;
          } else {
            initialScore = 0;
          }
        } else if (q.questionType === QuestionType.ESSAY) {
          initialScore = ans?.pointsAwarded !== null && ans?.pointsAwarded !== undefined ? Number(ans.pointsAwarded) : '';
        }

        initial[q.id!] = {
          pointsEarned: initialScore,
          teacherFeedback: ans?.teacherFeedback || '',
          error: undefined,
        };
      });

      setGradesState(initial);
      setGeneralFeedback(submission.teacherFeedback || '');
    }
  }, [submission, questions]);

  const handleScoreChange = (questionId: string, maxPoints: number, rawValue: string) => {
    if (rawValue === '') {
      setGradesState((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          pointsEarned: '',
          error: undefined,
        },
      }));
      return;
    }

    const num = parseFloat(rawValue);
    let errorMsg: string | undefined = undefined;

    if (isNaN(num)) {
      errorMsg = 'يرجى إدخال رقم صحيح';
    } else if (num < 0) {
      errorMsg = 'الدرجة لا يمكن أن تكون سالبة';
    } else if (num > maxPoints) {
      errorMsg = `الدرجة لا يمكن أن تتجاوز (${maxPoints})`;
    }

    setGradesState((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        pointsEarned: isNaN(num) ? '' : num,
        error: errorMsg,
      },
    }));
  };

  const handleFeedbackChange = (questionId: string, feedback: string) => {
    setGradesState((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        teacherFeedback: feedback,
      },
    }));
  };

  const applyPresetScore = (questionId: string, score: number) => {
    setGradesState((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        pointsEarned: score,
        error: undefined,
      },
    }));
  };

  const handleReEvaluate = () => {
    if (!assessment?.id) return;
    reEvaluateAssessment(assessment.id, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const { totalAwardedScore, totalMaxScore, percentage, isPassing, hasAnyError } = useMemo(() => {
    let awarded = 0;
    let max = 0;
    let hasErr = false;

    questions.forEach((q) => {
      const qMax = Number(q.points) || 0;
      max += qMax;

      const qGrade = gradesState[q.id!];
      if (qGrade) {
        if (qGrade.error) {
          hasErr = true;
        }
        if (typeof qGrade.pointsEarned === 'number') {
          awarded += qGrade.pointsEarned;
        }
      }
    });

    const totalAssessmentMax = assessment?.totalScore ? Number(assessment.totalScore) : max;
    const effectiveMax = totalAssessmentMax > 0 ? totalAssessmentMax : max;
    const pct = effectiveMax > 0 ? (awarded / effectiveMax) * 100 : 0;
    const passThreshold = assessment?.passingScore ? Number(assessment.passingScore) : (effectiveMax * 0.5);
    const passes = awarded >= passThreshold;

    return {
      totalAwardedScore: Math.round(awarded * 100) / 100,
      totalMaxScore: effectiveMax,
      percentage: Math.round(pct * 10) / 10,
      isPassing: passes,
      hasAnyError: hasErr,
    };
  }, [questions, gradesState, assessment]);

  const handleSubmitGrades = (e: React.FormEvent) => {
    e.preventDefault();

    if (hasAnyError) {
      toast.error('يرجى تصحيح الدرجات غير الصالحة قبل الحفظ');
      return;
    }

    const payloadGrades: { questionId: string; pointsEarned: number; teacherFeedback?: string }[] = [];

    questions.forEach((q) => {
      const qGrade = gradesState[q.id!];
      const points = typeof qGrade?.pointsEarned === 'number' ? qGrade.pointsEarned : 0;
      payloadGrades.push({
        questionId: q.id!,
        pointsEarned: points,
        teacherFeedback: qGrade?.teacherFeedback?.trim() || undefined,
      });
    });

    gradeSubmission(
      {
        submissionId,
        payload: {
          manualGrades: payloadGrades,
          feedback: generalFeedback.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('تم حفظ واعتماد درجات الطالب بنجاح');
          refetch();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء حفظ الدرجات');
        },
      }
    );
  };

  const isGraded = submission?.status === 'GRADED';

  const getAnswerForQuestion = (questionId: string) => {
    return answers.find((a: any) => a.questionId === questionId);
  };

  const filteredQuestions = useMemo(() => {
    return (questions || []).filter((q: any) => {
      if (activeTab === 'essay') return q.questionType === QuestionType.ESSAY;
      if (activeTab === 'mcq') return q.questionType !== QuestionType.ESSAY;
      return true;
    });
  }, [questions, activeTab]);

  return {
    activeTab,
    setActiveTab,
    gradesState,
    generalFeedback,
    setGeneralFeedback,
    previewModalImg,
    setPreviewModalImg,
    answers,
    assessment,
    isGraded,
    isPending,
    isReEvaluating,
    totalAwardedScore,
    totalMaxScore,
    percentage,
    isPassing,
    hasAnyError,
    filteredQuestions,
    getAnswerForQuestion,
    handleScoreChange,
    handleFeedbackChange,
    applyPresetScore,
    handleReEvaluate,
    handleSubmitGrades,
  };
}
