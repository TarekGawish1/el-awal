'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  BookOpen,
  DollarSign,
  Award,
  Plus,
  ExternalLink,
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
import { useCreateCourse } from '../hooks/useCourses';
import { coursesApi } from '../api/courses.api';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
import { FileUploadZone } from './FileUploadZone';
import { useVideoUploadManager } from '../context/video-upload-manager.context';
import {
  validateVideoFile,
  formatVideoSize,
  formatEtaArabic,
} from '../utils/video-optimizer';
import toast from 'react-hot-toast';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (courseId: string) => void;
}

export function CreateCourseModal({ isOpen, onClose, onSuccess }: CreateCourseModalProps) {
  const createMutation = useCreateCourse();
  const { data: assessmentsData } = useAssessments();
  const assessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : (assessmentsData?.data || []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('اللغة العربية');
  const [gradeLevel, setGradeLevel] = useState('الصف الثالث الثانوي');
  const [academicStage, setAcademicStage] = useState('المرحلة الثانوية');
  const [isFreeCourse, setIsFreeCourse] = useState(false);
  const [price, setPrice] = useState('200');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [courseQuizId, setCourseQuizId] = useState('');
  const [hasCertificate, setHasCertificate] = useState(true);

  const isSubmittedRef = useRef(false);
  const coverImageKeyRef = useRef<string | null>(null);
  const coverImageUrlRef = useRef<string | null>(null);

  const { startUpload, cancelUpload, tasks } = useVideoUploadManager();
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const activeVideoTask = previewTaskId ? tasks[previewTaskId] : undefined;

  const newlyUploadedBunnyVideoIdRef = useRef<string | null>(null);
  const newlyUploadedPreviewUrlRef = useRef<string | null>(null);
  const previewUploadTaskIdRef = useRef<string | null>(null);

  const isUploadingVideo =
    activeVideoTask?.status === 'uploading' ||
    activeVideoTask?.status === 'inspecting' ||
    activeVideoTask?.status === 'processing';

  // Sync completed video to preview
  useEffect(() => {
    if (!activeVideoTask) return;
    if (activeVideoTask.status === 'completed' && activeVideoTask.embedUrl) {
      setPreviewVideoUrl(activeVideoTask.embedUrl);
      newlyUploadedPreviewUrlRef.current = activeVideoTask.embedUrl;
      if (activeVideoTask.videoId) {
        newlyUploadedBunnyVideoIdRef.current = activeVideoTask.videoId;
      }
    }
  }, [activeVideoTask]);

  useEffect(() => {
    coverImageKeyRef.current = coverImageKey;
    coverImageUrlRef.current = coverImageUrl;
  }, [coverImageKey, coverImageUrl]);

  // Clean up uploaded image/video if modal is unmounted without submitting
  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current) {
        if (coverImageKeyRef.current || coverImageUrlRef.current) {
          coursesApi.deleteUploadedFile(coverImageKeyRef.current || coverImageUrlRef.current);
        }
        if (previewUploadTaskIdRef.current) {
          cancelUpload(previewUploadTaskIdRef.current);
        }
        if (newlyUploadedBunnyVideoIdRef.current) {
          coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
        } else if (newlyUploadedPreviewUrlRef.current) {
          coursesApi.deleteUploadedFile(newlyUploadedPreviewUrlRef.current).catch(() => {});
        }
      }
    };
  }, [cancelUpload]);

  if (!isOpen) return null;

  const handleDirectVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.isValid) {
      toast.error(validation.error || 'حجم الفيديو يتجاوز الحد الأقصى المسموح به (2 جيجابايت)');
      e.target.value = '';
      return;
    }

    if (newlyUploadedBunnyVideoIdRef.current) {
      coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
      newlyUploadedBunnyVideoIdRef.current = null;
    }

    try {
      const taskId = await startUpload({
        file,
        isCoursePreview: true,
        lessonTitle: `برومو كورس: ${title.trim() || 'كورس جديد'}`,
        onSuccess: (res) => {
          setPreviewVideoUrl(res.embedUrl);
          newlyUploadedPreviewUrlRef.current = res.embedUrl;
          newlyUploadedBunnyVideoIdRef.current = res.videoId;
        },
      });
      setPreviewTaskId(taskId);
      previewUploadTaskIdRef.current = taskId;
    } catch (err) {
      console.error('Failed to start preview video upload:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleCancelVideoUpload = () => {
    if (previewUploadTaskIdRef.current) {
      cancelUpload(previewUploadTaskIdRef.current);
    }
    setPreviewTaskId(null);
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
      if (coverImageKey || coverImageUrl) {
        coursesApi.deleteUploadedFile(coverImageKey || coverImageUrl);
        setCoverImageUrl(null);
        setCoverImageKey(null);
      }
      if (previewUploadTaskIdRef.current) {
        cancelUpload(previewUploadTaskIdRef.current);
      }
      if (newlyUploadedBunnyVideoIdRef.current) {
        coursesApi.deleteUploadedFile(`bunny:${newlyUploadedBunnyVideoIdRef.current}`).catch(() => {});
        newlyUploadedBunnyVideoIdRef.current = null;
      } else if (newlyUploadedPreviewUrlRef.current) {
        coursesApi.deleteUploadedFile(newlyUploadedPreviewUrlRef.current).catch(() => {});
        newlyUploadedPreviewUrlRef.current = null;
      }
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان الكورس');
      return;
    }
    if (isUploadingVideo) {
      toast.error('يرجى الانتظار حتى اكتمال رفع الفيديو التعريفي لحفظه مع الكورس الجديد');
      return;
    }

    try {
      isSubmittedRef.current = true;
      const finalPrice = isFreeCourse ? 0 : (parseFloat(price) || 0);
      const newCourse = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        subject,
        gradeLevel,
        academicStage,
        price: finalPrice,
        coverImageUrl: coverImageUrl || undefined,
        previewVideoUrl: previewVideoUrl.trim() || undefined,
        courseQuizId: courseQuizId || undefined,
        hasCertificate,
      });

      onClose();
      if (onSuccess && newCourse?.id) {
        onSuccess(newCourse.id);
      }
    } catch {
      isSubmittedRef.current = false;
      // Handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900">إنشاء كورس تعليمي جديد</h2>
              <p className="text-xs text-slate-500">إضافة دورة تدريبية بفصول وشروحات تفاعلية</p>
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
        <form id="create-course-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-right bg-white flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              عنوان الكورس <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: المراجعة النهائية في النحو والبلاغة"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                المادة الدراسية
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                الصف الدراسي
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm cursor-pointer"
              >
                <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
              </select>
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

          <div className="flex items-start justify-between gap-4 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4">
            <div className="text-right">
              <label htmlFor="course-certificate" className="block text-xs font-bold text-slate-800">
                إصدار شهادة إتمام
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                اسمح للطلاب بتحميل شهادة عند إكمال جميع دروس الكورس.
              </p>
            </div>
            <button
              id="course-certificate"
              type="button"
              role="switch"
              aria-checked={hasCertificate}
              onClick={() => setHasCertificate((value) => !value)}
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${hasCertificate ? 'bg-cyan-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${hasCertificate ? 'translate-x-1' : 'translate-x-6'}`} />
            </button>
          </div>

          {/* Direct Presigned Cover Upload Dropzone */}
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
            {isUploadingVideo && activeVideoTask && (
              <div className="p-4 bg-white border border-primary-200 rounded-2xl shadow-xs space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                    {activeVideoTask.status === 'inspecting'
                      ? 'جاري فحص وتجهيز الفيديو والضغط السحابي...'
                      : 'جاري الرفع المباشر إلى سيرفرات البث السحابي (Bunny Stream)...'}
                  </span>
                  <span className="font-mono text-primary-600 text-sm">
                    {activeVideoTask.progress}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-primary-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${activeVideoTask.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    {activeVideoTask.totalBytes > 0 && (
                      <span>
                        تم رفع:{' '}
                        <strong className="text-slate-800 font-mono">
                          {formatVideoSize(activeVideoTask.uploadedBytes)}
                        </strong>{' '}
                        من{' '}
                        <strong className="text-slate-800 font-mono">
                          {formatVideoSize(activeVideoTask.totalBytes)}
                        </strong>
                      </span>
                    )}
                    {activeVideoTask.speedMbps > 0 && (
                      <span className="flex items-center gap-1 text-primary-600">
                        <Gauge className="w-3.5 h-3.5" />
                        <span className="font-mono">{activeVideoTask.speedMbps} ميجابايت/ث</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {activeVideoTask.etaSeconds > 0 && (
                      <span className="text-slate-600">
                        الوقت المتبقي:{' '}
                        <strong className="text-slate-800">
                          {formatEtaArabic(activeVideoTask.etaSeconds)}
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

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              نبذة ووصف الكورس
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب نبذة تشرح ما سيتعلمه الطالب وأهم مميزات هذه الدورة..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm leading-relaxed"
            />
          </div>

          {/* Course Final Quiz Linking */}
          <div className="p-4 bg-primary-50/50 border border-primary-100 rounded-xl space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-bold text-slate-800">
                ربط الاختبار النهائي الشامل للكورس
              </label>
            </div>
            {assessments.length === 0 ? (
              <div className="p-3.5 bg-white border border-dashed border-amber-300 rounded-xl text-center space-y-2">
                <p className="text-xs font-bold text-slate-800">لا توجد امتحانات منشأة حالياً في حسابك</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  يمكنك إنشاء امتحانات شاملة من قسم <strong>"الامتحانات والواجبات"</strong>، ثم ربطها كتقييم نهائي للكورس.
                </p>
                <div className="pt-1">
                  <a
                    href="/teacher/assessments"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إنشاء اختبار جديد</span>
                    <ExternalLink className="w-3 h-3 mr-0.5" />
                  </a>
                </div>
              </div>
            ) : (
              <select
                value={courseQuizId}
                onChange={(e) => setCourseQuizId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm cursor-pointer"
              >
                <option value="">-- بدون اختبار شامل حالياً --</option>
                {assessments.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.type === 'EXAM' ? 'امتحان شامل' : a.type === 'HOMEWORK' ? 'واجب' : 'اختبار قصير'} - {a.totalScore} درجة)
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-500">
              يظهر هذا الاختبار في نهاية المنهج كتقييم ختامي للطالب بعد إنهاء جميع الدروس.
            </p>
          </div>
        </form>

        {/* Footer Actions - Fixed */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="create-course-form"
            disabled={createMutation.isPending}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء ومتابعة البناء'}
          </button>
        </div>
      </div>
    </div>
  );
}
