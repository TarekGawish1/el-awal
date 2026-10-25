'use client';

import React from 'react';
import Link from 'next/link';
import { Users, ExternalLink, UserMinus, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatJoiningDateTime } from '../../utils/studentJoiningHelpers';

interface StudentGroupsSectionProps {
  enrollments: any[];
  studentGradeLevel?: string;
  onClose: () => void;
  onRemoveGroup: (group: { id: string; name: string }) => void;
}

export function StudentGroupsSection({
  enrollments,
  studentGradeLevel,
  onClose,
  onRemoveGroup,
}: StudentGroupsSectionProps) {
  const getEnrollmentStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success" className="text-[10px] py-0 px-2 h-5">نشط</Badge>;
      case 'PENDING':
        return <Badge variant="warning" className="text-[10px] py-0 px-2 h-5">حجز معلّق</Badge>;
      case 'TRANSFERRED':
        return <Badge variant="outline" className="text-[10px] py-0 px-2 h-5">منقول</Badge>;
      case 'DROPPED':
        return <Badge variant="error" className="text-[10px] py-0 px-2 h-5">منسحب</Badge>;
      default:
        return <Badge variant="success" className="text-[10px] py-0 px-2 h-5">نشط</Badge>;
    }
  };

  return (
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-indigo-600" />
        المجموعات المسجلة
      </h3>
      {enrollments.length === 0 ? (
        <div className="p-4 text-slate-500 text-sm bg-slate-50 rounded-2xl border border-slate-100">
          غير مسجل في مجموعات حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {enrollments.map((en: any, i: number) => {
            const groupId = en.group?.id || en.groupId;
            const groupName = en.group?.name || 'المجموعة الدراسية';
            const status = en.status || 'ACTIVE';

            return (
              <div
                key={groupId || i}
                className="flex flex-col justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <span className="font-bold text-slate-800 text-sm line-clamp-1" title={groupName}>
                      {groupName}
                    </span>
                    {getEnrollmentStatusBadge(status)}
                  </div>
                  <span className="text-xs text-slate-500 block mb-1">
                    {en.group?.gradeLevel || studentGradeLevel || '—'}
                  </span>
                  {en.enrolledAt && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
                      <Clock className="w-3 h-3 text-primary-500 shrink-0" />
                      <span>تاريخ الانضمام:</span>
                      <strong className="text-slate-700 font-medium">{formatJoiningDateTime(en.enrolledAt)}</strong>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  {groupId ? (
                    <Link
                      href={`/teacher/groups/${groupId}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 hover:underline font-medium"
                    >
                      <span>عرض المجموعة</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span />
                  )}

                  {groupId && (
                    <button
                      type="button"
                      onClick={() => onRemoveGroup({ id: groupId, name: groupName })}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="إزالة من المجموعة"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>إزالة</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
