'use client';

import React from 'react';
import { X, BookOpen, Plus, ExternalLink, Award } from 'lucide-react';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
import { FileUploadZone } from './FileUploadZone';
import { useCreateCourseModal } from '../hooks/useCreateCourseModal';
import { CoursePricingSection } from './create-course/CoursePricingSection';
import { CoursePreviewVideoSection } from './create-course/CoursePreviewVideoSection';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (courseId: string) => void;
}

export function CreateCourseModal({ isOpen, onClose, onSuccess }: CreateCourseModalProps) {
  const { data: assessmentsData } = useAssessments(undefined, { enabled: isOpen });
  const assessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : (assessmentsData?.data || []);

  const {
    title,
    setTitle,
    description,
    setDescription,
    subject,
    setSubject,
    gradeLevel,
    setGradeLevel,
    isFreeCourse,
    setIsFreeCourse,
    price,
    setPrice,
    coverImageUrl,
    setCoverImageUrl,
    coverImageKey,
    setCoverImageKey,
    previewVideoUrl,
    courseQuizId,
    setCourseQuizId,
    hasCertificate,
    setHasCertificate,
    activeVideoTask,
    isUploadingVideo,
    isPending,
    handleDirectVideoUpload,
    handleCancelVideoUpload,
    handleRemovePreviewVideo,
    handleCancel,
    handleSubmit,
  } = useCreateCourseModal({ isOpen, onClose, onSuccess });

  if (!isOpen) return null;

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

          {/* Course Pricing Type (مجاني / مدفوع) & Certificate */}
          <CoursePricingSection
            isFreeCourse={isFreeCourse}
            setIsFreeCourse={setIsFreeCourse}
            price={price}
            setPrice={setPrice}
            hasCertificate={hasCertificate}
            setHasCertificate={setHasCertificate}
          />

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
          <CoursePreviewVideoSection
            isUploadingVideo={isUploadingVideo}
            activeVideoTask={activeVideoTask}
            previewVideoUrl={previewVideoUrl}
            handleDirectVideoUpload={handleDirectVideoUpload}
            handleCancelVideoUpload={handleCancelVideoUpload}
            handleRemovePreviewVideo={handleRemovePreviewVideo}
          />

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
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            {isPending ? 'جاري الإنشاء...' : 'إنشاء ومتابعة البناء'}
          </button>
        </div>
      </div>
    </div>
  );
}
