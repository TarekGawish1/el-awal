'use client';

import React, { useState } from 'react';
import { X, BookOpen, DollarSign, Award } from 'lucide-react';
import { useCreateCourse } from '../hooks/useCourses';
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
  const assessments = assessmentsData?.data || [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('اللغة العربية');
  const [gradeLevel, setGradeLevel] = useState('الصف الثالث الثانوي');
  const [academicStage, setAcademicStage] = useState('المرحلة الثانوية');
  const [price, setPrice] = useState('0');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [courseQuizId, setCourseQuizId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان الكورس');
      return;
    }

    try {
      const newCourse = await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        subject,
        gradeLevel,
        academicStage,
        price: parseFloat(price) || 0,
        coverImageUrl: coverImageUrl || undefined,
        courseQuizId: courseQuizId || undefined,
      });

      onClose();
      if (onSuccess && newCourse?.id) {
        onSuccess(newCourse.id);
      }
    } catch {
      // Handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">إنشاء كورس تعليمي جديد</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">إضافة دورة تدريبية بفصول وشروحات تفاعلية</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-right bg-white dark:bg-slate-900">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              عنوان الكورس <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: المراجعة النهائية في النحو والبلاغة"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                المادة الدراسية
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                الصف الدراسي
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
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
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              سعر الاشتراك (ج.م)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="10"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white pl-10 focus:ring-2 focus:ring-blue-600 outline-none"
              />
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">ضع 0 إذا كان الكورس متاحاً ومجانياً</span>
          </div>

          {/* Direct Presigned Cover Upload Dropzone */}
          <div>
            <FileUploadZone
              accept="image/*"
              folder="courses"
              label="صورة غلاف الكورس (رفع مباشر)"
              description="اسحب وأفلت صورة الغلاف هنا، أو انقر للاختيار من جهازك"
              currentFileUrl={coverImageUrl}
              onUploadComplete={({ fileUrl }) => setCoverImageUrl(fileUrl)}
              onRemoveFile={() => setCoverImageUrl(null)}
              fileCategory="image"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              نبذة ووصف الكورس
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب نبذة تشرح ما سيتعلمه الطالب وأهم مميزات هذه الدورة..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
            />
          </div>

          {/* Course Final Quiz Linking */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                ربط الاختبار النهائي الشامل للكورس
              </label>
            </div>
            <select
              value={courseQuizId}
              onChange={(e) => setCourseQuizId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
            >
              <option value="">-- بدون اختبار شامل حالياً --</option>
              {assessments.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.type === 'EXAM' ? 'امتحان شامل' : 'واجب'} - {a.totalScore} درجة)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              يظهر هذا الاختبار في نهاية المنهج كتقييم ختامي للطالب بعد إنهاء جميع الدروس.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-md shadow-blue-600/30 disabled:opacity-50"
            >
              {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء ومتابعة البناء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
