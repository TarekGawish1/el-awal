'use client';

import React, { useState, useRef, useEffect } from 'react';

import {
  X,
  BookOpen,
  DollarSign,
  Award,
  Plus,
  ExternalLink,
  Settings2,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
  Gift,
  CreditCard,
  Check,
  Video,
  Play,
  UploadCloud,
  Trash2,
  Loader2,
  Gauge,
  CheckCircle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateCourse } from '../hooks/useCourses';
import { coursesApi } from '../api/courses.api';
import { CourseDetail } from '../types/courses.types';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
import { FileUploadZone } from './FileUploadZone';
import { useVideoUploadManager } from '../context/video-upload-manager.context';
import {
  validateVideoFile,
  formatVideoSize,
  formatEtaArabic,
} from '../utils/video-optimizer';
import toast from 'react-hot-toast';

interface EditCourseModalProps {
  isOpen: boolean;
  course: CourseDetail;
  onClose: () => void;
  onSuccess?: () => void;
}

const STAGE_GRADES: Record<string, string[]> = {
  'المرحلة الثانوية': ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
  'المرحلة الإعدادية': ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'],
  'المرحلة الابتدائية': ['الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي'],
};

const COMMON_SUBJECTS = [
  'الرياضيات',
  'اللغة العربية',
  'اللغة الإنجليزية',
  'الفيزياء',
  'الكيمياء',
  'الأحياء',
  'الجيولوجيا',
  'التاريخ',
  'الجغرافيا',
  'الفلسفة والمنطق',
  'علم النفس والاجتماع',
  'الفرنساوي',
  'الألماني',
  'دراسات اجتماعية',
  'علوم',
];

