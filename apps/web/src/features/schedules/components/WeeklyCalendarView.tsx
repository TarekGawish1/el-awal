'use client';

import React, { useMemo } from 'react';
import { Clock, Users, FileText, Plus, AlertTriangle } from 'lucide-react';
import { LessonSessionItem } from '../types/schedules.types';
import {
  formatArabicTime12H,
  formatArabicTimeRange12H,
  formatArabicTimeRangeCompact,
  parseTimeToMinutes,
  toLocalDateStr,
  calculateOverlappingColumns,
  getGradeLevelTheme,
} from '../utils/time.utils';

interface WeeklyCalendarViewProps {
  currentDate: Date;
  sessions: LessonSessionItem[];
  onSelectSession: (session: LessonSessionItem) => void;
  onAddSessionForDate?: (dateStr: string, timeStr?: string) => void;
}

const START_HOUR = 6; // 06:00 AM
const END_HOUR = 24; // 11:00 PM (hour24: 23 is 11:00 PM)
const TOTAL_HOURS = END_HOUR - START_HOUR; // 18 hours
const HOUR_HEIGHT = 88; // pixels per hour

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => {
  const h24 = START_HOUR + i;
  const period = h24 >= 12 ? 'م' : 'ص';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const label = `${h12 < 10 ? '0' : ''}${h12}:00 ${period}`;
  const labelEn = `${h12 < 10 ? '0' : ''}${h12}:00 ${h24 >= 12 ? 'PM' : 'AM'}`;
  return { hour24: h24, label, labelEn };
});

