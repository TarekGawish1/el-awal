'use client';

import React from 'react';
import { Clock, Calendar, Users, Link as LinkIcon, UserCheck, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  formatJoiningDateTime,
  getJoiningRelativeTime,
  resolveJoiningMethod,
} from '../../utils/studentJoiningHelpers';

interface StudentJoiningHistorySectionProps {
  student: {
    createdAt?: string | Date | null;
    createdByName?: string | null;
  };
  enrollments?: Array<{
    id?: string;
    status?: string;
    enrolledAt?: string | Date | null;
    group?: {
      name?: string;
    };
  }>;
}

export function StudentJoiningHistorySection({
  student,
  enrollments,
}: StudentJoiningHistorySectionProps) {
  const method = resolveJoiningMethod(student);
  const relativeTime = getJoiningRelativeTime(student.createdAt);
  const formattedDateTime = formatJoiningDateTime(student.createdAt);

  return (
    <section className="bg-gradient-to-br from-slate-50 to-slate-100/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>سجل وتاريخ الانضمام إلى المنصة</span>
        </h3>
        <span className="text-[11px] text-slate-500 font-medium">
          {relativeTime}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200/70">
        <div className="space-y-1">
          <span className="text-[11px] text-slate-400 block font-medium">تاريخ وساعة التسجيل:</span>
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs sm:text-sm">
            <Calendar className="w-4 h-4 text-primary-600 shrink-0" />
            <span>{formattedDateTime}</span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] text-slate-400 block font-medium">طريقة الانضمام ومصدر الحساب:</span>
          {method.isGroupLink ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
              <LinkIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>انضمام عبر رابط المجموعة ({method.groupName || 'المجموعة'})</span>
            </div>
          ) : method.type === 'DIRECT' ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs">
              <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>تسجيل مباشر عبر المنصة</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs">
              <UserCheck className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>{method.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Enrollment Timeline if any */}
      {enrollments && enrollments.length > 0 && (
        <div className="pt-2 border-t border-slate-200/60">
          <p className="text-[11px] font-bold text-slate-600 mb-2">تاريخ الانضمام للمجموعات الدراسية:</p>
          <div className="space-y-2">
            {enrollments.map((en, idx) => (
              <div
                key={en.id || idx}
                className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-bold text-slate-800">{en.group?.name || 'مجموعة دراسية'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-medium">
                    تاريخ الالتحاق: {formatJoiningDateTime(en.enrolledAt || student.createdAt)}
                  </span>
                  <Badge variant={en.status === 'ACTIVE' ? 'success' : 'outline'} className="text-[10px] py-0 px-1.5 h-4">
                    {en.status === 'ACTIVE' ? 'نشط' : en.status || 'نشط'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
