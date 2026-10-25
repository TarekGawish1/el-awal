'use client';

import React from 'react';
import { Calendar, Clock, ChevronLeft, Eye, MessageCircle, Link as LinkIcon, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatWhatsAppNumber } from '@/lib/utils/formatters';
import { StudentListItem } from '../../types/students.types';
import {
  formatJoiningDate,
  formatJoiningTime,
  getJoiningRelativeTime,
  resolveJoiningMethod,
} from '../../utils/studentJoiningHelpers';

interface JoiningTimelineItemCardProps {
  student: StudentListItem;
  onSelectStudent: (studentId: string) => void;
}

export function JoiningTimelineItemCard({
  student,
  onSelectStudent,
}: JoiningTimelineItemCardProps) {
  const method = resolveJoiningMethod(student);
  const joinDate = formatJoiningDate(student.createdAt);
  const joinTime = formatJoiningTime(student.createdAt);
  const relativeTime = getJoiningRelativeTime(student.createdAt);
  const activeGroup = student.groupEnrollments?.[0]?.group?.name || 'غير محدد';
  const parentPhone = student.parentLinks?.[0]?.parent?.user?.phone;
  const directPhone = student.user.phone;

  return (
    <div className="relative pr-6 sm:pr-8">
      {/* Timeline Node Bullet */}
      <div
        className={`absolute -right-[9px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
          method.isGroupLink
            ? 'bg-emerald-500 ring-4 ring-emerald-100'
            : 'bg-primary-600 ring-4 ring-primary-100'
        }`}
      />

      {/* Card Container */}
      <div
        onClick={() => onSelectStudent(student.id)}
        className="group bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-primary-300 hover:shadow-md transition-all duration-150 cursor-pointer"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Student Identity & Details */}
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-base shrink-0 shadow-inner ${
                method.isGroupLink
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-primary-100 text-primary-800 border border-primary-200'
              }`}
            >
              {student.user.fullName.charAt(0)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-primary-600 transition-colors">
                  {student.user.fullName}
                </h3>

                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                  {student.studentCode}
                </span>

                {method.isGroupLink ? (
                  <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold py-0.5 px-2 flex items-center gap-1 shadow-2xs">
                    <LinkIcon className="w-3 h-3 text-emerald-600" />
                    <span>انضمام عبر رابط المجموعة</span>
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold py-0.5 px-2 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-slate-500" />
                    <span>{method.label}</span>
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="text-slate-400 font-medium">المجموعة:</span>
                  <strong className="text-slate-800 font-bold">{activeGroup}</strong>
                </span>

                {student.gradeLevel && (
                  <span className="text-slate-400">• {student.gradeLevel}</span>
                )}

                {directPhone && (
                  <span className="font-mono text-slate-600" dir="ltr">
                    📱 {directPhone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Exact Timestamp & Fast Action Buttons */}
          <div className="flex items-end sm:items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
            {/* Timestamp Block */}
            <div className="flex flex-col sm:items-end text-xs">
              <div className="inline-flex items-center gap-1.5 font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                <Calendar className="w-3.5 h-3.5 text-primary-600" />
                <span>{joinDate}</span>
                {joinTime && (
                  <>
                    <span className="text-slate-300">•</span>
                    <Clock className="w-3 h-3 text-primary-500" />
                    <span className="text-primary-700">{joinTime}</span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-medium mt-1">
                {relativeTime}
              </span>
            </div>

            {/* Fast Actions */}
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {(parentPhone || directPhone) && (
                <a
                  href={`https://wa.me/${formatWhatsAppNumber(parentPhone || directPhone || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors border border-emerald-200/60"
                  title="محادثة واتساب"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectStudent(student.id)}
                className="rounded-xl text-xs h-8 px-2.5 bg-slate-50 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 text-slate-700 border-slate-200"
              >
                <Eye className="w-3.5 h-3.5 ml-1 text-slate-500" />
                <span>التفاصيل</span>
                <ChevronLeft className="w-3 h-3 mr-0.5 text-slate-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
