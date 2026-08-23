'use client';

import React, { useState } from 'react';
import { X, UserPlus, Phone, User, CheckCircle, ShieldCheck } from 'lucide-react';
import { useCreateAndEnrollStudent } from '../hooks/useCourses';
import { useGroups } from '@/features/groups/hooks/useGroups';
import toast from 'react-hot-toast';

interface CreateStudentEnrollModalProps {
  isOpen: boolean;
  courseId: string;
  courseTitle: string;
  defaultGradeLevel?: string;
  onClose: () => void;
}

export function CreateStudentEnrollModal({
  isOpen,
  courseId,
  courseTitle,
  defaultGradeLevel = 'الصف الثالث الثانوي',
  onClose,
}: CreateStudentEnrollModalProps) {
  const createMutation = useCreateAndEnrollStudent(courseId);
  const { data: groupsData } = useGroups();
  const groups = Array.isArray(groupsData) ? groupsData : (groupsData as any)?.data || [];

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [gradeLevel, setGradeLevel] = useState(defaultGradeLevel);
  const [groupId, setGroupId] = useState('');

  const [createdResult, setCreatedResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !parentPhone.trim()) {
      toast.error('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    try {
      const res = await createMutation.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim(),
        parentPhone: parentPhone.trim(),
        gradeLevel,
        groupId: groupId || undefined,
      });

      setCreatedResult(res.student);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">تسجيل طالب جديد وضمّه للكورس</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {createdResult ? (
          <div className="p-6 space-y-4 text-right">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>تم تسجيل وتفعيل اشتراك الطالب بنجاح!</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                يمكن للطالب الآن تسجيل الدخول إلى المنصة ومشاهدة الكورس عبر البيانات التالية:
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-2 font-mono text-xs text-slate-900 dark:text-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">اسم الطالب:</span>
                <span className="font-bold">{createdResult.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">كود الطالب:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{createdResult.studentCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الهاتف:</span>
                <span>{createdResult.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">كلمة المرور المؤقتة:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{createdResult.generatedPassword}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-blue-600/30"
              >
                تم والعودة للكورس
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-right overflow-y-auto">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم الطالب ثلاثي / رباعي *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: يوسف أحمد عبد المنعم"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم هاتف الطالب *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم هاتف ولي الأمر *
                </label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="011XXXXXXXX"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الصف الدراسي
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                  <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                  <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                  <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
                  <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
                  <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المجموعة الدراسية (اختياري)
                </label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">بدون مجموعة حالياً</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/30 rounded-2xl text-[11px] text-blue-800 dark:text-blue-300">
              💡 سيتم توليد كود الطالب وكلمة المرور تلقائياً وتفعيل اشتراكه في هذا الكورس مباشرة.
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
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
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-50"
              >
                {createMutation.isPending ? 'جاري التسجيل والضم...' : 'تسجيل وضم الطالب'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
