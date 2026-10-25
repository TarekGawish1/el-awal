'use client';

import React from 'react';
import { Users, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { CourseEnrollmentStudent } from '../../types/courses.types';

interface EnrolledStudentsTableProps {
  isLoading: boolean;
  students: CourseEnrollmentStudent[];
  onRevoke: (student: { id: string; name: string }) => void;
}

export function EnrolledStudentsTable({
  isLoading,
  students,
  onRevoke,
}: EnrolledStudentsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-28 rounded-md hidden sm:block" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
        <Users className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">لا يوجد طلاب مسجلين في هذا الكورس حالياً</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          استخدم الخيارات بأعلى الشاشة لضم طلاب من المجموعات الدراسية أو مسح كود QR أو تسجيل حساب طالب جديد.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full text-right text-xs">
        <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold">
          <tr>
            <th className="py-3.5 px-4">اسم الطالب</th>
            <th className="py-3.5 px-4">كود الطالب</th>
            <th className="py-3.5 px-4">الصف والمرحلة</th>
            <th className="py-3.5 px-4">طريقة الاشتراك</th>
            <th className="py-3.5 px-4">نسبة الإنجاز</th>
            <th className="py-3.5 px-4">تاريخ الاشتراك</th>
            <th className="py-3.5 px-4 text-center">إجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800">
          {students.map((stu: CourseEnrollmentStudent) => (
            <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="py-3.5 px-4">
                <div>
                  <p className="font-bold text-slate-900">{stu.fullName}</p>
                  {stu.phone && <p className="text-[11px] text-slate-400 font-mono">{stu.phone}</p>}
                </div>
              </td>
              <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                {stu.studentCode || '—'}
              </td>
              <td className="py-3.5 px-4 text-slate-600">{stu.gradeLevel}</td>
              <td className="py-3.5 px-4">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-100">
                  {stu.accessType === 'MANUAL'
                    ? 'يدوي / مباشر'
                    : stu.accessType === 'QR_SCAN'
                    ? 'مسح كود QR'
                    : 'عبر المجموعة'}
                </span>
              </td>
              <td className="py-3.5 px-4">
                {stu.progressPercentage !== undefined ? (
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${stu.progressPercentage}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-slate-600">
                      {stu.progressPercentage}%
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 text-[11px]">لم يبدأ بعد</span>
                )}
              </td>
              <td className="py-3.5 px-4 text-slate-500">
                {new Date(stu.enrolledAt).toLocaleDateString('ar-EG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="py-3.5 px-4 text-center">
                <button
                  type="button"
                  onClick={() => onRevoke({ id: stu.studentId, name: stu.fullName })}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="إلغاء الاشتراك"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
