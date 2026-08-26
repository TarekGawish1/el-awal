'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Check, X, Save, AlertCircle, MessageSquare, ExternalLink, ImageIcon } from 'lucide-react';
import { useSubmissionDetail, useGradeSubmission } from '../hooks/use-assessments';
import { QuestionType, SubmissionStatus } from '../types/assessments.types';
import { parseEssayAnswer } from '../utils/answer-parser';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

interface GradingFormValues {
  manualGrades: {
    questionId: string;
    pointsEarned: number;
    teacherFeedback?: string;
  }[];
}

export function SubmissionDetails({ submissionId }: { submissionId: string }) {
  const { data: submission, isLoading, isError, error } = useSubmissionDetail(submissionId);
  const { mutate: gradeSubmission, isPending } = useGradeSubmission();
  const [activeTab, setActiveTab] = useState<'all' | 'needs-grading'>('all');

  const { control, handleSubmit, register, formState: { errors } } = useForm<GradingFormValues>({
    defaultValues: { manualGrades: [] },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !submission) {
    return (
      <Alert variant="error">
        <AlertCircle className="w-5 h-5 ml-2" />
        <p>{(error as any)?.message || 'فشل في تحميل تفاصيل الإجابة'}</p>
      </Alert>
    );
  }

  const assessment = submission.assessment;
  const questions = assessment.questions || [];
  const answers = submission.answers || [];

  const getAnswerForQuestion = (questionId: string) => {
    return answers.find(a => a.questionId === questionId);
  };

  const isGraded = submission.status === SubmissionStatus.GRADED;
  const needsManualGrading = questions.some(q => q.questionType === QuestionType.ESSAY);

  const onSubmit = (data: GradingFormValues) => {
    // Only send grades for answers that are actually provided in the form
    const validGrades = data.manualGrades.filter(g => g && g.questionId && g.pointsEarned !== undefined);
    
    if (validGrades.length === 0) {
      toast.error('لا يوجد تقييمات للحفظ');
      return;
    }

    gradeSubmission(
      { submissionId, payload: { manualGrades: validGrades } },
      {
        onSuccess: () => {
          toast.success('تم حفظ التقييم بنجاح');
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء التقييم');
        }
      }
    );
  };

  const filteredQuestions = activeTab === 'needs-grading' 
    ? questions.filter(q => q.questionType === QuestionType.ESSAY)
    : questions;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant={isGraded ? 'success' : 'warning'}>
                  {isGraded ? 'تم التصحيح' : 'بانتظار التصحيح'}
                </Badge>
                {isGraded && (
                  <Badge variant={submission.isPassed ? 'success' : 'error'} className="font-bold">
                    {submission.scoreObtained} / {assessment.totalScore}
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-800">
                إجابة الطالب: {submission.student?.user?.fullName}
              </h1>
              <p className="text-slate-500 mt-1">{assessment.title}</p>
            </div>
            
            {needsManualGrading && (
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium text-amber-800">هذا الاختبار يحتوي على أسئلة مقالية تتطلب التصحيح اليدوي</span>
              </div>
            )}
          </div>
        </div>
        
        {needsManualGrading && (
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex gap-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${activeTab === 'all' ? 'bg-white shadow-sm border border-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              جميع الأسئلة
            </button>
            <button
              onClick={() => setActiveTab('needs-grading')}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${activeTab === 'needs-grading' ? 'bg-white shadow-sm border border-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              الأسئلة المقالية فقط
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {filteredQuestions.map((question, index) => {
          const answer = getAnswerForQuestion(question.id!);
          const isAutoGradedType = question.questionType === QuestionType.MULTIPLE_CHOICE || question.questionType === QuestionType.TRUE_FALSE;
          
          return (
            <div key={question.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3">
                    <div className="bg-slate-100 text-slate-600 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                      {question.questionNumber}
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 whitespace-pre-wrap">
                      {question.questionText}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mr-4">
                    <Badge variant="default" className="bg-slate-50 text-slate-700">
                      الدرجة: {question.points}
                    </Badge>
                  </div>
                </div>

                {/* Display Correct Answer for Teacher Reference */}
                {isAutoGradedType && question.correctAnswer && (
                  <div className="mr-11 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex gap-2">
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                    <div>
                      <span className="text-sm font-bold text-slate-600 block mb-1">الإجابة الصحيحة المحددة مسبقاً:</span>
                      <span className="text-slate-800 font-medium">
                        {question.questionType === QuestionType.TRUE_FALSE 
                          ? (question.correctAnswer === 'true' ? 'صحيحة' : 'خاطئة')
                          : question.correctAnswer}
                      </span>
                    </div>
                  </div>
                )}

                {/* Student's Answer */}
                <div className="mr-11 mt-4">
                  <span className="text-sm font-bold text-slate-600 block mb-2">إجابة الطالب:</span>
                  {answer?.answerGiven ? (
                    <div className={`p-4 rounded-xl border ${
                      isAutoGradedType 
                        ? (answer.isCorrect ? 'bg-green-50/50 border-green-200 text-green-900' : 'bg-red-50/50 border-red-200 text-red-900')
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      {question.questionType === QuestionType.TRUE_FALSE && (
                        <div className="font-bold text-base">
                          {answer.answerGiven === 'true' ? 'صحيحة' : 'خاطئة'}
                        </div>
                      )}
                      {question.questionType === QuestionType.MULTIPLE_CHOICE && (
                        <div className="font-medium text-slate-800">
                          {answer.answerGiven}
                        </div>
                      )}
                      {question.questionType === QuestionType.ESSAY && (
                        (() => {
                          const { text, imageUrl } = parseEssayAnswer(answer.answerGiven);
                          return (
                            <div className="space-y-4">
                              {text ? (
                                <div className="whitespace-pre-wrap font-medium text-slate-800 leading-relaxed">
                                  {text}
                                </div>
                              ) : null}
                              {imageUrl ? (
                                <div className="pt-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                      <ImageIcon className="w-4 h-4 text-primary-600" />
                                      صورة الحل المرفقة من الطالب:
                                    </span>
                                    <a
                                      href={imageUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1 bg-primary-50 px-2.5 py-1 rounded-lg transition-colors"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      فتح في نافذة جديدة
                                    </a>
                                  </div>
                                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-w-lg p-1.5 shadow-2xs">
                                    <a href={imageUrl} target="_blank" rel="noreferrer" className="block cursor-zoom-in">
                                      <img
                                        src={imageUrl}
                                        alt="إجابة الطالب"
                                        className="max-h-80 w-auto rounded-lg object-contain mx-auto"
                                      />
                                    </a>
                                  </div>
                                </div>
                              ) : null}
                              {!text && !imageUrl && (
                                <span className="text-slate-400 italic">لم يتم إدخال إجابة</span>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 italic">
                      لم يقم الطالب بالإجابة على هذا السؤال
                    </div>
                  )}
                </div>
              </div>

              {/* Grading / Result Section */}
              <div className="bg-slate-50 p-4 px-5 sm:px-6 md:pr-16 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {isAutoGradedType ? (
                  <div className="flex items-center gap-3">
                    {answer?.isCorrect === true && (
                      <div className="flex items-center gap-2 text-green-600 font-bold bg-green-100 px-3 py-1.5 rounded-lg border border-green-200">
                        <Check className="w-4 h-4" />
                        صحيحة ({answer?.pointsAwarded} / {question.points})
                      </div>
                    )}
                    {answer?.isCorrect === false && (
                      <div className="flex items-center gap-2 text-red-600 font-bold bg-red-100 px-3 py-1.5 rounded-lg border border-red-200">
                        <X className="w-4 h-4" />
                        خاطئة (0 / {question.points})
                      </div>
                    )}
                    {!answer?.answerGiven && (
                      <div className="flex items-center gap-2 text-slate-500 font-bold bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300">
                        <X className="w-4 h-4" />
                        متروك (0 / {question.points})
                      </div>
                    )}
                  </div>
                ) : (
                  // Manual Grading Form
                  <div className="w-full space-y-4">
                    {answer && (
                      <>
                        <input type="hidden" {...register(`manualGrades.${index}.questionId`)} value={question.id} />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="sm:col-span-1">
                            <Label className="mb-2 block">الدرجة الممنوحة</Label>
                            <div className="relative">
                              <Input 
                                type="number" 
                                step="0.5"
                                min={0}
                                max={question.points}
                                defaultValue={answer.pointsAwarded ?? ''}
                                {...register(`manualGrades.${index}.pointsEarned`, { 
                                  valueAsNumber: true,
                                  max: { value: question.points, message: `أقصى درجة هي ${question.points}` },
                                  min: { value: 0, message: 'لا يمكن أن تكون سالبة' }
                                })}
                                className={errors.manualGrades?.[index]?.pointsEarned ? 'border-red-500' : ''}
                              />
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                / {question.points}
                              </div>
                            </div>
                            {errors.manualGrades?.[index]?.pointsEarned && (
                              <p className="text-red-500 text-xs mt-1">{errors.manualGrades?.[index]?.pointsEarned?.message}</p>
                            )}
                          </div>
                          
                          <div className="sm:col-span-3">
                            <Label className="mb-2 block flex items-center gap-1">
                              <MessageSquare className="w-4 h-4 text-slate-400" />
                              تعليق المعلم (اختياري)
                            </Label>
                            <Input 
                              placeholder="أضف تعليقاً يراه الطالب..."
                              defaultValue={answer.teacherFeedback || ''}
                              {...register(`manualGrades.${index}.teacherFeedback`)}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {!answer && (
                      <div className="text-sm text-slate-500">لا يمكن تقييم سؤال لم تتم الإجابة عليه (الدرجة صفر تلقائياً)</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">لا توجد أسئلة مقالية تتطلب التصحيح اليدوي في هذا الاختبار.</p>
          </div>
        )}

        {/* Floating Save Bar for Manual Grading */}
        {needsManualGrading && filteredQuestions.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40">
            <div className="max-w-5xl mx-auto flex justify-between items-center px-4">
              <div className="hidden sm:block text-slate-600 text-sm">
                تأكد من إدخال الدرجات لجميع الأسئلة المقالية
              </div>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto px-8">
                <Save className="w-4 h-4 ml-2" />
                {isPending ? 'جاري الحفظ...' : 'حفظ الدرجات'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
