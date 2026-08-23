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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900">تسجيل طالب جديد وضمّه للكورس</h2>
              <p className="text-xs text-slate-500 truncate max-w-xs">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {createdResult ? (
          <div className="p-6 space-y-4 text-right bg-white">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>تم تسجيل وتفعيل اشتراك الطالب بنجاح!</span>
              </div>
              <p className="text-xs text-slate-700">
                يمكن للطالب الآن تسجيل الدخول إلى المنصة ومشاهدة الكورس عبر البيانات التالية:
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 font-mono text-xs text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">اسم الطالب:</span>
                <span className="font-bold">{createdResult.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">كود الطالب:</span>
                <span className="font-bold text-primary-600">{createdResult.studentCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الهاتف (اسم المستخدم):</span>
                <span className="font-bold">{createdResult.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">كلمة المرور الافتراضية:</span>
                <span className="font-bold text-emerald-600">{createdResult.generatedPassword || createdResult.plainPassword || '123456'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                تم والعودة للكورس
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-right bg-white">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                اسم الطالب بالكامل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: يوسف أحمد عبد المنعم"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  رقم هاتف الطالب (واتساب) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm font-mono text-left"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  رقم هاتف ولي الأمر <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="011XXXXXXXX"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm font-mono text-left"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  تعيين لمجموعة حضورية (اختياري)
                </label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm cursor-pointer"
                >
                  <option value="">-- بدون مجموعة حضورية --</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.gradeLevel})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                {createMutation.isPending ? 'جاري التسجيل والاشتراك...' : 'تسجيل وضم الطالب'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
