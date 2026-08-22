'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, User, Users, GraduationCap, X, Check } from 'lucide-react';

export interface ExternalStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
  student?: {
    id?: string;
    fullName?: string;
    studentCode?: string;
    gradeLevel?: string;
  };
  studentGroup?: {
    id?: string;
    name?: string;
    gradeLevel?: string;
  };
  sessionGroup?: {
    id?: string;
    name?: string;
    gradeLevel?: string;
  };
}

export function ExternalStudentModal({
  isOpen,
  onClose,
  onConfirm,
  isPending = false,
  student,
  studentGroup,
  sessionGroup,
}: ExternalStudentModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="external-student-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="external-student-title" className="text-base font-black text-rose-950">
                طالب من خارج المجموعة
              </h3>
              <p className="text-xs text-rose-700 font-medium">تنبيه اختلاف المجموعة الدراسية</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-white/80 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs leading-relaxed text-amber-900">
            الطالب <strong className="font-black text-slate-900">{student?.fullName || 'الطالب'}</strong> مسجل في{' '}
            <strong className="font-bold text-amber-950">{studentGroup?.name || 'مجموعة أخرى'}</strong> وليس في هذه المجموعة (
            <strong className="font-bold text-slate-900">{sessionGroup?.name || 'المجموعة الحالية'}</strong>).
          </div>

          {/* Student & Group Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                اسم الطالب:
              </span>
              <span className="font-bold text-slate-900">{student?.fullName || 'غير محدد'}</span>
            </div>

            {student?.studentCode && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">كود الطالب:</span>
                <span className="font-mono font-bold text-slate-700">{student.studentCode}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                الصف الدراسي:
              </span>
              <span className="font-semibold text-slate-800">{student?.gradeLevel || 'غير محدد'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-500" />
                المجموعة الأصلية:
              </span>
              <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                {studentGroup?.name || 'غير مقيد بمجموعة'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                المجموعة الحالية:
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                {sessionGroup?.name || 'هذه الحصة'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            هل ترغب في توثيق حضور الطالب كحضور استثنائي (تعويض حصة / تبديل موعد)؟
          </p>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl text-xs font-bold"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
          >
            <Check className="w-4 h-4" />
            {isPending ? 'جاري التسجيل...' : 'تسجيل كحضور استثنائي / تعويض'}
          </Button>
        </div>
      </div>
    </div>
  );
}
