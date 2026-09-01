'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessments, useAssessment, useSubmitAssessment } from '@/features/assessments/hooks/use-assessments';
import { coursesApi } from '@/features/courses/api/courses.api';
import { uploadFileResilient } from '@/features/content/api/content.api';
import { useAuth } from '@/features/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import {
  FileText, Calendar, Clock, CheckCircle2, AlertCircle,
  ChevronLeft, Award, Play, HelpCircle, Send, Check, AlertTriangle, ArrowLeft, RefreshCcw,
  UploadCloud, Camera, ImageIcon, Trash2, Maximize2, X, Lock, Eye, Timer
} from 'lucide-react';
import { parseEssayAnswer, formatEssayAnswer } from '@/features/assessments/utils/answer-parser';

const ALLOWED_ANSWER_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const ANSWER_MAX_SIZE = 25 * 1024 * 1024; // 25 MB
import { formatArabicDate, formatArabicTime } from '@/lib/utils/formatters';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import toast from 'react-hot-toast';

export function StudentAssessmentsContent({
  fixedType = 'EXAM',
}: {
  fixedType?: 'EXAM' | 'ASSIGNMENT' | 'ALL';
}) {
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramId = searchParams.get('id') || searchParams.get('assessmentId');
  const returnUrl = searchParams.get('returnUrl');
  const courseId = searchParams.get('courseId');
  const lessonId = searchParams.get('lessonId');
  const retakeParam = searchParams.get('retake') === '1';

  const [filterType, setFilterType] = useState<'ALL' | 'EXAM' | 'ASSIGNMENT'>(fixedType);
  const [currentPage, setCurrentPage] = useState(1);
  const { data: assessmentsData, isLoading, isError } = useAssessments();
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(paramId || null);
  const [activeMode, setActiveMode] = useState<'NONE' | 'SOLVE' | 'REVIEW'>(paramId ? 'SOLVE' : 'NONE');

  // Live ticking clock for countdown badges
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (paramId) {
      setActiveAssessmentId(paramId);
      setActiveMode('SOLVE');
    }
  }, [paramId]);

  const isHomeworkPage = fixedType === 'ASSIGNMENT';
  const isExamPage = fixedType === 'EXAM';

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName={isHomeworkPage ? 'الواجبات المنزلية' : isExamPage ? 'الاختبارات' : 'الواجبات والاختبارات'}
        description="حل التقييمات التفاعلية ومتابعة الدرجات تتطلب اتصالاً نشطاً بالخادم."
        backHref="/student/dashboard"
      />
    );
  }

  const PAGE_SIZE = 6;

  const assessments = assessmentsData?.data || [];

  const effectiveFilter = fixedType !== 'ALL' ? fixedType : filterType;

  const filteredAssessments = assessments.filter((item: any) => {
    // Exclude course-linked quizzes (taken inside learning room)
    if (item.courseId || item.lessonId) return false;
    if (effectiveFilter === 'ALL') return true;
    return item.type === effectiveFilter;
  });

  const totalPages = Math.ceil(filteredAssessments.length / PAGE_SIZE);
  const paginatedAssessments = filteredAssessments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getExamTimingStatus = (item: any) => {
    const rawStart = item.startTime || item.startDate;
    const rawEnd = item.endTime || item.dueDate || item.deadline;
    const startTimeMs = rawStart ? new Date(rawStart).getTime() : null;
    const endTimeMs = rawEnd ? new Date(rawEnd).getTime() : null;

    const isUpcoming = Boolean(startTimeMs && startTimeMs > nowMs);
    const isEnded = Boolean(endTimeMs && endTimeMs < nowMs);
    const isActive = !isUpcoming && !isEnded;

    let countdownFormatted = '';
    if (isUpcoming && startTimeMs) {
      const diffSecs = Math.max(0, Math.floor((startTimeMs - nowMs) / 1000));
      const hours = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        countdownFormatted = `${days} يوم ${remHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        countdownFormatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }

    return {
      isUpcoming,
      isEnded,
      isActive,
      countdownFormatted,
      startTime: rawStart ? new Date(rawStart) : null,
      endTime: rawEnd ? new Date(rawEnd) : null,
    };
  };

  const getStatus = (item: any) => {
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
        <p>حدث خطأ أثناء تحميل البيانات. يرجى المحاولة لاحقاً.</p>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {activeMode === 'NONE' ? (
        <>
          {/* Header */}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {isHomeworkPage ? 'الواجبات المنزلية' : isExamPage ? 'الاختبارات والتقييمات' : 'الواجبات والاختبارات'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isHomeworkPage
                ? 'حل ومتابعة واجبات الحصص المدرسية المسندة إليك ومراجعة الحلول'
                : isExamPage
                ? 'حل الاختبارات الدورية الشاملة ومتابعة الدرجات والنتائج'
                : 'حل الواجبات المدرسية والاختبارات المخصصة لك ومتابعة الدرجات والنتائج'}
            </p>
          </div>

          {/* Filters (only when not fixed to a specific single type) */}
          {fixedType === 'ALL' && (
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
          )}

          {/* Grid list */}
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200/60">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                {isHomeworkPage
                  ? 'لا توجد واجبات منزلية مسندة إليك حالياً.'
                  : isExamPage
                  ? 'لا توجد اختبارات مضافة حالياً.'
                  : 'لا توجد واجبات أو اختبارات مضافة حالياً.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedAssessments.map((item: any) => {
                  const { isPastDue } = getStatus(item);
                  const isExam = item.type === 'EXAM';
                  const timing = getExamTimingStatus(item);
                  return (
                    <Card key={item.id} className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-500 to-primary-600"></div>
                      <CardContent className="p-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap justify-between items-start gap-2">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={isExam ? 'error' : 'default'} className={isExam ? 'bg-error-50 text-error-800' : 'bg-primary-50 text-primary-700'}>
                                {isExam ? 'اختبار' : 'واجب'}
                              </Badge>
                              {isExam && item.timingType && (
                                <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-700">
                                  {item.timingType === 'FIXED_SESSION' ? '⏱️ جلسة موحدة' : '🗓️ نافذة مرنة'}
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="font-semibold">
                              {item.totalScore} درجة
                            </Badge>
                          </div>
                          
                          <h3 className="text-lg font-bold text-slate-800 leading-snug line-clamp-1">{item.title}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.description || 'لا يوجد وصف متاح.'}</p>
                          
                          {/* Timing countdown badge for upcoming exams */}
                          {isExam && timing.isUpcoming && (
                            <div className="bg-indigo-50/80 border border-indigo-100 p-2.5 rounded-xl flex items-center gap-2 text-xs text-indigo-900 font-medium">
                              <Clock className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
                              <span className="font-bold">يبدأ الاختبار بعد: </span>
                              <span className="font-mono font-extrabold text-indigo-700">{timing.countdownFormatted}</span>
                            </div>
                          )}

                          {isExam && timing.isEnded && (
                            <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-medium">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="font-bold">انتهى موعد الاختبار</span>
                            </div>
                          )}

                          <div className="pt-2 flex flex-col gap-1.5 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>المدة: {item.durationMinutes ? `${item.durationMinutes} دقيقة` : 'غير محدد'}</span>
                            </div>
                            {isExam && timing.startTime && (
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>موعد البدء: {formatArabicDate(timing.startTime)} - {formatArabicTime(timing.startTime)}</span>
                              </div>
                            )}
                            {(timing.endTime || item.dueDate) && (
                              <div className={`flex items-center gap-1.5 ${timing.isEnded || isPastDue ? 'text-rose-600' : ''}`}>
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{isExam ? 'موعد الإغلاق:' : 'تاريخ التسليم:'} {formatArabicDate(timing.endTime || item.dueDate)} - {formatArabicTime(timing.endTime || item.dueDate)}</span>
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
                          
                          {isExam && timing.isUpcoming ? (
                            <Button
                              disabled
                              size="sm"
                              className="rounded-xl px-4 text-xs font-semibold opacity-60 cursor-not-allowed bg-slate-100 text-slate-500 border border-slate-200"
                            >
                              <Lock className="w-3.5 h-3.5 ml-1.5" />
                              لم يحن الموعد بعد
                            </Button>
                          ) : (
                            <Button
                              onClick={() => {
                                setActiveAssessmentId(item.id);
                                setActiveMode('SOLVE'); 
                              }}
                              size="sm"
                              className={`rounded-xl px-4 text-xs font-semibold cursor-pointer ${
                                isExam && timing.isActive
                                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                                  : ''
                              }`}
                            >
                              <Play className="w-3 h-3 ml-1.5" />
                              {isExam ? (timing.isEnded ? 'عرض التفاصيل والنتيجة' : 'ابدأ الاختبار') : 'عرض وتفاصيل'}
                            </Button>
                          )}
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
  const { user } = useAuth();
  const progressScopeId = user?.studentProfileId || user?.id || 'anon';
  const { data: assessment, isLoading, isError, error, refetch } = useAssessment(assessmentId);
  const { mutate: submit, isPending: isSubmitting } = useSubmitAssessment();
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [localSubmission, setLocalSubmission] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [retakeMode, setRetakeMode] = useState<boolean>(Boolean(initialRetake));

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Per-question essay image uploads
  const [essayImages, setEssayImages] = useState<Record<string, { file: File; previewUrl: string }>>({});
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);
  const essayFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Optional answer file upload (attachment for submission)
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [answerFileError, setAnswerFileError] = useState('');
  const [answerUploadProgress, setAnswerUploadProgress] = useState(0);
  const answerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (assessment && !assessment.allowMultipleAttempts) {
      setRetakeMode(false);
    }
  }, [assessment]);

  useEffect(() => {
    if (
      assessment &&
      !localSubmission &&
      (retakeMode || !assessment.mySubmission)
    ) {
      if (assessment.effectiveRemainingSeconds != null) {
        setTimeLeft(assessment.effectiveRemainingSeconds);
      } else if (assessment.durationMinutes) {
        const minutes = Number(assessment.durationMinutes);
        setTimeLeft(minutes * 60);
      } else {
        setTimeLeft(null);
      }
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

  const handleEssayImageSelect = (questionId: string, candidate?: File | null) => {
    if (!candidate) return;
    const ok = /\.(png|jpe?g|webp|gif)$/i.test(candidate.name) || candidate.type.startsWith('image/');
    if (!ok) {
      toast.error('يُقبل فقط صور بصيغة PNG أو JPG أو WEBP');
      return;
    }
    if (candidate.size > 15 * 1024 * 1024) {
      toast.error('حجم الصورة يتجاوز الحد الأقصى (15 ميجابايت)');
      return;
    }
    const previewUrl = URL.createObjectURL(candidate);
    setEssayImages(prev => ({
      ...prev,
      [questionId]: { file: candidate, previewUrl }
    }));
  };

  const handleRemoveEssayImage = (questionId: string) => {
    setEssayImages(prev => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
  };

  const startRetake = () => {
    setLocalSubmission(null);
    setAnswers({});
    setEssayImages({});
    setShowResultModal(false);
    setRetakeMode(true);
  };

  const handleAnswerFileSelect = (candidate?: File | null) => {
    if (!candidate) return;
    const ok = ALLOWED_ANSWER_TYPES.includes(candidate.type) || /\.(pdf|png|jpe?g)$/i.test(candidate.name);
    if (!ok) {
      setAnswerFileError('يُقبل فقط ملفات PDF أو صور PNG / JPG');
      return;
    }
    if (candidate.size > ANSWER_MAX_SIZE) {
      setAnswerFileError('حجم الملف يتجاوز الحد الأقصى المسموح (25 ميجابايت)');
      return;
    }
    setAnswerFileError('');
    setAnswerFile(candidate);
  };

  const uploadAnswerAttachment = async (): Promise<string | undefined> => {
    if (!answerFile) return undefined;
    const res = await uploadFileResilient(
      answerFile,
      'homework-submissions',
      (p) => setAnswerUploadProgress(p),
    );
    return res.fileUrl;
  };

  const buildSubmitPayload = async () => {
    const finalAnswers: Record<string, string> = { ...answers };

    for (const [questionId, imgData] of Object.entries(essayImages)) {
      if (imgData?.file) {
        try {
          const res = await uploadFileResilient(
            imgData.file,
            'homework-submissions',
          );
          finalAnswers[questionId] = formatEssayAnswer(finalAnswers[questionId], res.fileUrl);
        } catch (err) {
          console.error('Error uploading essay image for question', questionId, err);
          throw new Error('فشل رفع صورة إجابة أحد الأسئلة المقالية. يرجى المحاولة مرة أخرى.');
        }
      }
    }

    const formattedAnswers = Object.entries(finalAnswers).map(([qId, val]) => ({
      questionId: qId,
      answerGiven: val,
    }));
    const attachmentUrl = await uploadAnswerAttachment();
    return {
      answers: formattedAnswers,
      ...(attachmentUrl ? { attachmentUrl } : {}),
    };
  };

  const notifyCourseLessonProgress = async (subData?: any) => {
    const targetLessonId = lessonId || (assessment as any)?.lessonId || subData?.lessonId;
    const targetCourseId = courseId || (assessment as any)?.courseId || subData?.courseId;

    if (targetCourseId && targetLessonId && typeof window !== 'undefined') {
      try {
        const key = `el_awal_course_progress_${targetCourseId}_${progressScopeId}`;
        const saved = localStorage.getItem(key);
        const list = saved ? JSON.parse(saved) : [];
        const updated = Array.isArray(list) ? Array.from(new Set([...list, targetLessonId])) : [targetLessonId];
        localStorage.setItem(key, JSON.stringify(updated));
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

  const handleAutoSubmit = async () => {
    toast.error('انتهى الوقت المحدد للاختبار! جاري تسليم إجاباتك تلقائياً...');
    const payload = await buildSubmitPayload();
    submit(
      { id: assessmentId, payload },
      {
        onSuccess: (result: any) => {
          toast.success('تم تسليم إجاباتك بنجاح.');
          setTimeLeft(null);
          setRetakeMode(false);
          const subData = result?.data || result;
          const preview = Boolean(subData?.isPreview) || subData?.id === 'preview-submission';
          setLocalSubmission(subData);
          setShowResultModal(true);
          if (!preview) notifyCourseLessonProgress(subData);
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

  const confirmSubmit = async () => {
    const payload = await buildSubmitPayload();
    submit(
      { id: assessmentId, payload },
      {
        onSuccess: (result: any) => {
          const subData = result?.data || result;
          const preview = Boolean(subData?.isPreview) || subData?.id === 'preview-submission';
          toast.success(
            preview
              ? '👁️ معاينة المعلم: تم تقييم الإجابات مؤقتاً دون حفظ النتيجة أو احتساب محاولة.'
              : 'تم تسليم الإجابات بنجاح وتم رصد النتيجة!',
          );
          setIsConfirmOpen(false);
          setTimeLeft(null);
          setRetakeMode(false);
          setLocalSubmission(subData);
          setShowResultModal(true);
          if (!preview) notifyCourseLessonProgress(subData);
          refetch();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء تسليم الإجابات.');
        }
      }
    );
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    if (h > 0) {
      return `${h}:${m}:${s}`;
    }
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
    const errObj = (error as any);
    const errMessage = errObj?.response?.data?.message || errObj?.message || '';
    const errStartTime = errObj?.response?.data?.startTime || errObj?.startTime;
    const isEarly = errMessage.includes('لم يحن') || String(errObj).includes('لم يحن');
    const isLateError = errMessage.includes('انتهت فترة') || String(errObj).includes('انتهت فترة');

    return (
      <div className="space-y-6 max-w-xl mx-auto py-10" dir="rtl">
        <Button variant="outline" onClick={onBack} size="sm">
          <ChevronLeft className="w-4 h-4 ml-1" />
          رجوع
        </Button>
        <Card className="border border-slate-200 shadow-sm rounded-3xl text-center p-8 space-y-4 bg-white">
          {isEarly ? (
            <>
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">لم يحن موعد الاختبار بعد</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                هذا الاختبار مغلق ومجدول ليبدأ في الموعد المحدد من قبل المعلم.
              </p>
              {errStartTime && (
                <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl text-sm font-bold text-indigo-900 inline-block mt-2">
                  <span>موعد بدء الاختبار: </span>
                  <span className="font-mono text-indigo-700">{formatArabicDate(errStartTime)} - {formatArabicTime(errStartTime)}</span>
                </div>
              )}
            </>
          ) : isLateError ? (
            <>
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">انتهت فترة الدخول للاختبار</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                لقد انتهت النافذة الزمنية المحددة لدخول وتسليم هذا الاختبار ولم يعد بإمكانك البدء الآن.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">تعذر فتح الاختبار</h2>
              <p className="text-sm text-slate-500">{errMessage || 'حدث خطأ أثناء تحميل بيانات الاختبار.'}</p>
            </>
          )}
        </Card>
      </div>
    );
  }

  const isExam = assessment.type === 'EXAM';
  const mySubmission = localSubmission || assessment.mySubmission;
  const hasEssayQuestions = (assessment.questions || []).some((q: any) => q.questionType === 'ESSAY');
  const isPreviewResult =
    Boolean(mySubmission?.isPreview) || mySubmission?.id === 'preview-submission';
  const isPastDue = assessment.dueDate ? new Date(assessment.dueDate) < new Date() : false;
  const allowMultipleAttempts = Boolean(assessment.allowMultipleAttempts);
  const canRetake = allowMultipleAttempts && Boolean(mySubmission) && !retakeMode && !isPastDue;

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Late joiner alert banner for FIXED_SESSION */}
      {assessment.isLate && assessment.timingType === 'FIXED_SESSION' && !mySubmission && (
        <div className="bg-amber-500/10 border-2 border-amber-400 text-amber-900 p-4 rounded-2xl flex items-center gap-3 shadow-xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 animate-bounce" />
          <div className="text-xs sm:text-sm font-bold leading-relaxed">
            <span>تنبيه: دخلت متأخراً، سينتهي الاختبار للجميع عند </span>
            <span className="underline decoration-amber-500 decoration-2 font-mono">
              {assessment.endTime ? `${formatArabicDate(assessment.endTime)} - ${formatArabicTime(assessment.endTime)}` : 'الموعد المحدد'}
            </span>
            <span> (تم احتساب الوقت المتبقي لك تلقائياً).</span>
          </div>
        </div>
      )}

      {/* Top action bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
        <button onClick={onBack} className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer">
          <ChevronLeft className="w-5 h-5 ml-1" />
          {returnUrl ? 'العودة لقاعة الدرس في الكورس' : !isExam ? 'الرجوع لقائمة الواجبات' : 'الرجوع لقائمة الاختبارات'}
        </button>

        {timeLeft !== null && !mySubmission && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold font-mono transition-all shadow-sm ${
            timeLeft <= 120
              ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200'
              : timeLeft <= 300
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
            <Clock className={`w-4 h-4 ${timeLeft <= 120 ? 'animate-spin' : 'animate-pulse'}`} />
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
              {assessment.questions?.map((question: any) => (
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
                    <div className="mr-11 mt-4 space-y-3">
                      <div>
                        <span className="text-xs font-bold text-slate-600 block mb-1.5">
                          اكتب إجابتك النصية (أو ارفع صورة للحل من الكشكول / الورقة):
                        </span>
                        <textarea
                          rows={4}
                          placeholder="اكتب إجابتك المقالية بالتفصيل هنا..."
                          value={answers[question.id] || ''}
                          onChange={(e) => handleTextChange(question.id, e.target.value)}
                          className="w-full p-4 border border-slate-200 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-400 text-sm placeholder:text-slate-400 bg-white"
                        />
                      </div>

                      {/* Attached Essay Image */}
                      <div>
                        {essayImages[question.id] ? (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                onClick={() => setPreviewModalImg(essayImages[question.id].previewUrl)}
                                className="w-14 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 cursor-pointer relative group"
                                title="اضغط لتكبير الصورة"
                              >
                                <img
                                  src={essayImages[question.id].previewUrl}
                                  alt="صورة الإجابة"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <Maximize2 className="w-4 h-4" />
                                </div>
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  تم إرفاق صورة الحل
                                </span>
                                <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                                  {essayImages[question.id].file.name} ({(essayImages[question.id].file.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewModalImg(essayImages[question.id].previewUrl)}
                                className="text-xs font-bold text-slate-600 hover:text-primary-700 bg-white border border-slate-200 hover:border-primary-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                عرض
                              </button>
                              <button
                                type="button"
                                onClick={() => essayFileInputRefs.current[question.id]?.click()}
                                className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                تغيير
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveEssayImage(question.id)}
                                className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                حذف
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => essayFileInputRefs.current[question.id]?.click()}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-primary-50/60 hover:border-primary-400 text-xs font-bold text-slate-700 hover:text-primary-700 transition-all cursor-pointer"
                            >
                              <Camera className="w-4 h-4 text-primary-600" />
                              إرفاق صورة لإجابة هذا السؤال (من الكشكول أو الورقة)
                            </button>
                          </div>
                        )}

                        <input
                          ref={(el) => { essayFileInputRefs.current[question.id] = el; }}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            handleEssayImageSelect(question.id, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hasEssayQuestions && (
              <div className="bg-white p-5 rounded-2xl border-2 border-dashed border-slate-200">
                <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-1">
                  <UploadCloud className="w-4 h-4 text-primary-600" />
                  رفع ملف إجابة الواجب (لأنه يحتوي أسئلة مقالية)
                </h4>
                <p className="text-xs text-slate-500 mb-3">اكتب إجاباتك في الخانات أعلاه، وارفع نسخة مصوّرة / PDF من حلولك على الورق (اختياري).</p>

                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/40"
                  onClick={() => answerFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); handleAnswerFileSelect(e.dataTransfer.files?.[0]); }}
                >
                  <input
                    ref={answerFileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => handleAnswerFileSelect(e.target.files?.[0])}
                  />
                  {answerFile ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="mb-1.5 h-7 w-7 text-emerald-600" />
                      <p className="text-sm font-bold text-slate-800">{answerFile.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{(answerFile.size / 1024 / 1024).toFixed(2)} ميجابايت</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAnswerFile(null); setAnswerUploadProgress(0); }}
                        className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        إزالة الملف
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="mb-2 h-7 w-7 text-slate-400" />
                      <p className="text-sm font-bold text-slate-700">اسحب ملف إجابتك هنا أو اضغط للاختيار</p>
                      <p className="mt-1 text-xs text-slate-400">PDF / PNG / JPG حتى 25 ميجابايت</p>
                    </>
                  )}
                </div>

                {answerUploadProgress > 0 && answerUploadProgress < 100 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>جاري رفع الملف إلى التخزين السحابي...</span>
                      <span>{answerUploadProgress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-primary-600 transition-all duration-200" style={{ width: `${answerUploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {answerFileError && (
                  <p className="mt-2 text-xs font-bold text-rose-600">{answerFileError}</p>
                )}
              </div>
            )}

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

          {mySubmission.attachmentUrl && (
            <a
              href={mySubmission.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-2.5 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-50"
            >
              <FileText className="h-4 w-4" />
              تحميل ملف إجابتك المرفوعة
            </a>
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
                        <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 rounded-xl">
                          <span className="text-xs text-slate-500 font-semibold">إجابتك المسلَّمة:</span>
                          {isEssay ? (
                            (() => {
                              const { text, imageUrl } = parseEssayAnswer(studentAns?.selectedAnswer);
                              if (!text && !imageUrl) {
                                return <span className="text-slate-400 italic text-xs">لم يتم الإجابة على السؤال</span>;
                              }
                              return (
                                <div className="space-y-3">
                                  {text && (
                                    <p className="font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{text}</p>
                                  )}
                                  {imageUrl && (
                                    <div className="pt-1">
                                      <span className="text-xs text-slate-500 font-medium block mb-1.5 flex items-center gap-1">
                                        <ImageIcon className="w-3.5 h-3.5 text-primary-600" />
                                        صورة الحل المرفقة:
                                      </span>
                                      <div
                                        onClick={() => setPreviewModalImg(imageUrl)}
                                        className="relative group cursor-pointer inline-block rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-primary-400 transition-all max-w-xs shadow-2xs"
                                        title="اضغط لتكبير الصورة"
                                      >
                                        <img src={imageUrl} alt="إجابة الطالب" className="max-h-44 w-auto object-contain" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                          <Maximize2 className="w-4 h-4" />
                                          عرض الصورة
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {studentAns?.selectedAnswer ? (
                                question.questionType === 'TRUE_FALSE' 
                                  ? studentAns.selectedAnswer === 'true' ? 'صح' : 'خطأ'
                                  : studentAns.selectedAnswer
                              ) : '— لم يتم الإجابة على السؤال'}
                            </span>
                          )}
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

      {/* Full Image Preview Modal */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPreviewModalImg(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">معاينة صورة الإجابة</span>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={previewModalImg}
                alt="صورة الإجابة"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
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

            {isPreviewResult && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3.5 text-right flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-xs font-semibold leading-relaxed">
                  وضع معاينة المعلم: هذه نتيجة تجريبية فورية لم يتم حفظها، ولا تُحتسب كمحاولة،
                  ولن تظهر كدرجة للطالب. لاختبار سياسة المحاولات وظهور الدرجة، سجّل الدخول بحساب طالب.
                </p>
              </div>
            )}

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
                {returnUrl ? 'العودة للدرس في الكورس' : !isExam ? 'الرجوع لقائمة الواجبات' : 'الرجوع لقائمة الاختبارات'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
