'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, BookOpen, DollarSign, Award, Plus, ExternalLink } from 'lucide-react';
import { useCreateCourse } from '../hooks/useCourses';
import { coursesApi } from '../api/courses.api';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
import { FileUploadZone } from './FileUploadZone';
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
  const [price, setPrice] = useState('0');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [courseQuizId, setCourseQuizId] = useState('');
  const [hasCertificate, setHasCertificate] = useState(true);

  const isSubmittedRef = useRef(false);
  const coverImageKeyRef = useRef<string | null>(null);
  const coverImageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    coverImageKeyRef.current = coverImageKey;
    coverImageUrlRef.current = coverImageUrl;
  }, [coverImageKey, coverImageUrl]);

  // Clean up uploaded image if modal is unmounted without submitting
  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current && (coverImageKeyRef.current || coverImageUrlRef.current)) {
        coursesApi.deleteUploadedFile(coverImageKeyRef.current || coverImageUrlRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleCancel = () => {
    if (!isSubmittedRef.current && (coverImageKey || coverImageUrl)) {
      coursesApi.deleteUploadedFile(coverImageKey || coverImageUrl);
      setCoverImageUrl(null);
      setCoverImageKey(null);
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان الكورس');
      return;
    }

    try {
      isSubmittedRef.current = true;
      const newCourse = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        subject,
        gradeLevel,
        academicStage,
        price: parseFloat(price) || 0,
        coverImageUrl: coverImageUrl || undefined,
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

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              سعر الاشتراك (ج.م)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="10"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm font-mono"
              />
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">ضع 0 إذا كان الكورس متاحاً ومجانياً</span>
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
