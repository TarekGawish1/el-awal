'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, X, Save, AlertCircle, MessageSquare, ExternalLink, 
  ImageIcon, Award, CheckCircle2, XCircle, HelpCircle, 
  Maximize2, Sparkles, RefreshCw, UserCheck, Bot
} from 'lucide-react';
import { useSubmissionDetail, useGradeSubmission, useReEvaluateAssessment } from '../hooks/use-assessments';
import { QuestionType, SubmissionStatus } from '../types/assessments.types';
import { parseEssayAnswer } from '../utils/answer-parser';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

interface QuestionGradeState {
  pointsEarned: number | '';
  teacherFeedback: string;
  error?: string;
}

function isAnswerMatch(
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

export function SubmissionDetails({ submissionId }: { submissionId: string }) {
  const { data: submission, isLoading, isError, error, refetch } = useSubmissionDetail(submissionId);
  const { mutate: gradeSubmission, isPending } = useGradeSubmission();
  const { mutate: reEvaluateAssessment, isPending: isReEvaluating } = useReEvaluateAssessment();

  const [activeTab, setActiveTab] = useState<'all' | 'essay' | 'mcq'>('all');
  const [gradesState, setGradesState] = useState<Record<string, QuestionGradeState>>({});
  const [generalFeedback, setGeneralFeedback] = useState<string>('');
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  const assessment = submission?.assessment;
  const questions = useMemo(() => assessment?.questions || [], [assessment]);
  const answers = useMemo(() => submission?.answers || [], [submission]);

  // Initialize grades state when submission loads
  useEffect(() => {
    if (submission && questions.length > 0) {
      const initial: Record<string, QuestionGradeState> = {};
      const answerMap = new Map((submission.answers || []).map(a => [a.questionId, a]));

      questions.forEach((q) => {
        const ans = answerMap.get(q.id!);
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

  const getAnswerForQuestion = (questionId: string) => {
    return answers.find(a => a.questionId === questionId);
  };

  // Handle per-question points change with validation
  const handleScoreChange = (questionId: string, maxPoints: number, rawValue: string) => {
    if (rawValue === '') {
      setGradesState(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          pointsEarned: '',
          error: undefined,
        }
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

    setGradesState(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        pointsEarned: isNaN(num) ? '' : num,
        error: errorMsg,
      }
    }));
  };

  // Handle per-question feedback change
  const handleFeedbackChange = (questionId: string, feedback: string) => {
    setGradesState(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        teacherFeedback: feedback,
      }
    }));
  };

  // Quick preset shortcuts
  const applyPresetScore = (questionId: string, score: number) => {
    setGradesState(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        pointsEarned: score,
        error: undefined,
      }
    }));
  };

  // Trigger batch re-evaluation
  const handleReEvaluate = () => {
    if (!assessment?.id) return;
    reEvaluateAssessment(assessment.id, {
      onSuccess: () => {
        refetch();
      }
    });
  };

  // Dynamic Live Calculation
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

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !submission) {
    return (
      <Alert variant="error" className="max-w-3xl mx-auto my-8" dir="rtl">
        <AlertCircle className="w-5 h-5 ml-2" />
        <p>{(error as any)?.message || 'فشل في تحميل تفاصيل الإجابة'}</p>
      </Alert>
    );
  }

  const isGraded = submission.status === SubmissionStatus.GRADED;
  const hasEssayQuestions = questions.some(q => q.questionType === QuestionType.ESSAY);

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
        }
      }
    );
  };

  const filteredQuestions = questions.filter(q => {
    if (activeTab === 'essay') return q.questionType === QuestionType.ESSAY;
    if (activeTab === 'mcq') return q.questionType !== QuestionType.ESSAY;
    return true;
  });

  return (
    <div className="space-y-6 pb-32 max-w-5xl mx-auto" dir="rtl">
      {/* Lightbox Image Preview Modal */}
      {previewModalImg && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-4 left-4 bg-slate-900/70 hover:bg-slate-900 text-white p-2 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewModalImg} 
              alt="صورة الحل المرفقة" 
              className="max-h-[85vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Main Student Submission Overview Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden relative">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isGraded ? 'success' : 'warning'} className="text-xs px-3 py-1 font-bold">
                  {isGraded ? '✓ تم اعتماد التصحيح' : '⏳ بانتظار الاعتماد'}
                </Badge>
                {submission.isAutoGraded && (
                  <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-800 bg-emerald-50 font-bold flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" />
                    مصصح تلقائياً بالكامل
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs border-slate-200 text-slate-700 bg-slate-50">
                  {assessment?.type === 'ASSIGNMENT' ? 'واجب منزلي' : 'اختبار دراسي'}
                </Badge>
                {submission.attemptNumber && (
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
                    المحاولة رقم: {submission.attemptNumber}
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>إجابة الطالب:</span>
                <span className="text-primary-700">{submission.student?.user?.fullName || 'طالب'}</span>
              </h1>
              <p className="text-sm text-slate-500 font-medium">{assessment?.title}</p>
              
              {submission.submittedAt && (
                <p className="text-xs text-slate-400">
                  تاريخ التسليم: {formatArabicDate(submission.submittedAt)} - {formatArabicTime(submission.submittedAt)}
                </p>
              )}
            </div>

            {/* Live Dynamic Score Box & Re-evaluate button */}
            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/80 rounded-2xl p-5 w-full md:w-auto min-w-[260px] shadow-xs">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-xs font-bold text-slate-500">الدرجة المحسوبة المباشرة:</span>
                  <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                    isPassing 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {isPassing ? 'ناجح' : 'راسب'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-slate-900">
                    {totalAwardedScore}
                  </span>
                  <span className="text-sm font-bold text-slate-400">
                    / {totalMaxScore} درجة
                  </span>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">النسبة المئوية:</span>
                  <span className={`font-mono font-extrabold text-sm ${isPassing ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {percentage}%
                  </span>
                </div>
              </div>

              {assessment?.id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isReEvaluating}
                  onClick={handleReEvaluate}
                  className="text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer self-stretch md:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReEvaluating ? 'animate-spin' : ''}`} />
                  <span>إعادة التصحيح التلقائي للاختبار</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'all' 
                ? 'bg-white shadow-xs text-primary-700 border border-slate-200' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            جميع الأسئلة ({questions.length})
          </button>
          {hasEssayQuestions && (
            <button
              type="button"
              onClick={() => setActiveTab('essay')}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'essay' 
                  ? 'bg-white shadow-xs text-primary-700 border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              الأسئلة المقالية ({questions.filter(q => q.questionType === QuestionType.ESSAY).length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('mcq')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'mcq' 
                ? 'bg-white shadow-xs text-primary-700 border border-slate-200' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            أسئلة الاختيار والصواب/خطأ ({questions.filter(q => q.questionType !== QuestionType.ESSAY).length})
          </button>
        </div>
      </div>

      {/* Questions Grading Form */}
      <form onSubmit={handleSubmitGrades} className="space-y-6">
        {filteredQuestions.map((question) => {
          const qId = question.id!;
          const answer = getAnswerForQuestion(qId);
          const maxPoints = Number(question.points) || 1;
          const qGrade = gradesState[qId] || { pointsEarned: '', teacherFeedback: '' };
          const isAutoGradedType = question.questionType === QuestionType.MULTIPLE_CHOICE || question.questionType === QuestionType.TRUE_FALSE;
          const isEssay = question.questionType === QuestionType.ESSAY;

          const hasAnswer = Boolean(answer?.answerGiven && answer.answerGiven.trim().length > 0);
          const isCorrect = isAutoGradedType && hasAnswer && (
            answer?.isCorrect === true || isAnswerMatch(question.questionType, answer?.answerGiven, question.correctAnswer)
          );

          return (
            <div 
              key={qId} 
              className={`bg-white rounded-2xl border shadow-xs transition-all overflow-hidden ${
                qGrade.error 
                  ? 'border-red-400 ring-2 ring-red-100' 
                  : isAutoGradedType
                    ? (hasAnswer ? (isCorrect ? 'border-emerald-200' : 'border-rose-200') : 'border-slate-200')
                    : 'border-slate-200'
              }`}
            >
              {/* Question Top Bar */}
              <div className="p-5 md:p-6 border-b border-slate-100">
                <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-700 font-extrabold flex items-center justify-center shrink-0 text-sm">
                      {question.questionNumber}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-600 font-medium">
                          {isEssay ? 'سؤال مقالي' : question.questionType === QuestionType.TRUE_FALSE ? 'صواب أو خطأ' : 'اختيار من متعدد'}
                        </Badge>

                        {/* Automatic Grading Status Badge */}
                        {isAutoGradedType && (
                          hasAnswer ? (
                            isCorrect ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                إجابة صحيحة (تم التصحيح تلقائياً)
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                إجابة خاطئة (تم التصحيح تلقائياً)
                              </Badge>
                            )
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1">
                              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                              متروك بدون إجابة (صفر)
                            </Badge>
                          )
                        )}

                        {isEssay && (
                          <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            سؤال مقالي (يتطلب تقييم المعلم)
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-base md:text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {question.questionText}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-slate-100 text-slate-800 font-mono font-bold text-xs px-2.5 py-1">
                      الدرجة المخصصة: {maxPoints}
                    </Badge>
                  </div>
                </div>

                {/* Pre-defined Correct Answer for Teacher reference */}
                {isAutoGradedType && question.correctAnswer && (
                  <div className="mr-11 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center gap-2 text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold">الإجابة النموذجية الصحيحة:</span>
                    <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {question.questionType === QuestionType.TRUE_FALSE 
                        ? (['true', 'صح', 'صحيحة', 'صواب', '1'].includes(question.correctAnswer.trim().toLowerCase()) ? 'صح / صواب' : 'خطأ')
                        : question.correctAnswer}
                    </span>
                  </div>
                )}

                {/* Student's Given Answer Section */}
                <div className="mr-11 mt-3">
                  <span className="text-xs font-bold text-slate-500 block mb-1.5">إجابة الطالب:</span>
                  {hasAnswer ? (
                    <div className={`p-4 rounded-xl border ${
                      isAutoGradedType
                        ? (isCorrect ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-rose-50/70 border-rose-300 text-rose-950')
                        : 'bg-slate-50/70 border-slate-200 text-slate-800'
                    }`}>
                      {question.questionType === QuestionType.TRUE_FALSE && (
                        <div className="font-bold text-sm flex items-center gap-2">
                          {['true', 'صح', 'صحيحة', 'صواب', '1'].includes(answer!.answerGiven!.trim().toLowerCase()) ? (
                            <span className="text-emerald-800 flex items-center gap-1">✓ إجابة الطالب: صواب / صحيحة</span>
                          ) : (
                            <span className="text-rose-800 flex items-center gap-1">✗ إجابة الطالب: خطأ</span>
                          )}
                        </div>
                      )}

                      {question.questionType === QuestionType.MULTIPLE_CHOICE && (
                        <div className="font-bold text-sm">
                          {answer!.answerGiven}
                        </div>
                      )}

                      {isEssay && (() => {
                        const { text, imageUrl } = parseEssayAnswer(answer!.answerGiven);
                        return (
                          <div className="space-y-3">
                            {text ? (
                              <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-800">
                                {text}
                              </div>
                            ) : null}

                            {imageUrl ? (
                              <div className="pt-2 border-t border-slate-200/60">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                    <ImageIcon className="w-4 h-4 text-primary-600" />
                                    صورة الحل المرفقة من الطالب:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewModalImg(imageUrl)}
                                    className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 bg-primary-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    تكبير الصورة
                                  </button>
                                </div>
                                <div 
                                  className="rounded-xl overflow-hidden border border-slate-200 bg-white max-w-sm p-1 shadow-2xs cursor-zoom-in group"
                                  onClick={() => setPreviewModalImg(imageUrl)}
                                >
                                  <img
                                    src={imageUrl}
                                    alt="إجابة الطالب"
                                    className="max-h-60 w-auto rounded-lg object-contain mx-auto group-hover:opacity-95 transition-opacity"
                                  />
                                </div>
                              </div>
                            ) : null}

                            {!text && !imageUrl && (
                              <span className="text-slate-400 italic text-xs">لم يتم إدخال نص أو صورة</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 text-xs italic">
                      لم يقم الطالب بالإجابة على هذا السؤال
                    </div>
                  )}
                </div>
              </div>

              {/* Per-Question Grading Controls Box */}
              <div className="bg-slate-50/90 p-4 md:p-5 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Score input & shortcuts */}
                  <div className="md:col-span-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="block text-xs font-bold text-slate-700">
                        الدرجة الممنوحة <span className="text-red-500">*</span>
                      </Label>
                      {isAutoGradedType && (
                        <span className="text-[11px] text-slate-500 font-semibold">
                          (تعديل / اعتماد)
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        step="any"
                        min={0}
                        max={maxPoints}
                        value={qGrade.pointsEarned}
                        onChange={(e) => handleScoreChange(qId, maxPoints, e.target.value)}
                        placeholder="0"
                        className={`font-mono font-bold text-base text-left pl-14 ${
                          qGrade.error ? 'border-red-500 bg-red-50/50' : 'bg-white'
                        }`}
                      />
                      <div className="absolute left-3 text-xs font-bold font-mono text-slate-400 pointer-events-none">
                        / {maxPoints}
                      </div>
                    </div>
                    {qGrade.error && (
                      <p className="text-red-500 text-xs font-medium">{qGrade.error}</p>
                    )}

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => applyPresetScore(qId, maxPoints)}
                        className="text-[11px] font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        الدرجة كاملة ({maxPoints})
                      </button>
                      {maxPoints > 1 && (
                        <button
                          type="button"
                          onClick={() => applyPresetScore(qId, maxPoints / 2)}
                          className="text-[11px] font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          نصفها ({maxPoints / 2})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => applyPresetScore(qId, 0)}
                        className="text-[11px] font-bold px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        صفر (0)
                      </button>
                    </div>
                  </div>

                  {/* Per-question teacher feedback */}
                  <div className="md:col-span-8 space-y-2">
                    <Label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>تعليق المعلم على هذا السؤال (اختياري)</span>
                    </Label>
                    <Input
                      type="text"
                      value={qGrade.teacherFeedback}
                      onChange={(e) => handleFeedbackChange(qId, e.target.value)}
                      placeholder="ملاحظات وتوجيهات للطالب على هذه النقطة..."
                      className="bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* General Teacher Feedback Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-3">
          <Label className="block font-bold text-sm text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>ملاحظات وتقييم عام على تسليم الاختبار (اختياري)</span>
          </Label>
          <Textarea
            rows={3}
            value={generalFeedback}
            onChange={(e) => setGeneralFeedback(e.target.value)}
            placeholder="اكتب رسالة أو ملاحظات عامة للطالب تظهر له مع النتيجة..."
            className="text-sm"
          />
        </div>

        {/* Sticky Live Summary Footer Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 shadow-2xl z-40">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
            {/* Live Totals Display */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">إجمالي الدرجات:</span>
                <span className="font-mono font-extrabold text-lg text-slate-900">
                  {totalAwardedScore} / {totalMaxScore}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">النسبة:</span>
                <span className={`font-mono font-extrabold text-base ${isPassing ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {percentage}%
                </span>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                  isPassing ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isPassing ? 'ناجح' : 'راسب'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="submit"
                disabled={isPending || hasAnyError}
                className={`w-full sm:w-auto px-8 font-bold text-sm shadow-sm cursor-pointer ${
                  hasAnyError ? 'opacity-60 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                <Save className="w-4 h-4 ml-2" />
                {isPending ? 'جاري حفظ واعتماد الدرجات...' : 'حفظ واعتماد الدرجات'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default SubmissionDetails;

