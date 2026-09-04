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
} from 'lucide-react';
import { useUpdateCourse } from '../hooks/useCourses';
import { coursesApi } from '../api/courses.api';
import { CourseDetail } from '../types/courses.types';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
import { FileUploadZone } from './FileUploadZone';
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
  const updateMutation = useUpdateCourse(course.id);
  const { data: assessmentsData } = useAssessments();
  const assessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : (assessmentsData?.data || []);

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
  const [courseQuizId, setCourseQuizId] = useState(course.courseQuizId || '');
  const [hasCertificate, setHasCertificate] = useState(course.hasCertificate ?? true);
  const [enforceSequentialLessons, setEnforceSequentialLessons] = useState(
    course.enforceSequentialLessons ?? false,
  );
  const [requireExamPassingToUnlock, setRequireExamPassingToUnlock] = useState(
    course.requireExamPassingToUnlock ?? false,
  );

  const initialCoverUrlRef = useRef<string | null>(course.coverImageUrl || null);
  const isSubmittedRef = useRef(false);
  const newUploadedKeyRef = useRef<string | null>(null);

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
      setCourseQuizId(course.courseQuizId || '');
      setHasCertificate(course.hasCertificate ?? true);
      setEnforceSequentialLessons(course.enforceSequentialLessons ?? false);
      setRequireExamPassingToUnlock(course.requireExamPassingToUnlock ?? false);
      initialCoverUrlRef.current = course.coverImageUrl || null;
      isSubmittedRef.current = false;
      newUploadedKeyRef.current = null;
    }
  }, [isOpen, course]);

  // Clean up any newly uploaded staged image on unmount/cancel if not submitted
  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current && newUploadedKeyRef.current) {
        coursesApi.deleteUploadedFile(newUploadedKeyRef.current).catch(() => {});
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleStageChange = (newStage: string) => {
    setAcademicStage(newStage);
    const availableGrades = STAGE_GRADES[newStage];
    if (availableGrades && availableGrades.length > 0 && !availableGrades.includes(gradeLevel)) {
      setGradeLevel(availableGrades[0]);
    }
  };

  const handleCancel = () => {
    if (!isSubmittedRef.current && newUploadedKeyRef.current) {
      coursesApi.deleteUploadedFile(newUploadedKeyRef.current).catch(() => {});
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
      await updateMutation.mutateAsync({
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
      });

      // If cover was replaced and submission succeeded, clean up old image if different
      if (
        initialCoverUrlRef.current &&
        coverImageUrl &&
        initialCoverUrlRef.current !== coverImageUrl
      ) {
        coursesApi.deleteUploadedFile(initialCoverUrlRef.current).catch(() => {});
      }

      toast.success('تم تحديث بيانات الكورس بنجاح');
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

            {enforceSequentialLessons && (
              <div className="mr-4 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2 text-right transition-all">
                <span className="block text-xs font-bold text-slate-800">
                  شرط فتح الدرس التالي عند وجود اختبار/واجب:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRequireExamPassingToUnlock(false)}
                    className={`p-2.5 rounded-lg border text-right transition-all cursor-pointer ${
                      !requireExamPassingToUnlock
                        ? 'bg-white border-primary-500 text-primary-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${!requireExamPassingToUnlock ? 'border-primary-600' : 'border-slate-300'}`}>
                        {!requireExamPassingToUnlock && <span className="w-2 h-2 rounded-full bg-primary-600" />}
                      </span>
                      <span>مجرد حل وتسليم الاختبار</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 mr-5">
                      يُفتح الدرس بمجرد إرسال الطالب لإجابات الاختبار دون اشتراط درجة محددة
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequireExamPassingToUnlock(true)}
                    className={`p-2.5 rounded-lg border text-right transition-all cursor-pointer ${
                      requireExamPassingToUnlock
                        ? 'bg-white border-primary-500 text-primary-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${requireExamPassingToUnlock ? 'border-primary-600' : 'border-slate-300'}`}>
                        {requireExamPassingToUnlock && <span className="w-2 h-2 rounded-full bg-primary-600" />}
                      </span>
                      <span>النجاح واجتياز درجة النجاح 🎯</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 mr-5">
                      لا يُفتح الدرس إلا بعد تحقيق درجة النجاح المحددة في إعدادات الاختبار
                    </p>
                  </button>
                </div>
              </div>
            )}

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