export function WeeklyCalendarView({
  currentDate,
  sessions,
  onSelectSession,
  onAddSessionForDate,
}: WeeklyCalendarViewProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to earliest session of the week or daytime default
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        let earliestMinutes = 24 * 60;
        sessions.forEach((s) => {
          const m = parseTimeToMinutes(s.startTime);
          if (m !== null && m < earliestMinutes) earliestMinutes = m;
        });

        if (earliestMinutes < 24 * 60) {
          const startMinutes = START_HOUR * 60;
          const targetPx = ((earliestMinutes - startMinutes) / 60) * HOUR_HEIGHT;
          const scrollOffset = Math.max(0, targetPx - 60);
          scrollContainerRef.current.scrollTo({
            top: scrollOffset,
            behavior: 'smooth',
          });
        } else {
          const defaultPx = (12 - START_HOUR) * HOUR_HEIGHT;
          scrollContainerRef.current.scrollTo({
            top: Math.max(0, defaultPx),
            behavior: 'smooth',
          });
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [sessions, currentDate]);

  // Calculate 7 days for the current week starting Saturday
  const weekDays = useMemo(() => {
    const days: Array<{
      date: Date;
      dateStr: string;
      dayName: string;
      dayNumber: number;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const todayStr = toLocalDateStr(new Date());
    const selectedStr = toLocalDateStr(currentDate);

    // Find Saturday of the week
    const current = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dayOfWeek = current.getDay(); // 0 = Sun .. 6 = Sat
    // In Arabic week: Saturday is day 0
    const diffToSaturday = (dayOfWeek + 1) % 7;
    const saturday = new Date(current);
    saturday.setDate(current.getDate() - diffToSaturday);

    for (let i = 0; i < 7; i++) {
      const d = new Date(saturday);
      d.setDate(saturday.getDate() + i);
      const dateStr = toLocalDateStr(d);

      days.push({
        date: d,
        dateStr,
        dayName: d.toLocaleDateString('ar-EG', { weekday: 'long' }),
        dayNumber: d.getDate(),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
      });
    }

    return days;
  }, [currentDate]);

  // Group sessions by date string YYYY-MM-DD
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, LessonSessionItem[]>();
    sessions.forEach((s) => {
      const d = toLocalDateStr(s.sessionDate);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    });
    return map;
  }, [sessions]);

  const calculateSessionPosition = (session: LessonSessionItem) => {
    const startMin = parseTimeToMinutes(session.startTime) ?? 16 * 60; // default 4 PM
    let endMin = parseTimeToMinutes(session.endTime);

    if (!endMin || endMin <= startMin) {
      endMin = startMin + 90; // default 1.5 hours duration
    }

    const startHourFraction = Math.max(0, (startMin - START_HOUR * 60) / 60);
    const durationHours = Math.max(0.75, (endMin - startMin) / 60);

    const topPx = startHourFraction * HOUR_HEIGHT;
    const heightPx = Math.max(64, durationHours * HOUR_HEIGHT);

    return { topPx, heightPx };
  };

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, dateStr: string) => {
    if (!onAddSessionForDate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const clickedHour = Math.min(
      END_HOUR - 1,
      Math.max(START_HOUR, Math.floor(clickY / HOUR_HEIGHT) + START_HOUR),
    );
    const timePad = clickedHour < 10 ? `0${clickedHour}:00` : `${clickedHour}:00`;
    onAddSessionForDate(dateStr, timePad);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col min-w-0">
      {/* Top Days Header Row */}
      <div className="flex border-b border-slate-100 bg-slate-50/80 sticky top-0 z-20">
        {/* Time corner header */}
        <div className="w-16 sm:w-20 shrink-0 p-3 text-center border-l border-slate-100 flex flex-col items-center justify-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">الوقت</span>
          <span className="text-[9px] text-slate-400 font-medium">GMT+3</span>
        </div>

        {/* 7 Day Column Headers */}
        <div className="flex-1 grid grid-cols-7 divide-x divide-x-reverse divide-slate-100">
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={`p-3 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                day.isToday ? 'bg-sky-50/90 text-sky-900 border-b-2 border-sky-500' : 'hover:bg-slate-100/50'
              }`}
            >
              <span className="text-xs font-bold text-slate-500 truncate max-w-full">{day.dayName}</span>
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${
                  day.isToday
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : 'text-slate-800'
                }`}
              >
                {day.dayNumber}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Continuous Calendar Body */}
      <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-auto max-h-[720px]">
        <div className="flex min-w-[860px] relative">
          {/* Time Labels Column */}
          <div className="w-16 sm:w-20 shrink-0 border-l border-slate-100 bg-slate-50/30 select-none">
            {HOURS.map((hour) => (
              <div
                key={hour.hour24}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="border-b border-slate-100/80 px-1.5 py-2 text-center flex flex-col justify-start items-center"
              >
                <span className="text-[11px] font-bold text-slate-500">{hour.label}</span>
              </div>
            ))}
          </div>

          {/* 7 Days Columns with Continuous Absolute Session Spanning */}
          <div className="flex-1 grid grid-cols-7 divide-x divide-x-reverse divide-slate-100 relative">
            {/* Background Horizontal Hour Grid Lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col">
              {HOURS.map((hour) => (
                <div
                  key={hour.hour24}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="border-b border-slate-100/80 w-full"
                />
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day, dayIdx) => {
              const daySessions = sessionsByDate.get(day.dateStr) || [];
              const layoutMap = calculateOverlappingColumns(daySessions);

              const popupAlign =
                dayIdx <= 1 ? 'right-0' : dayIdx >= 5 ? 'left-0' : 'right-1/2 translate-x-1/2';

              return (
                <div
                  key={day.dateStr}
                  onClick={(e) => handleColumnClick(e, day.dateStr)}
                  style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
                  className={`relative transition-colors cursor-pointer group ${
                    day.isToday ? 'bg-sky-50/10' : 'hover:bg-slate-50/40'
                  }`}
                >
                  {/* Spanning Session Cards */}
                  {daySessions.map((session) => {
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

                    const layoutInfo = layoutMap.get(session.id) || {
                      colIndex: 0,
                      colCount: 1,
                      hasConflict: false,
                    };

                    const { topPx, heightPx } = calculateSessionPosition(session);
                    const colWidthPercent = 100 / layoutInfo.colCount;
                    const rightPercent = layoutInfo.colIndex * colWidthPercent;

                    return (
                      <div
                        key={session.id}
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
                                className="text-[7.5px] font-black bg-amber-500 text-slate-950 px-1 py-0.2 rounded-full shrink-0"
                                title="يوجد تعارض زمني مع حصة أخرى"
                              >
                                ⚠️
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
                            {session.group?.name &&
                              session.group?.gradeLevel &&
                              session.group.name !== session.group.gradeLevel && (
                                <span className="block text-[8px] opacity-85 mt-0.5 font-bold truncate">
                                  ({session.group.name})
                                </span>
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
                                <span className="text-[10px] font-extrabold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                                  ⚠️ الحصة ملغاة لهذا اليوم
                                </span>
                              ) : layoutInfo.hasConflict ? (
                                <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                                  ⚠️ تعارض زمني في الموعد
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-100">
                                  📖 تفاصيل الحصة المجدولة
                                </span>
                              )}
                              {session.group?.gradeLevel && (
                                <span className="text-[10px] font-bold text-slate-500">
                                  {session.group.gradeLevel}
                                </span>
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
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 pt-1 border-t border-slate-200/60">
                                <Users className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                                <span>المجموعة: {session.group.name}</span>
                              </div>
                            )}
                          </div>

                          {/* Footer: Attachments & Attendees */}
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100">
                              <FileText className="w-3.5 h-3.5" />
                              {session.educationalContents?.length ||
                                session._count?.educationalContents ||
                                0}{' '}
                              مرفقات
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
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

