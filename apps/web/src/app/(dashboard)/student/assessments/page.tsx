'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessments, useAssessment, useSubmitAssessment } from '@/features/assessments/hooks/use-assessments';
import { coursesApi } from '@/features/courses/api/courses.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import {
  FileText, Calendar, Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronLeft, Award, Play, HelpCircle, Send, Check, AlertTriangle, ArrowLeft, RefreshCcw
} from 'lucide-react';
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import toast from 'react-hot-toast';

export default function StudentAssessmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        </div>
      }
    >
      <StudentAssessmentsContent />
    </Suspense>
  );
}

function StudentAssessmentsContent() {
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramId = searchParams.get('id') || searchParams.get('assessmentId');
  const returnUrl = searchParams.get('returnUrl');
  const courseId = searchParams.get('courseId');
  const lessonId = searchParams.get('lessonId');
  const retakeParam = searchParams.get('retake') === '1';

  const [filterType, setFilterType] = useState<'ALL' | 'EXAM' | 'ASSIGNMENT'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const { data: assessmentsData, isLoading, isError } = useAssessments();
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(paramId || null);
  const [activeMode, setActiveMode] = useState<'NONE' | 'SOLVE' | 'REVIEW'>(paramId ? 'SOLVE' : 'NONE');

  useEffect(() => {
    if (paramId) {
      setActiveAssessmentId(paramId);
      setActiveMode('SOLVE');
    }
  }, [paramId]);

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName="الواجبات والاختبارات"
        description="حل الواجبات والاختبارات التفاعلية ومتابعة الدرجات تتطلب اتصالاً نشطاً بالخادم."
        backHref="/student/dashboard"
      />
    );
  }

  const PAGE_SIZE = 6;

  const assessments = assessmentsData?.data || [];

  const filteredAssessments = assessments.filter((item: any) => {
    if (filterType === 'ALL') return true;
    return item.type === filterType;
  });

  const totalPages = Math.ceil(filteredAssessments.length / PAGE_SIZE);
  const paginatedAssessments = filteredAssessments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getStatus = (item: any) => {
    // In nextjs api, we can fetch the detailed assessment to check user submission.
    // For list rendering, we can fallback to checking target metadata or dueDate.
    const isPastDue = item.dueDate ? new Date(item.dueDate) < new Date() : false;
    return {
      isPastDue,
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="error">
        <AlertTriangle className="w-5 h-5 ml-2" />
        <p>حدث خطأ أثناء تحميل الاختبارات والواجبات. يرجى المحاولة لاحقاً.</p>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {activeMode === 'NONE' ? (
        <>
          {/* Header */}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">الواجبات والاختبارات</h1>
            <p className="text-sm text-slate-500 mt-1">حل الواجبات المدرسية والاختبارات المخصصة لك ومتابعة الدرجات والنتائج</p>
          </div>

          {/* Filters */}
          <div className="flex bg-slate-100 p-1 rounded-xl max-w-sm">
            <button
              onClick={() => {
                setFilterType('ALL');
                setCurrentPage(1);
              }}
              className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => {
                setFilterType('EXAM');
                setCurrentPage(1);
              }}
              className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === 'EXAM' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              الاختبارات
            </button>
            <button
              onClick={() => {
                setFilterType('ASSIGNMENT');
                setCurrentPage(1);
              }}
              className={`flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === 'ASSIGNMENT' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              الواجبات
            </button>
          </div>

          {/* Grid list */}
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200/60">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">لا توجد واجبات أو اختبارات مضافة حالياً.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedAssessments.map((item: any) => {
                  const { isPastDue } = getStatus(item);
                  const isExam = item.type === 'EXAM';
                  return (
                    <Card key={item.id} className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-500 to-primary-600"></div>
                      <CardContent className="p-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <Badge variant={isExam ? 'error' : 'default'} className={isExam ? 'bg-error-50 text-error-800' : 'bg-primary-50 text-primary-700'}>
                              {isExam ? 'اختبار' : 'واجب'}
                            </Badge>
                            <Badge variant="outline" className="font-semibold">
                              {item.totalScore} درجة
                            </Badge>
                          </div>
                          
                          <h3 className="text-lg font-bold text-slate-800 leading-snug line-clamp-1">{item.title}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.description || 'لا يوجد وصف متاح.'}</p>
                          
                          <div className="pt-2 flex flex-col gap-1.5 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>المدة: {item.durationMinutes ? `${item.durationMinutes} دقيقة` : 'غير محدد'}</span>
                            </div>
                            {item.dueDate && (
                              <div className={`flex items-center gap-1.5 ${isPastDue ? 'text-rose-600' : ''}`}>
                                <Calendar className="w-3.5 h-3.5" />
                                <span>تاريخ التسليم: {formatArabicDate(item.dueDate)} - {formatArabicTime(item.dueDate)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-primary-600 font-semibold mt-1">
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>المجموعة: {item.group?.name || item.course?.title || 'عام'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-5 border-t border-slate-100 mt-4 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-400 font-medium">
                            {item._count?.questions || 0} أسئلة
                          </span>
                          
                          <Button
                            onClick={() => {
                              setActiveAssessmentId(item.id);
                              // Open solver or review based on detailed fetch.
                              // We will load the details in components which handle review/solve.
                              setActiveMode('SOLVE'); 
                            }}
                            size="sm"
                            className="rounded-xl px-4 text-xs font-semibold cursor-pointer"
                          >
                            <Play className="w-3 h-3 ml-1.5" />
                            عرض وتفاصيل
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredAssessments.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                  itemLabel="اختبار/واجب"
                />
              )}
            </div>
          )}
        </>
      ) : (
        <AssessmentWrapper
          assessmentId={activeAssessmentId!}
          returnUrl={returnUrl}
          courseId={courseId}
          lessonId={lessonId}
          initialRetake={retakeParam}
          onBack={() => {
            if (returnUrl) {
              router.push(returnUrl);
            } else {
              setActiveAssessmentId(null);
              setActiveMode('NONE');
            }
          }} 
        />
      )}
    </div>
  );
}

function AssessmentWrapper({
  assessmentId,
  returnUrl,
  courseId,
  lessonId,
  initialRetake,
  onBack
}: {
  assessmentId: string;
  returnUrl?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  initialRetake?: boolean;
  onBack: () => void;
}) {
  const router = useRouter();
  const { data: assessment, isLoading, isError, refetch } = useAssessment(assessmentId);
  const { mutate: submit, isPending: isSubmitting } = useSubmitAssessment();
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [localSubmission, setLocalSubmission] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  // When true, the student is (re)taking the quiz even though a prior attempt exists.
  const [retakeMode, setRetakeMode] = useState<boolean>(Boolean(initialRetake));

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Never allow retake UI for single-attempt quizzes (guards a hand-crafted &retake=1 URL).
  useEffect(() => {
    if (assessment && !assessment.allowMultipleAttempts) {
      setRetakeMode(false);
    }
  }, [assessment]);

  useEffect(() => {
    // Arm the timer for a fresh attempt: no prior submission, OR an in-progress retake.
    if (
      assessment &&
      assessment.durationMinutes &&
      !localSubmission &&
      (retakeMode || !assessment.mySubmission)
    ) {
      const minutes = Number(assessment.durationMinutes);
      setTimeLeft(minutes * 60);
    } else {
      setTimeLeft(null);
    }
  }, [assessment, localSubmission, retakeMode]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  // Begin a new attempt: drop the prior result locally, clear answers, re-arm the timer.
  const startRetake = () => {
    setLocalSubmission(null);
    setAnswers({});
    setShowResultModal(false);
    setRetakeMode(true);
  };

  const buildSubmitPayload = () => {
    const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
      questionId: qId,
      answerGiven: val,
    }));
    return { answers: formattedAnswers };
  };

  const notifyCourseLessonProgress = async (subData?: any) => {
    const targetLessonId = lessonId || (assessment as any)?.lessonId || subData?.lessonId;
    const targetCourseId = courseId || (assessment as any)?.courseId || subData?.courseId;

    if (targetCourseId && targetLessonId && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`el_awal_course_progress_${targetCourseId}`);
        const list = saved ? JSON.parse(saved) : [];
        const updated = Array.isArray(list) ? Array.from(new Set([...list, targetLessonId])) : [targetLessonId];
        localStorage.setItem(`el_awal_course_progress_${targetCourseId}`, JSON.stringify(updated));
      } catch {}
    }

    if (targetLessonId) {
      try {
        await coursesApi.updateLessonProgress(targetLessonId, {
          isCompleted: true,
          lastPositionSeconds: 0,
        });
      } catch {}
    }
  };

  const handleAutoSubmit = () => {
    toast.error('انتهى الوقت المحدد للاختبار! جاري تسليم إجاباتك تلقائياً...');
    const payload = buildSubmitPayload();
    submit(
      { id: assessmentId, payload },
      {
        onSuccess: (result: any) => {
          toast.success('تم تسليم إجاباتك بنجاح.');
          setTimeLeft(null);
          setRetakeMode(false);
          const subData = result?.data || result;
          setLocalSubmission(subData);
          setShowResultModal(true);
          notifyCourseLessonProgress(subData);
          refetch();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء تسليم الإجابات.');
        }
      }
    );
  };

  const handleSubmitAnswers = () => {
    setIsConfirmOpen(true);
  };

  const confirmSubmit = () => {
    const payload = buildSubmitPayload();
    submit(
      { id: assessmentId, payload },
      {
        onSuccess: (result: any) => {
          toast.success('تم تسليم الإجابات بنجاح وتم رصد النتيجة!');
          setIsConfirmOpen(false);
          setTimeLeft(null);
          setRetakeMode(false);
          const subData = result?.data || result;
          setLocalSubmission(subData);
          setShowResultModal(true);
          notifyCourseLessonProgress(subData);
          refetch();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء تسليم الإجابات.');
        }
      }
    );
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !assessment) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack} size="sm">رجوع</Button>
        <Alert variant="error">فشل في تحميل تفاصيل الاختبار.</Alert>
      </div>
    );
  }

  const isExam = assessment.type === 'EXAM';
  const mySubmission = localSubmission || assessment.mySubmission;
  const isPastDue = assessment.dueDate ? new Date(assessment.dueDate) < new Date() : false;
  const allowMultipleAttempts = Boolean(assessment.allowMultipleAttempts);
  // Offer a retake when the quiz permits it, a prior attempt exists, and we're not
  // already mid-retake or past the due date.
  const canRetake = allowMultipleAttempts && Boolean(mySubmission) && !retakeMode && !isPastDue;

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Top action bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
        <button onClick={onBack} className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer">
          <ChevronLeft className="w-5 h-5 ml-1" />
          {returnUrl ? 'العودة لقاعة الدرس في الكورس' : 'الرجوع لقائمة الاختبارات'}
        </button>

        {timeLeft !== null && !mySubmission && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-1.5 rounded-full text-sm font-bold font-mono">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>الوقت المتبقي: {formatTimer(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Overview Card */}
      <Card className="border-none shadow-sm shadow-slate-200/50 bg-gradient-to-br from-white to-slate-50/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={isExam ? 'error' : 'default'} className={isExam ? 'bg-error-50 text-error-800 border-none' : 'bg-primary-50 text-primary-700 border-none'}>
                {isExam ? 'اختبار دراسي' : 'واجب منزلي'}
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-white/70">
                درجة النجاح: {assessment.passingScore || 'غير محدد'} / {assessment.totalScore}
              </Badge>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">{assessment.title}</h2>
            <p className="text-sm text-slate-500 max-w-xl">{assessment.description || 'لا يوجد وصف مضاف لهذا الاختبار.'}</p>
          </div>

          <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
            {mySubmission && !retakeMode ? (
              mySubmission.status === 'GRADED' ? (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-600 block">درجتك المحصلة</span>
                    <span className="text-2xl font-extrabold text-slate-800 font-mono leading-none mt-1 inline-block">
                      {mySubmission.scoreObtained}
                    </span>
                    <span className="text-xs text-slate-400 font-medium"> / {assessment.totalScore} درجة</span>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
                  <div>
                    <span className="text-sm font-bold text-blue-700 block">تم تسليم الإجابات</span>
                    <span className="text-xs text-slate-500 mt-1 block">قيد المراجعة والتصحيح من قبل المعلم.</span>
                  </div>
                </div>
              )
            ) : isPastDue ? (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <div>
                  <span className="text-sm font-bold text-rose-700 block">فات موعد التسليم</span>
                  <span className="text-xs text-slate-500 mt-0.5 block">لم تعد قادراً على تسليم هذا الاختبار.</span>
                </div>
              </div>
            ) : retakeMode ? (
              <div className="bg-primary-50 border border-primary-100 p-4 rounded-2xl flex items-center gap-3">
                <RefreshCcw className="w-5 h-5 text-primary-600" />
                <div>
                  <span className="text-sm font-bold text-primary-700 block">محاولة جديدة قيد التقدم</span>
                  <span className="text-xs text-slate-500 mt-0.5 block">تُحتسب أعلى درجة بين محاولاتك كدرجة رسمية.</span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <span className="text-sm font-bold text-amber-700 block">متاح للحل الآن</span>
                  <span className="text-xs text-slate-500 mt-0.5 block">آخر موعد: {assessment.dueDate ? formatArabicDate(assessment.dueDate) : 'مفتوح'}</span>
                </div>
              </div>
            )}

            {canRetake && (
              <Button
                variant="outline"
                size="sm"
                onClick={startRetake}
                className="rounded-xl font-bold text-primary-700 border-primary-200 hover:bg-primary-50 flex items-center justify-center gap-1.5"
              >
                <RefreshCcw className="w-4 h-4" />
                إعادة المحاولة
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Solver or Review Board */}
      {(!mySubmission || retakeMode) ? (
        isPastDue ? (
          <Card className="border-slate-100 shadow-2xs">
            <CardContent className="p-8 text-center flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
              <h3 className="text-lg font-bold text-slate-700">لقد تجاوزت تاريخ الاستحقاق المقرَّر للحل</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">لم تقم بحل هذا الواجب قبل انتهاء المدة المخصصة، يرجى مراجعة المعلم الخاص بك.</p>
            </CardContent>
          </Card>
        ) : (
          /* Question Solver Form */
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary-600" />
              قائمة الأسئلة ({assessment.questions?.length || 0})
            </h3>
            
            <div className="space-y-5">
              {assessment.questions?.map((question: any, idx: number) => (
                <div key={question.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs relative">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-slate-100 text-slate-600 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                        {question.questionNumber}
                      </div>
                      <div>
                        <h4 className="text-md font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{question.questionText}</h4>
                        
                        {question.imageUrl && (
                          <div className="mt-4 rounded-xl overflow-hidden border border-slate-150 max-w-md">
                            <img src={question.imageUrl} alt="Question" className="w-full h-auto object-contain" />
                          </div>
                        )}
                      </div>
                    </div>

                    <Badge variant="outline" className="border-slate-100 bg-slate-50 text-slate-600 shrink-0">
                      {question.points} نقاط
                    </Badge>
                  </div>

                  {/* MCQ rendering */}
                  {question.questionType === 'MULTIPLE_CHOICE' && question.optionsData && (
                    <div className="mr-11 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {question.optionsData.map((opt: string, i: number) => {
                        const isSelected = answers[question.id] === opt;
                        return (
                          <button
                            key={i}
                            onClick={() => handleSelectOption(question.id, opt)}
                            className={`p-3.5 rounded-xl border text-right text-sm transition-all flex items-center gap-3 cursor-pointer ${
                              isSelected 
                                ? 'border-primary-500 bg-primary-50/50 text-primary-800 font-semibold ring-2 ring-primary-100' 
                                : 'border-slate-150 bg-slate-50 text-slate-600 hover:bg-slate-100/60'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False rendering */}
                  {question.questionType === 'TRUE_FALSE' && (
                    <div className="mr-11 flex gap-4 mt-4">
                      {['true', 'false'].map((val) => {
                        const isSelected = answers[question.id] === val;
                        const label = val === 'true' ? 'صح' : 'خطأ';
                        return (
                          <button
                            key={val}
                            onClick={() => handleSelectOption(question.id, val)}
                            className={`px-6 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                              isSelected
                                ? val === 'true'
                                  ? 'border-green-500 bg-green-50 text-green-700 font-extrabold ring-2 ring-green-100'
                                  : 'border-rose-500 bg-rose-50 text-rose-700 font-extrabold ring-2 ring-rose-100'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected 
                                ? val === 'true' ? 'border-green-600 bg-green-600' : 'border-rose-600 bg-rose-600'
                                : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Essay rendering */}
                  {question.questionType === 'ESSAY' && (
                    <div className="mr-11 mt-4">
                      <textarea
                        rows={4}
                        placeholder="اكتب إجابتك المقالية بالتفصيل هنا..."
                        value={answers[question.id] || ''}
                        onChange={(e) => handleTextChange(question.id, e.target.value)}
                        className="w-full p-4 border border-slate-200 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-400 text-sm placeholder:text-slate-400"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submission triggers */}
            <div className="flex justify-end gap-4 mt-6">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={isSubmitting}
                className="rounded-xl px-6"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmitAnswers}
                disabled={isSubmitting}
                className="rounded-xl px-8 bg-slate-900 hover:bg-slate-950 text-white font-bold transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSubmitting ? 'جاري التسليم...' : 'تسليم الحل الآن'}
              </Button>
            </div>
          </div>
        )
      ) : (
        /* Submission Graded / Submitted Review View */
        <div className="space-y-6">
          {mySubmission.teacherFeedback && (
            <div className="bg-primary-50/60 border border-primary-200/60 rounded-2xl p-4 flex items-start gap-3 text-primary-800 text-sm">
              <HelpCircle className="w-5 h-5 shrink-0 text-primary-600 mt-0.5" />
              <div>
                <p className="font-bold">ملاحظات المعلم وتقييمه</p>
                <p className="text-xs text-primary-700 mt-1 leading-relaxed">{mySubmission.teacherFeedback}</p>
              </div>
            </div>
          )}

          {mySubmission.status === 'GRADED' ? (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                مراجعة حل الاختبار والإجابات النموذجية
              </h3>

              <div className="space-y-5">
                {assessment.questions?.map((question: any) => {
                  const studentAns = mySubmission.answers?.find((a: any) => a.questionId === question.id);
                  const isCorrect = studentAns?.isCorrect;
                  const isEssay = question.questionType === 'ESSAY';

                  return (
                    <div 
                      key={question.id} 
                      className={`bg-white p-6 rounded-2xl border shadow-2xs relative overflow-hidden ${
                        isEssay 
                          ? 'border-slate-100'
                          : isCorrect 
                            ? 'border-green-200 ring-1 ring-green-100/50' 
                            : 'border-rose-200 ring-1 ring-rose-100/50'
                      }`}
                    >
                      {/* Left indicator bar */}
                      {!isEssay && (
                        <div className={`absolute top-0 right-0 w-1.5 h-full ${isCorrect ? 'bg-green-500' : 'bg-rose-500'}`} />
                      )}

                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-slate-150 text-slate-700 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                            {question.questionNumber}
                          </div>
                          <div>
                            <h4 className="text-md font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{question.questionText}</h4>
                            {question.imageUrl && (
                              <div className="mt-4 rounded-xl overflow-hidden border border-slate-150 max-w-md">
                                <img src={question.imageUrl} alt="Question" className="w-full h-auto object-contain" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge variant={isEssay ? 'neutral' : isCorrect ? 'success' : 'error'}>
                            {isEssay ? `الدرجة المحصلة: ${studentAns?.pointsEarned ?? '—'} / ${question.points}` : `${studentAns?.pointsEarned || 0} / ${question.points} نقاط`}
                          </Badge>
                        </div>
                      </div>

                      {/* Display given answer vs correct answer */}
                      <div className="mr-11 space-y-3 mt-4 text-sm">
                        <div className="flex flex-col gap-1 p-3 bg-slate-50 rounded-xl">
                          <span className="text-xs text-slate-500 font-semibold">إجابتك المسلَّمة:</span>
                          <span className="font-semibold text-slate-800">
                            {studentAns?.selectedAnswer ? (
                              question.questionType === 'TRUE_FALSE' 
                                ? studentAns.selectedAnswer === 'true' ? 'صح' : 'خطأ'
                                : studentAns.selectedAnswer
                            ) : '— لم يتم الإجابة على السؤال'}
                          </span>
                        </div>

                        {!isEssay && (
                          <div className="flex flex-col gap-1 p-3 bg-green-50/60 border border-green-100 rounded-xl text-green-800">
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> الإجابة النموذجية الصحيحة:
                            </span>
                            <span className="font-bold">
                              {question.questionType === 'TRUE_FALSE' 
                                ? question.correctAnswer === 'true' ? 'صح' : 'خطأ'
                                : question.correctAnswer}
                            </span>
                          </div>
                        )}

                        {question.explanation && (
                          <div className="p-3.5 bg-blue-50/50 text-blue-800 rounded-xl border border-blue-100 text-xs leading-relaxed">
                            <span className="font-bold block mb-1">الشرح والتوضيح:</span>
                            {question.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card className="border-slate-100 shadow-2xs">
              <CardContent className="p-8 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-blue-400 mb-3" />
                <h3 className="text-lg font-bold text-slate-700">تم تسليم الحل وإرساله بنجاح</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm">لقد تم رصد استلام إجاباتك لهذا الاختبار، وهو يحتوي على أسئلة مقالية تتطلب تقييماً وتصحيحاً يدوياً من قِبل المعلم.</p>
                <p className="text-xs text-slate-400 mt-1">ستتمكن من الاطلاع على درجتك وإجاباتك النموذجية فور قيام المعلم باعتماد التصحيح.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      {isConfirmOpen && (() => {
        const unansweredCount = (assessment?.questions || []).filter(
          (q: any) => !answers[q.id]
        ).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-amber-700">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-800">تأكيد تسليم الإجابات</h4>
                  <p className="text-xs text-slate-500 font-medium">مراجعة نهائية قبل الاعتماد</p>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>تنبيه: لديك {unansweredCount} سؤالاً لم تجب عليها بعد.</span>
                </div>
              )}
              
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {allowMultipleAttempts
                  ? 'بمجرد تأكيد التسليم، سيتم رصد النتيجة. يمكنك إعادة المحاولة لاحقاً، وتُحتسب أعلى درجة بين محاولاتك كدرجة رسمية.'
                  : 'بمجرد تأكيد التسليم، سيتم رصد النتيجة ولا يمكنك تعديل الإجابات أو إعادة المحاولة مرة أخرى.'}
              </p>

              <div className="flex gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl text-xs font-bold"
                  onClick={() => setIsConfirmOpen(false)}
                  disabled={isSubmitting}
                >
                  العودة للأسئلة
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs"
                  onClick={confirmSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'جاري الإرسال...' : 'تأكيد التسليم الآن'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Result Celebration Modal */}
      {showResultModal && mySubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-slate-150 space-y-5 animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-800">تم تسليم إجاباتك بنجاح!</h3>
              <p className="text-sm text-slate-500 mt-1">
                {mySubmission.status === 'GRADED'
                  ? 'تم تصحيح إجاباتك ورصد النتيجة الفورية بنجاح.'
                  : 'تم استلام إجاباتك بنجاح وسيتم إشعارك فور اعتماد التصحيح من المعلم.'}
              </p>
            </div>

            {mySubmission.status === 'GRADED' && (
              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4 flex items-center justify-around">
                <div>
                  <span className="text-xs text-emerald-700 block font-medium">الدرجة المحصلة</span>
                  <span className="text-3xl font-extrabold text-emerald-800 font-mono">
                    {mySubmission.scoreObtained ?? 0}
                  </span>
                </div>
                <div className="w-px h-8 bg-emerald-200"></div>
                <div>
                  <span className="text-xs text-slate-500 block font-medium">الدرجة الكلية</span>
                  <span className="text-2xl font-bold text-slate-700 font-mono">
                    {assessment.totalScore}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {returnUrl && (
                <Button
                  onClick={() => {
                    setShowResultModal(false);
                    router.push(returnUrl);
                  }}
                  className="w-full rounded-xl py-3.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>العودة للدرس ومتابعة إتمام الكورس 🎓</span>
                </Button>
              )}
              <Button
                onClick={() => setShowResultModal(false)}
                className={`w-full rounded-xl py-3 font-bold ${returnUrl ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200' : 'bg-primary-600 hover:bg-primary-700 text-white'} cursor-pointer`}
              >
                <CheckCircle2 className="w-4 h-4 ml-2" />
                عرض ومراجعة تفاصيل الإجابات
              </Button>
              {allowMultipleAttempts && !isPastDue && (
                <Button
                  variant="outline"
                  onClick={startRetake}
                  className="w-full rounded-xl py-3 font-bold text-primary-700 border-primary-200 hover:bg-primary-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCcw className="w-4 h-4" />
                  إعادة المحاولة لتحسين درجتك
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onBack}
                className="w-full rounded-xl py-3 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {returnUrl ? 'العودة للدرس في الكورس' : 'الرجوع لقائمة الاختبارات'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
