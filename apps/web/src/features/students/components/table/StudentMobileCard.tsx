'use client';

import React from 'react';
import { Eye, ChevronLeft, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { StudentListItem, AcademicStatus } from '../../types/students.types';
import { formatJoiningDateTime } from '../../utils/studentJoiningHelpers';
import { StudentJoiningBadge } from '../common/StudentJoiningBadge';

interface StudentMobileCardProps {
  student: StudentListItem;
  onSelectStudent: (studentId: string) => void;
  getStatusColor: (status: AcademicStatus | string) => any;
  getStatusText: (status: AcademicStatus | string) => string;
}

export function StudentMobileCard({
  student,
  onSelectStudent,
  getStatusColor,
  getStatusText,
}: StudentMobileCardProps) {
  const groupName = student.groupEnrollments?.[0]?.group?.name;
  const parentPhone = student.parentLinks?.[0]?.parent?.user?.phone;
  const joinDateTime = formatJoiningDateTime(student.createdAt);

  return (
    <div
      onClick={() => onSelectStudent(student.id)}
      className="group p-4 space-y-3 hover:bg-primary-50/30 transition-colors cursor-pointer active:scale-[0.99]"
      title="اضغط لعرض تفاصيل الطالب"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-primary-700 transition-colors truncate">
                {student.user.fullName}
              </h4>
              <Eye className="w-3.5 h-3.5 text-primary-500 shrink-0 opacity-75 group-hover:opacity-100" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                {student.studentCode}
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                {student.gradeLevel || '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge variant={getStatusColor(student.academicStatus)} className="text-[10px] font-bold">
            {getStatusText(student.academicStatus)}
          </Badge>
          <span className="text-[10px] text-primary-600 font-semibold inline-flex items-center gap-0.5">
            عرض التفاصيل
            <ChevronLeft className="w-3 h-3" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 group-hover:bg-white group-hover:border-primary-100 transition-colors">
        <div>
          <span className="text-slate-400 block text-[10px]">المجموعة:</span>
          {groupName ? (
            <span className="font-bold text-slate-700 truncate block">
              {groupName.split('(')[0].trim()}
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
              غير معين
            </span>
          )}
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">ولي الأمر:</span>
          <span className="font-mono text-slate-700 block text-[11px]" dir="ltr">
            {parentPhone || '—'}
          </span>
        </div>
      </div>

      {/* Joining Date & Method Row */}
      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-primary-500 shrink-0" />
          <span className="text-slate-400">انضم:</span>
          <strong className="text-slate-700 font-semibold">{joinDateTime}</strong>
        </span>
        <StudentJoiningBadge createdByName={student.createdByName} />
      </div>
    </div>
  );
}
