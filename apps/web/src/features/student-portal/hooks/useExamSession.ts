'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth';
import { useSubmitAssessment } from '@/features/assessments/hooks/use-assessments';
import { coursesApi } from '@/features/courses/api/courses.api';
import { buildExamSubmitPayload } from '../utils/examPayload';

export const ALLOWED_ANSWER_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
export const ANSWER_MAX_SIZE = 25 * 1024 * 1024; // 25 MB

export interface UseExamSessionProps {
  assessmentId: string;
  assessment: any;
  refetchAssessment: () => Promise<any>;
  courseId?: string | null;
  lessonId?: string | null;
  initialRetake?: boolean;
}

export function useExamSession({
  assessmentId,
  assessment,
  refetchAssessment,
  courseId,
  lessonId,
  initialRetake,
}: UseExamSessionProps) {
  const { user } = useAuth();
  const progressScopeId = user?.studentProfileId || user?.id || 'anon';
  const { mutate: submit, isPending: isSubmitting } = useSubmitAssessment();

  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [localSubmission, setLocalSubmission] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [retakeMode, setRetakeMode] = useState<boolean>(Boolean(initialRetake));

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Per-question essay image uploads
  const [essayImages, setEssayImages] = useState<
    Record<string, { file: File; previewUrl: string }>
  >({});
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);
  const essayFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Optional answer file upload (attachment for submission)
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [answerFileError, setAnswerFileError] = useState('');
  const [answerUploadProgress, setAnswerUploadProgress] = useState(0);
  const answerFileInputRef = useRef<HTMLInputElement>(null);

  // LocalStorage draft recovery key
  const draftStorageKey = `el_awal_exam_draft_${assessmentId}_${progressScopeId}`;

  // Restore draft from localStorage on initial open
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      assessmentId &&
      !localSubmission &&
      !assessment?.mySubmission
    ) {
      try {
        const saved = localStorage.getItem(draftStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            setAnswers((prev) => ({ ...parsed, ...prev }));
          }
        }
      } catch {}
    }
  }, [assessmentId, draftStorageKey, localSubmission, assessment?.mySubmission]);

  // Auto-save answers draft to localStorage on change
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      assessmentId &&
      Object.keys(answers).length > 0 &&
      !localSubmission
    ) {
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify(answers));
      } catch {}
    }
  }, [answers, assessmentId, draftStorageKey, localSubmission]);

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
      const calendarPast =
        assessment.timingType === 'FIXED_SESSION' &&
        assessment.dueDate &&
        new Date(assessment.dueDate) < new Date() &&
        (assessment.effectiveRemainingSeconds == null ||
          assessment.effectiveRemainingSeconds <= 0);

      if (calendarPast) {
        setTimeLeft(null);
      } else if (assessment.effectiveRemainingSeconds != null) {
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
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleEssayImageSelect = (questionId: string, candidate?: File | null) => {
    if (!candidate) return;
    const ok =
      /\.(png|jpe?g|webp|gif)$/i.test(candidate.name) ||
      candidate.type.startsWith('image/');
    if (!ok) {
      toast.error('يُقبل فقط صور بصيغة PNG أو JPG أو WEBP');
      return;
    }
    if (candidate.size > 15 * 1024 * 1024) {
      toast.error('حجم الصورة يتجاوز الحد الأقصى (15 ميجابايت)');
      return;
    }
    const previewUrl = URL.createObjectURL(candidate);
    setEssayImages((prev) => ({
      ...prev,
      [questionId]: { file: candidate, previewUrl },
    }));
  };

  const handleRemoveEssayImage = (questionId: string) => {
    setEssayImages((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
  };

  const startRetake = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {}
    }
    setLocalSubmission(null);
    setAnswers({});
    setEssayImages({});
    setShowResultModal(false);
    setRetakeMode(true);
  };

  const handleAnswerFileSelect = (candidate?: File | null) => {
    if (!candidate) return;
    const ok =
      ALLOWED_ANSWER_TYPES.includes(candidate.type) ||
      /\.(pdf|png|jpe?g)$/i.test(candidate.name);
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

  const buildSubmitPayload = async () => {
    return buildExamSubmitPayload(
      answers,
      essayImages,
      answerFile,
      setAnswerUploadProgress
    );
  };

  const notifyCourseLessonProgress = async (subData?: any, isPreview = false) => {
    const targetLessonId =
      lessonId || (assessment as any)?.lessonId || subData?.lessonId;
    const targetCourseId =
      courseId || (assessment as any)?.courseId || subData?.courseId;

    if (typeof window !== 'undefined') {
      try {
        if (targetCourseId && targetLessonId) {
          const key = `el_awal_course_progress_${targetCourseId}_${progressScopeId}`;
          const saved = localStorage.getItem(key);
          const list = saved ? JSON.parse(saved) : [];
          const updated = Array.isArray(list)
            ? Array.from(new Set([...list, targetLessonId]))
            : [targetLessonId];
          localStorage.setItem(key, JSON.stringify(updated));
        }
        if (assessmentId) {
          localStorage.setItem(
            `el_awal_preview_quiz_${assessmentId}`,
            JSON.stringify({
              scoreObtained: subData?.scoreObtained ?? 100,
              status: 'GRADED',
              submittedAt: new Date().toISOString(),
            })
          );
        }
      } catch {}
    }

    if (targetLessonId && !isPreview) {
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
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(draftStorageKey);
            } catch {}
          }
          const subData = result?.data || result;
          const preview =
            Boolean(subData?.isPreview) || subData?.id === 'preview-submission';
          setLocalSubmission(subData);
          setShowResultModal(true);
          notifyCourseLessonProgress(subData, preview);
          refetchAssessment();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء تسليم الإجابات.');
        },
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
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(draftStorageKey);
            } catch {}
          }
          const subData = result?.data || result;
          const preview =
            Boolean(subData?.isPreview) || subData?.id === 'preview-submission';
          toast.success(
            preview
              ? '👁️ معاينة المعلم: تم تقييم الإجابات مؤقتاً دون حفظ النتيجة أو احتساب محاولة.'
              : 'تم تسليم الإجابات بنجاح وتم رصد النتيجة!'
          );
          setIsConfirmOpen(false);
          setTimeLeft(null);
          setRetakeMode(false);
          setLocalSubmission(subData);
          setShowResultModal(true);
          notifyCourseLessonProgress(subData, preview);
          refetchAssessment();
        },
        onError: (err: any) => {
          toast.error(err.message || 'حدث خطأ أثناء تسليم الإجابات.');
        },
      }
    );
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    if (h > 0) {
      return `${h}:${m}:${s}`;
    }
    return `${m}:${s}`;
  };

  return {
    answers,
    setAnswers,
    isSubmitting,
    isConfirmOpen,
    setIsConfirmOpen,
    localSubmission,
    setLocalSubmission,
    showResultModal,
    setShowResultModal,
    retakeMode,
    setRetakeMode,
    timeLeft,
    essayImages,
    previewModalImg,
    setPreviewModalImg,
    essayFileInputRefs,
    answerFile,
    setAnswerFile,
    answerFileError,
    answerUploadProgress,
    answerFileInputRef,
    handleSelectOption,
    handleTextChange,
    handleEssayImageSelect,
    handleRemoveEssayImage,
    startRetake,
    handleAnswerFileSelect,
    handleAutoSubmit,
    handleSubmitAnswers,
    confirmSubmit,
    formatTimer,
  };
}