export function EditCourseModal({ isOpen, course, onClose, onSuccess }: EditCourseModalProps) {
  const queryClient = useQueryClient();
  const updateMutation = useUpdateCourse(course.id);
  const { data: assessmentsData } = useAssessments();
  const assessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : (assessmentsData?.data || []);

  const { startUpload, cancelUpload, getTaskForCoursePreview } = useVideoUploadManager();
  const backgroundUploadTask = getTaskForCoursePreview(course.id);

  const [title, setTitle] = useState(course.title || '');
  const [description, setDescription] = useState(course.description || '');
  const [subject, setSubject] = useState(course.subject || 'الرياضيات');
  const [academicStage, setAcademicStage] = useState(course.academicStage || 'المرحلة الثانوية');
  const [gradeLevel, setGradeLevel] = useState(course.gradeLevel || 'الصف الأول الثانوي');
  const [academicTerm, setAcademicTerm] = useState(course.academicTerm || 'FIRST_TERM');
  const [academicYear, setAcademicYear] = useState(course.academicYear || '2026-2027');
  const [isFreeCourse, setIsFreeCourse] = useState(Number(course.price) === 0);
  const [price, setPrice] = useState(String(course.price !== undefined ? course.price : 0));
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(course.coverImageUrl || null);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState(course.previewVideoUrl || '');
  const [courseQuizId, setCourseQuizId] = useState(course.courseQuizId || '');
  const [hasCertificate, setHasCertificate] = useState(course.hasCertificate ?? true);
  const [enforceSequentialLessons, setEnforceSequentialLessons] = useState(
    course.enforceSequentialLessons ?? false,
  );
  const [requireExamPassingToUnlock, setRequireExamPassingToUnlock] = useState(
    course.requireExamPassingToUnlock ?? false,
  );

  const initialCoverUrlRef = useRef<string | null>(course.coverImageUrl || null);
  const initialPreviewVideoUrlRef = useRef<string | null>(course.previewVideoUrl || null);
  const isSubmittedRef = useRef(false);
  const newUploadedKeyRef = useRef<string | null>(null);
  const newlyUploadedBunnyVideoIdRef = useRef<string | null>(null);
  const newlyUploadedPreviewUrlRef = useRef<string | null>(null);
  const previewUploadTaskIdRef = useRef<string | null>(null);

  const isUploadingVideo =
    backgroundUploadTask?.status === 'uploading' ||
    backgroundUploadTask?.status === 'inspecting' ||
    backgroundUploadTask?.status === 'processing';

  // Sync background upload completion to modal preview
  useEffect(() => {
    if (!backgroundUploadTask) return;
    if (backgroundUploadTask.status === 'completed' && backgroundUploadTask.embedUrl) {
      setPreviewVideoUrl(backgroundUploadTask.embedUrl);
      newlyUploadedPreviewUrlRef.current = backgroundUploadTask.embedUrl;
      if (backgroundUploadTask.videoId) {
        newlyUploadedBunnyVideoIdRef.current = backgroundUploadTask.videoId;
      }
    }
  }, [backgroundUploadTask]);

  useEffect(() => {
    if (isOpen) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setSubject(course.subject || 'الرياضيات');
      setAcademicStage(course.academicStage || 'المرحلة الثانوية');
      setGradeLevel(course.gradeLevel || 'الصف الأول الثانوي');
      setAcademicTerm(course.academicTerm || 'FIRST_TERM');
      setAcademicYear(course.academicYear || '2026-2027');
      const isCourseFree = Number(course.price) === 0;
      setIsFreeCourse(isCourseFree);
      setPrice(String(course.price !== undefined ? course.price : 0));
      setCoverImageUrl(course.coverImageUrl || null);
      setCoverImageKey(null);
      setPreviewVideoUrl(course.previewVideoUrl || '');
      setCourseQuizId(course.courseQuizId || '');
      setHasCertificate(course.hasCertificate ?? true);
      setEnforceSequentialLessons(course.enforceSequentialLessons ?? false);
      setRequireExamPassingToUnlock(course.requireExamPassingToUnlock ?? false);
      initialCoverUrlRef.current = course.coverImageUrl || null;
      initialPreviewVideoUrlRef.current = course.previewVideoUrl || null;
      isSubmittedRef.current = false;
      newUploadedKeyRef.current = null;
      newlyUploadedBunnyVideoIdRef.current = null;
      newlyUploadedPreviewUrlRef.current = null;
      previewUploadTaskIdRef.current = null;
    }
  }, [isOpen, course]);

  // Clean up any newly uploaded staged image or video on unmount/cancel if not submitted
  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current) {
        if (newUploadedKeyRef.current) {
          coursesApi.deleteUploadedFile(newUploadedKeyRef.current).catch(() => {});
        }
        if (previewUploadTaskIdRef.current) {
          cancelUpload(previewUploadTaskIdRef.current);
        }
        if (newlyUploadedBunnyVideoIdRef.current) {
          coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
        } else if (newlyUploadedPreviewUrlRef.current) {
          coursesApi.deleteUploadedFile(newlyUploadedPreviewUrlRef.current).catch(() => {});
        }
        // Revert course preview video if background manager auto-saved it while modal was open
        if (
          newlyUploadedPreviewUrlRef.current &&
          initialPreviewVideoUrlRef.current !== newlyUploadedPreviewUrlRef.current
        ) {
          coursesApi.updateCourse(course.id, {
            previewVideoUrl: initialPreviewVideoUrlRef.current,
          }).catch(() => {});
        }
      }
    };
  }, [course.id, cancelUpload]);

  if (!isOpen) return null;

  const handleStageChange = (newStage: string) => {
    setAcademicStage(newStage);
    const availableGrades = STAGE_GRADES[newStage];
    if (availableGrades && availableGrades.length > 0 && !availableGrades.includes(gradeLevel)) {
      setGradeLevel(availableGrades[0]);
    }
  };

  const handleDirectVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'حجم الفيديو يتجاوز الحد الأقصى المسموح به (2 جيجابايت)');
      e.target.value = '';
      return;
    }

    // If there was a newly uploaded video in this modal session that was not saved, clean it up first
    if (newlyUploadedBunnyVideoIdRef.current) {
      coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
      newlyUploadedBunnyVideoIdRef.current = null;
    }

    try {
      const taskId = await startUpload({
        file,
        courseId: course.id,
        isCoursePreview: true,
        oldPreviewUrl: initialPreviewVideoUrlRef.current || undefined,
        lessonTitle: `برومو كورس: ${title.trim() || course.title}`,
        onSuccess: (res) => {
          setPreviewVideoUrl(res.embedUrl);
          newlyUploadedPreviewUrlRef.current = res.embedUrl;
          newlyUploadedBunnyVideoIdRef.current = res.videoId;
        },
      });
      previewUploadTaskIdRef.current = taskId;
    } catch (err) {
      console.error('Failed to start preview video upload:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleCancelVideoUpload = () => {
    const taskId = previewUploadTaskIdRef.current || backgroundUploadTask?.id || `preview-${course.id}`;
    if (taskId) {
      cancelUpload(taskId);
    }
    previewUploadTaskIdRef.current = null;
  };

  const handleRemovePreviewVideo = () => {
    if (newlyUploadedBunnyVideoIdRef.current) {
      coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
      newlyUploadedBunnyVideoIdRef.current = null;
    } else if (newlyUploadedPreviewUrlRef.current) {
      coursesApi.deleteUploadedFile(newlyUploadedPreviewUrlRef.current).catch(() => {});
      newlyUploadedPreviewUrlRef.current = null;
    }
    setPreviewVideoUrl('');
    toast.success('تمت إزالة الفيديو التعريفي');
  };

  const handleCancel = () => {
    if (!isSubmittedRef.current) {
      if (newUploadedKeyRef.current) {
        coursesApi.deleteUploadedFile(newUploadedKeyRef.current).catch(() => {});
      }
      const taskId = previewUploadTaskIdRef.current || (isUploadingVideo ? backgroundUploadTask?.id : null);
      if (isUploadingVideo && taskId) {
        cancelUpload(taskId);
      }
      if (newlyUploadedBunnyVideoIdRef.current) {
        coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
        newlyUploadedBunnyVideoIdRef.current = null;
      } else if (newlyUploadedPreviewUrlRef.current) {
        coursesApi.deleteUploadedFile(newlyUploadedPreviewUrlRef.current).catch(() => {});
        newlyUploadedPreviewUrlRef.current = null;
      }
      if (previewVideoUrl && previewVideoUrl !== initialPreviewVideoUrlRef.current) {
        coursesApi.updateCourse(course.id, {
          previewVideoUrl: initialPreviewVideoUrlRef.current,
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['course-details', course.id] });
          queryClient.invalidateQueries({ queryKey: ['courses'] });
        }).catch(() => {});
      }
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال اسم الكورس');
      return;
    }

    try {
      isSubmittedRef.current = true;
      const finalPrice = isFreeCourse ? 0 : (parseFloat(price) || 0);

      const payload: Parameters<typeof updateMutation.mutateAsync>[0] = {
        title: title.trim(),
        description: description.trim() || undefined,
        subject: subject.trim(),
        gradeLevel: gradeLevel.trim(),
        academicStage: academicStage.trim(),
        academicTerm,
        academicYear: academicYear.trim(),
        price: finalPrice,
        coverImageUrl: coverImageUrl || undefined,
        courseQuizId: courseQuizId || null,
        hasCertificate,
        enforceSequentialLessons,
        requireExamPassingToUnlock,
      };

      // If video upload is still active in background, we omit previewVideoUrl from payload
      // so video-upload-manager can auto-save the embedUrl when upload completes!
      if (!isUploadingVideo) {
        payload.previewVideoUrl = previewVideoUrl.trim() || null;
      }

      await updateMutation.mutateAsync(payload);

      // Clean up old cover if replaced
      if (
        initialCoverUrlRef.current &&
        coverImageUrl &&
        initialCoverUrlRef.current !== coverImageUrl
      ) {
        coursesApi.deleteUploadedFile(initialCoverUrlRef.current).catch(() => {});
      }

      // Clean up old preview video if changed/removed and not currently uploading
      if (
        initialPreviewVideoUrlRef.current &&
        previewVideoUrl !== initialPreviewVideoUrlRef.current &&
        !isUploadingVideo
      ) {
        coursesApi.deleteUploadedFile(initialPreviewVideoUrlRef.current).catch(() => {});
      }

      if (isUploadingVideo) {
        toast.success('تم حفظ التغييرات، ويستمر رفع الفيديو في الخلفية بأمان 🚀', {
          duration: 5000,
        });
      } else {
        toast.success('تم تحديث بيانات الكورس بنجاح');
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch {
      isSubmittedRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <Settings2 className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900">تعديل بيانات وإعدادات الكورس</h2>
              <p className="text-xs text-slate-500">تعديل الاسم، المرحلة الدراسية، والأسعار والتفاصيل</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form - Scrollable */}
        <form
          id="edit-course-form"
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-5 text-right bg-white flex-1"
        >
          {/* Course Title */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              اسم الكورس <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: شرح تفاضل وحساب مثلثات 2ث"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs"
              required
            />
          </div>

          {/* Academic Stage & Grade Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary-600" />
                <span>المرحلة الدراسية</span>
              </label>
              <select
                value={academicStage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs cursor-pointer"
              >
                <option value="المرحلة الثانوية">المرحلة الثانوية</option>
                <option value="المرحلة الإعدادية">المرحلة الإعدادية</option>
                <option value="المرحلة الابتدائية">المرحلة الابتدائية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-primary-600" />
                <span>الصف الدراسي</span>
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs cursor-pointer"
              >
                {(STAGE_GRADES[academicStage] || STAGE_GRADES['المرحلة الثانوية']).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject & Term */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                المادة الدراسية
              </label>
              <input
                type="text"
                list="common-subjects-list"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="مثال: الرياضيات"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs"
              />
              <datalist id="common-subjects-list">
                {COMMON_SUBJECTS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                الفصل الدراسي
              </label>
              <select
                value={academicTerm}
                onChange={(e) => setAcademicTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs cursor-pointer"
              >
                <option value="FIRST_TERM">الترم الأول</option>
                <option value="SECOND_TERM">الترم الثاني</option>
                <option value="FULL_YEAR">العام بالكامل</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>السنة الدراسية</span>
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026-2027"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs font-mono"
              />
            </div>
          </div>

          {/* Course Pricing Type (مجاني / مدفوع) */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <label className="block text-xs font-bold text-slate-800">
              نوع الاشتراك وتسعير الكورس
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsFreeCourse(false);
                  if (price === '0' || !price) setPrice('200');
                }}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                  !isFreeCourse
                    ? 'bg-white border-primary-500 ring-2 ring-primary-500/20 shadow-xs'
                    : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <CreditCard className="w-4 h-4 text-primary-600" />
                    <span>كورس مدفوع</span>
                  </div>
                  {!isFreeCourse && <Check className="w-3.5 h-3.5 text-primary-600" />}
                </div>
                <span className="text-[11px] text-slate-500">يتطلب سداد اشتراك أو إيصال تحويل</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFreeCourse(true);
                  setPrice('0');
                }}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                  isFreeCourse
                    ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Gift className="w-4 h-4 text-emerald-600" />
                    <span>كورس مجاني 🎁</span>
                  </div>
                  {isFreeCourse && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <span className="text-[11px] text-emerald-700 font-medium">متاح للجميع مجاناً وبدون رسوم</span>
              </button>
            </div>

            {!isFreeCourse ? (
              <div className="pt-2 animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  سعر الاشتراك في الكورس (ج.م) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="مثال: 250"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs font-mono font-bold"
                    required={!isFreeCourse}
                  />
                  <span className="text-xs font-bold text-slate-400 absolute left-3 top-2.5">ج.م</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  سيطلب من الطلاب تحويل هذا المبلغ على محفظة فودافون كاش وإرفاق صورة الإيصال.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>يمكن للطلاب الاشتراك في هذا الكورس بضغطة زر ومشاهدة الدروس فوراً دون الحاجة لتحويل مالي.</span>
              </div>
            )}
          </div>

          {/* Direct Cover Upload Dropzone */}
          <div>
            <FileUploadZone
              accept="image/*"
              folder="courses"
              label="صورة غلاف الكورس (رفع مباشر)"
              description="اسحب وأفلت صورة الغلاف هنا، أو انقر للاختيار من جهازك"
              currentFileUrl={coverImageUrl}
              currentFileKey={coverImageKey}
              onUploadComplete={({ fileUrl, fileKey }) => {
                setCoverImageUrl(fileUrl);
                setCoverImageKey(fileKey);
                newUploadedKeyRef.current = fileKey || fileUrl;
              }}
              onRemoveFile={() => {
                setCoverImageUrl(null);
                setCoverImageKey(null);
              }}
              fileCategory="image"
            />
          </div>

          {/* Course Preview / Info Video */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-primary-600" />
                <span>فيديو تعريفي / برومو الكورس (معاينة مجانية قبل الشراء)</span>
              </label>
              <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-bold">
                اختياري
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              فيديو قصير تعريفي يشرح مميزات ومحتوى الكورس للطلاب قبل اتخاذ قرار الشراء أو الاشتراك (رفع مباشر إلى سيرفرات البث السحابي).
            </p>

            {/* 1. Upload in Progress Card */}
            {isUploadingVideo && backgroundUploadTask && (
              <div className="p-4 bg-white border border-primary-200 rounded-2xl shadow-xs space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                    {backgroundUploadTask.status === 'inspecting'
                      ? 'جاري فحص وتجهيز الفيديو والضغط السحابي...'
                      : 'جاري الرفع المباشر إلى سيرفرات البث السحابي (Bunny Stream)...'}
                  </span>
                  <span className="font-mono text-primary-600 text-sm">
                    {backgroundUploadTask.progress}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-primary-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${backgroundUploadTask.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    {backgroundUploadTask.totalBytes > 0 && (
                      <span>
                        تم رفع:{' '}
                        <strong className="text-slate-800 font-mono">
                          {formatVideoSize(backgroundUploadTask.uploadedBytes)}
                        </strong>{' '}
                        من{' '}
                        <strong className="text-slate-800 font-mono">
                          {formatVideoSize(backgroundUploadTask.totalBytes)}
                        </strong>
                      </span>
                    )}
                    {backgroundUploadTask.speedMbps > 0 && (
                      <span className="flex items-center gap-1 text-primary-600">
                        <Gauge className="w-3.5 h-3.5" />
                        <span className="font-mono">{backgroundUploadTask.speedMbps} ميجابايت/ث</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {backgroundUploadTask.etaSeconds > 0 && (
                      <span className="text-slate-600">
                        الوقت المتبقي:{' '}
                        <strong className="text-slate-800">
                          {formatEtaArabic(backgroundUploadTask.etaSeconds)}
                        </strong>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleCancelVideoUpload}
                      className="text-rose-600 hover:text-rose-700 hover:underline text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      إلغاء الرفع
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50/80 border border-blue-100/90 rounded-xl p-2.5 text-center text-xs text-blue-800 flex items-center justify-center gap-2">
                  <span className="text-base leading-none">💡</span>
                  <span className="font-medium">
                    يستمر رفع الفيديو في الخلفية بأمان — يمكنك الضغط على "حفظ التغييرات" وسيكتمل الرفع والربط تلقائياً.
                  </span>
                </div>
              </div>
            )}

            {/* 2. Video Already Uploaded / Ready */}
            {!isUploadingVideo && previewVideoUrl && (
              <div className="space-y-3">
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-xs relative">
                  <iframe
                    src={previewVideoUrl}
                    className="w-full h-full border-0"
                    allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                    allowFullScreen
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-medium">الفيديو التعريفي مفعّل وجاهز للعرض</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
                      <span>تغيير الفيديو</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleDirectVideoUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemovePreviewVideo}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="حذف الفيديو"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Empty State: Direct Video Upload Dropzone */}
            {!isUploadingVideo && !previewVideoUrl && (
              <div className="border-2 border-dashed border-slate-200 hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-white group">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleDirectVideoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="pointer-events-none flex flex-col items-center gap-2 text-slate-600">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-primary-100 shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">
                    انقر لاختيار فيديو أو سحبه هنا للرفع المباشر إلى سيرفرات البث السحابي
                  </p>
                  <div className="flex items-center flex-wrap justify-center gap-2 text-[11px] text-slate-500 mt-1">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      الحد الأقصى: 2 جيجابايت
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 font-medium">
                      تشفير وحماية سحابية تلقائية
                    </span>
                    <span>•</span>
                    <span>دقة فائقة HLS متكيفة</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              نبذة ووصف الكورس
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب نبذة تشرح محتوى ومميزات هذا الكورس للطلاب..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs leading-relaxed"
            />
          </div>

          {/* Sequential Order & Certificate Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-right">
                <label
                  htmlFor="edit-course-sequential"
                  className="block text-xs font-bold text-slate-800"
                >
                  ترتيب مشاهدة الدروس
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                  إلزام الطالب بإكمال كل درس بالترتيب قبل فتح الدرس التالي.
                </p>
              </div>
              <button
                id="edit-course-sequential"
                type="button"
                role="switch"
                aria-checked={enforceSequentialLessons}
                onClick={() => setEnforceSequentialLessons((v) => !v)}
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
                  enforceSequentialLessons ? 'bg-primary-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    enforceSequentialLessons ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-right">
                <label
                  htmlFor="edit-course-certificate"
                  className="block text-xs font-bold text-slate-800"
                >
                  إصدار شهادة إتمام
                </label>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                  منح الطالب شهادة إلكترونية معتمدة عند إكمال الكورس.
                </p>
              </div>
              <button
                id="edit-course-certificate"
                type="button"
                role="switch"
                aria-checked={hasCertificate}
                onClick={() => setHasCertificate((v) => !v)}
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
                  hasCertificate ? 'bg-cyan-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    hasCertificate ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Final Quiz Linking */}
          <div className="p-4 bg-primary-50/50 border border-primary-100 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-bold text-slate-800">
                ربط الاختبار النهائي الشامل للكورس
              </label>
            </div>
            {assessments.length === 0 ? (
              <div className="p-3 bg-white border border-dashed border-amber-300 rounded-xl text-center space-y-2">
                <p className="text-xs font-bold text-slate-800">لا توجد اختبارات منشأة حالياً</p>
                <a
                  href="/teacher/assessments"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء اختبار جديد</span>
                  <ExternalLink className="w-3 h-3 mr-0.5" />
                </a>
              </div>
            ) : (
              <select
                value={courseQuizId}
                onChange={(e) => setCourseQuizId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs cursor-pointer"
              >
                <option value="">-- بدون اختبار شامل حالياً --</option>
                {assessments.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.type === 'EXAM' ? 'امتحان شامل' : a.type === 'HOMEWORK' ? 'واجب' : 'اختبار قصير'} - {a.totalScore} درجة)
                  </option>
                ))}
              </select>
            )}
          </div>
        </form>

        {/* Footer Actions - Fixed */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="edit-course-form"
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );
}
