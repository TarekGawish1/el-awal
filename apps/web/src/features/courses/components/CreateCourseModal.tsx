'use client';

import React, { useState } from 'react';
import { X, BookOpen, Layers, DollarSign, Award, Image as ImageIcon } from 'lucide-react';
import { useCreateCourse } from '../hooks/useCourses';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
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
  const [coverImageUrl, setCoverImageUrl] = useState('');
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
        coverImageUrl: coverImageUrl.trim() || undefined,
        courseQuizId: courseQuizId || undefined,
      });

      onClose();
      if (onSuccess && newCourse?.id) {
        onSuccess(newCourse.id);
      }
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-white my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">إنشاء كورس تعليمي جديد</h2>
              <p className="text-xs text-slate-400">إضافة دورة تدريبية بمستويات وشروحات متعددة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-right">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              عنوان الكورس <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: مراجعة ليلة الامتحان في النحو والبلاغة"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                المادة الدراسية
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الصف الدراسي
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                سعر الاشتراك (ج.م)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white pl-10 focus:outline-none focus:border-indigo-500"
                />
                <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
              <span className="text-[11px] text-slate-500">ضع 0 إذا كان الكورس مجانياً</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                رابط صورة الغلاف (اختياري)
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white pl-10 focus:outline-none focus:border-indigo-500"
                />
                <ImageIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              وصف ونبذة عن الكورس
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب نبذة تشرح ما سيتعلمه الطالب وأهم مميزات هذه الدورة..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Course Final Quiz Linking */}
          <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/40 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-amber-400" />
              <label className="text-xs font-bold text-indigo-300">
                ربط الاختبار الشامل النهائي للكورس (Course Final Exam)
              </label>
            </div>
            <select
              value={courseQuizId}
              onChange={(e) => setCourseQuizId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- بدون اختبار شامل حالياً --</option>
              {assessments.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.type === 'EXAM' ? 'امتحان شامل' : 'واجب'} - {a.totalScore} درجة)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">
              يظهر هذا الاختبار في نهاية المنهج كتقييم ختامي للطالب بعد إنهاء جميع الدروس.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {createMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء ومتابعة البناء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
