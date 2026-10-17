'use client';

import React from 'react';
import { Clock, Users, FileText, AlertTriangle } from 'lucide-react';
import { LessonSessionItem } from '../../types/schedules.types';
import {
  formatArabicTime12H,
  formatArabicTimeRangeCompact,
  getGradeLevelTheme,
  OverlappingLayoutInfo,
} from '../../utils/time.utils';

export interface WeeklySessionCardProps {
  session: LessonSessionItem;
  layoutInfo: OverlappingLayoutInfo;
  topPx: number;
  heightPx: number;
  popupAlign: string;
  onSelectSession: (session: LessonSessionItem) => void;
}

export function WeeklySessionCard({
  session,
  layoutInfo,
  topPx,
  heightPx,
  popupAlign,
  onSelectSession,
}: WeeklySessionCardProps) {
  const isCancelled = !!session.isCancelled;
  const gradeTheme = getGradeLevelTheme(session.group?.gradeLevel, session.group?.name);
  const theme = isCancelled
    ? {
        bg: 'bg-rose-50/90 hover:bg-rose-100/90 text-rose-950 border-rose-300 border-dashed shadow-rose-950/5 opacity-85',
        badge: 'bg-rose-200/90 text-rose-900',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-300',
      }
    : gradeTheme;

  const colWidthPercent = 100 / layoutInfo.colCount;
  const rightPercent = layoutInfo.colIndex * colWidthPercent;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectSession(session);
      }}
      style={{
        top: `${topPx + 2}px`,
        height: `${heightPx - 4}px`,
        width: layoutInfo.colCount > 1 ? `calc(${colWidthPercent}% - 3px)` : 'calc(100% - 4px)',
        right: layoutInfo.colCount > 1 ? `calc(${rightPercent}% + 1.5px)` : '2px',
      }}
      className={`group/session absolute rounded-2xl border shadow-xs transition-all cursor-pointer hover:z-50 p-1.5 flex flex-col justify-center overflow-visible z-10 ${
        theme.bg
      } ${layoutInfo.hasConflict ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
    >
      {/* DEFAULT MINIMAL VIEW: Centered Time & Grade Level Only */}
      <div className="flex flex-col items-center justify-center gap-1 w-full text-center group-hover/session:hidden transition-all my-auto min-w-0">
        {/* Centered 12h Arabic Time - Contained inside white oval shape */}
        <div className="w-full max-w-full bg-white/95 backdrop-blur-xs rounded-full border border-black/10 shadow-2xs py-1 px-1 flex items-center justify-center gap-1 text-center overflow-hidden">
          <Clock className={`w-3 h-3 ${theme.iconColor} shrink-0`} />
          <span
            className={`text-[8.5px] sm:text-[9.5px] font-black tracking-tight whitespace-nowrap leading-none truncate max-w-full ${
              isCancelled ? 'text-rose-900 line-through' : 'text-slate-800'
            }`}
            dir="rtl"
          >
            {formatArabicTimeRangeCompact(session.startTime || '16:00', session.endTime)}
          </span>
          {isCancelled && (
            <span className="text-[7.5px] font-black bg-rose-600 text-white px-1 py-0.2 rounded-full shrink-0">
              ملغاة
            </span>
          )}
          {layoutInfo.hasConflict && (
            <span
              className="bg-amber-500 text-slate-950 p-0.5 rounded-md shrink-0 flex items-center justify-center"
              title="يوجد تعارض زمني مع حصة أخرى"
            >
              <AlertTriangle className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        {/* Grade Level / Group Name */}
        <div
          className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-1 rounded-xl text-center break-words max-w-full leading-snug w-full shadow-2xs ${theme.badge} ${
            isCancelled ? 'line-through decoration-rose-500' : ''
          }`}
        >
          {session.group?.gradeLevel || session.group?.name || 'حصة دراسية'}
          {session.group?.name && session.group?.gradeLevel && session.group.name !== session.group.gradeLevel && (
            <span className="block text-[8px] opacity-85 mt-0.5 font-bold truncate">({session.group.name})</span>
          )}
        </div>
      </div>

      {/* EXPANDED HOVER VIEW: Wide floating card with generous breathing room */}
      <div
        className={`hidden group-hover/session:flex flex-col gap-3 w-72 sm:w-80 p-4 bg-white rounded-3xl shadow-2xl border border-slate-200/90 text-start animate-in fade-in zoom-in-95 duration-150 absolute top-0 ${popupAlign} z-50 pointer-events-auto`}
      >
        {/* Header Badge & Topic Title */}
        <div className="border-b border-slate-100 pb-2">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            {isCancelled ? (
              <span className="text-[10px] font-extrabold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                الحصة ملغاة لهذا اليوم
              </span>
            ) : layoutInfo.hasConflict ? (
              <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                تعارض زمني في الموعد
              </span>
            ) : (
              <span className="text-[10px] font-extrabold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-md border border-primary-100">
                تفاصيل الحصة المجدولة
              </span>
            )}
            {session.group?.gradeLevel && (
              <span className="text-[10px] font-bold text-slate-500">{session.group.gradeLevel}</span>
            )}
          </div>
          <h4
            className={`text-sm font-black leading-snug break-words ${
              isCancelled ? 'text-rose-900 line-through decoration-rose-400' : 'text-slate-900'
            }`}
          >
            {session.topic || 'حصة بدون عنوان'}
          </h4>
          {isCancelled && session.cancellationReason && (
            <p className="text-xs text-rose-700 font-semibold mt-1">
              سبب الإلغاء: {session.cancellationReason}
            </p>
          )}
          {layoutInfo.hasConflict && (
            <p className="text-[11px] text-amber-800 font-bold mt-1 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
              تنبيه: تتداخل هذه الحصة في نفس التوقيت مع حصة أخرى اليوم.
            </p>
          )}
        </div>

        {/* Time & Group Box */}
        <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
            <Clock className={`w-4 h-4 ${theme.iconColor} shrink-0`} />
            <span dir="rtl">
              من {formatArabicTime12H(session.startTime || '16:00')}{' '}
              {session.endTime ? `إلى ${formatArabicTime12H(session.endTime)}` : ''}
            </span>
          </div>

          {session.group && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 pt-1 border-t border-slate-200/60 min-w-0 overflow-hidden">
              <Users className="w-3.5 h-3.5 text-primary-600 shrink-0" />
              <span className="truncate min-w-0" title={session.group.name}>
                المجموعة: {session.group.name}
              </span>
            </div>
          )}
        </div>

        {/* Footer: Attachments & Attendees */}
        <div className="flex items-center justify-between text-xs font-black">
          <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100">
            <FileText className="w-3.5 h-3.5" />
            {session.educationalContents?.length || session._count?.educationalContents || 0} مرفقات
          </span>

          <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
            <Users className="w-3.5 h-3.5" />
            {session._count?.attendanceRecords || 0} حاضرين
          </span>
        </div>

        {/* Action button hint */}
        <div className="pt-1">
          <div className="w-full py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 font-extrabold text-xs rounded-xl text-center transition-colors flex items-center justify-center gap-1.5 shadow-2xs">
            <span>فتح تفاصيل الحصة والمرفقات</span>
            <span>←</span>
          </div>
        </div>
      </div>
    </div>
  );
}
