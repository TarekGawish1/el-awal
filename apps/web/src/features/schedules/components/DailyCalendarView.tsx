'use client';

import { useMemo, useRef, useEffect } from 'react';
import { Clock, Users, FileText, QrCode, Sparkles, BookOpen, UploadCloud, AlertTriangle } from 'lucide-react';
import { LessonSessionItem } from '../types/schedules.types';
import {
  formatArabicTime12H,
  formatArabicTimeRange12H,
  toLocalDateStr,
  getGradeLevelTheme,
  calculateOverlappingColumns,
} from '../utils/time.utils';
import { Button } from '@/components/ui/Button';

interface DailyCalendarViewProps {
  currentDate: Date;
  sessions: LessonSessionItem[];
  onSelectSession: (session: LessonSessionItem) => void;
  onAddSessionForDate?: (dateStr: string, timeStr?: string) => void;
}

const HOURS = [
  { hour24: 6, label: '06:00 ص' },
  { hour24: 7, label: '07:00 ص' },
  { hour24: 8, label: '08:00 ص' },
  { hour24: 9, label: '09:00 ص' },
  { hour24: 10, label: '10:00 ص' },
  { hour24: 11, label: '11:00 ص' },
  { hour24: 12, label: '12:00 م' },
  { hour24: 13, label: '01:00 م' },
  { hour24: 14, label: '02:00 م' },
  { hour24: 15, label: '03:00 م' },
  { hour24: 16, label: '04:00 م' },
  { hour24: 17, label: '05:00 م' },
  { hour24: 18, label: '06:00 م' },
  { hour24: 19, label: '07:00 م' },
  { hour24: 20, label: '08:00 م' },
  { hour24: 21, label: '09:00 م' },
  { hour24: 22, label: '10:00 م' },
  { hour24: 23, label: '11:00 م' },
];

export function DailyCalendarView({
  currentDate,
  sessions,
  onSelectSession,
  onAddSessionForDate,
}: DailyCalendarViewProps) {
  const dateStr = toLocalDateStr(currentDate);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const firstSessionRef = useRef<HTMLDivElement>(null);

  const daySessions = useMemo(() => {
    return sessions.filter((s) => {
      const d = toLocalDateStr(s.sessionDate);
      return d === dateStr;
    });
  }, [sessions, dateStr]);

  const layoutMap = useMemo(() => {
    return calculateOverlappingColumns(daySessions);
  }, [daySessions]);

  // Find the earliest hour of scheduled sessions today
  const earliestHour = useMemo(() => {
    if (daySessions.length === 0) return null;
    let minH = 24;
    daySessions.forEach((s) => {
      if (s.startTime) {
        const [parsed] = s.startTime.split(':').map(Number);
        if (!isNaN(parsed) && parsed < minH) minH = parsed;
      }
    });
    return minH < 24 ? minH : null;
  }, [daySessions]);

  // Auto-scroll to the first lesson of the day on mount/date change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (firstSessionRef.current) {
        firstSessionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } else if (scrollContainerRef.current) {
        // If no sessions, scroll smoothly to current daytime hour or 12:00 PM
        const nowH = new Date().getHours();
        const targetH = Math.max(6, Math.min(23, nowH >= 6 && nowH <= 23 ? nowH : 12));
        const targetEl = document.getElementById(`daily-hour-${targetH}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [daySessions, dateStr]);

  const sessionsByHour = useMemo(() => {
    const map = new Map<number, LessonSessionItem[]>();
    daySessions.forEach((s) => {
      let h = 16;
      if (s.startTime) {
        const [parsed] = s.startTime.split(':').map(Number);
        if (!isNaN(parsed)) h = parsed;
      }
      if (!map.has(h)) map.set(h, []);
      map.get(h)!.push(s);
    });
    return map;
  }, [daySessions]);

  const fullDateFormatted = useMemo(() => {
    return currentDate.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [currentDate]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col">
      {/* Day Banner */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center font-black text-lg border border-primary-100">
            {currentDate.getDate()}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">{fullDateFormatted}</h3>
            <p className="text-xs text-slate-500 font-medium">
              {daySessions.length > 0 ? `${daySessions.length} حصص مجدولة لهذا اليوم` : 'لا توجد حصص مجدولة'}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => onAddSessionForDate?.(dateStr, '16:00')}
          className="shadow-xs text-xs"
        >
          + إضافة حصة لهذا اليوم
        </Button>
      </div>

      {/* Hourly Timeline */}
      <div ref={scrollContainerRef} className="overflow-y-auto max-h-[640px] divide-y divide-slate-100">
        {HOURS.map((hour) => {
          const hourSessions = sessionsByHour.get(hour.hour24) || [];
          const isEarliestHour = hour.hour24 === earliestHour;

          return (
            <div
              key={hour.hour24}
              id={`daily-hour-${hour.hour24}`}
              ref={isEarliestHour ? firstSessionRef : undefined}
              onClick={() => {
                if (hourSessions.length === 0 && onAddSessionForDate) {
                  const timePad = hour.hour24 < 10 ? `0${hour.hour24}:00` : `${hour.hour24}:00`;
                  onAddSessionForDate(dateStr, timePad);
                }
              }}
              className="flex items-start p-4 hover:bg-slate-50/50 transition-colors group cursor-pointer"
            >
              {/* Hour Column */}
              <div className="w-24 shrink-0 text-start pr-2">
                <span className="text-xs font-bold text-slate-400">{hour.label}</span>
              </div>

              {/* Session Cards Column */}
              <div className={`flex-1 ${hourSessions.length > 1 ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3'}`}>
                {hourSessions.length > 0 ? (
                  hourSessions.map((session) => {
                    const isCancelled = !!session.isCancelled;
                    const gradeTheme = getGradeLevelTheme(session.group?.gradeLevel, session.group?.name);
                    const layoutInfo = layoutMap.get(session.id);

                    return (
                      <div
                        key={session.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSession(session);
                        }}
                        className={`py-2.5 px-3.5 rounded-xl border shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                          isCancelled
                            ? 'bg-rose-50/80 border-rose-200 border-dashed hover:border-rose-300'
                            : `${gradeTheme.bg} ${layoutInfo?.hasConflict ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`
                        }`}
                      >
                        {/* Top Row: Title + Status + Group Badge */}
                        <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <h4
                              className={`font-black text-xs sm:text-sm truncate max-w-[200px] ${
                                isCancelled ? 'text-rose-900 line-through decoration-rose-400' : 'text-slate-900'
                              }`}
                              title={session.topic || 'حصة بدون عنوان'}
                            >
                              {session.topic || 'حصة بدون عنوان'}
                            </h4>
                            {isCancelled && (
                              <span className="text-[9.5px] font-black px-2 py-0.5 bg-rose-600 text-white rounded-md shadow-2xs shrink-0 whitespace-nowrap">
                                ملغاة لهذا اليوم
                              </span>
                            )}
                            {layoutInfo?.hasConflict && !isCancelled && (
                              <span className="text-[9.5px] font-black px-2 py-0.5 bg-amber-500 text-slate-950 rounded-md shadow-2xs flex items-center gap-1 shrink-0 whitespace-nowrap">
                                <AlertTriangle className="w-3 h-3" />
                                تعارض
                              </span>
                            )}
                          </div>

                          {session.group && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-white/95 text-primary-800 rounded-md border border-primary-100 shadow-2xs shrink-0 whitespace-nowrap">
                              {session.group.name} {session.group.gradeLevel ? `(${session.group.gradeLevel})` : ''}
                            </span>
                          )}
                        </div>

                        {/* Cancellation reason if applicable */}
                        {isCancelled && session.cancellationReason && (
                          <p className="text-[10.5px] text-rose-700 font-semibold truncate leading-tight">
                            سبب الإلغاء: {session.cancellationReason}
                          </p>
                        )}

                        {/* Bottom Row: Time, stats, and details link */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/5 text-[10.5px] text-slate-600 font-medium flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1 font-bold text-slate-700 whitespace-nowrap">
                              <Clock className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                              <span>
                                {formatArabicTimeRange12H(session.startTime, session.endTime) || hour.label}
                              </span>
                            </span>

                            <span className="flex items-center gap-1 text-emerald-700 font-semibold whitespace-nowrap">
                              <Users className="w-3 h-3 text-emerald-600 shrink-0" />
                              {session._count?.attendanceRecords || 0} حاضرين
                            </span>

                            <span className="flex items-center gap-1 text-amber-700 font-semibold whitespace-nowrap">
                              <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                              {session.educationalContents?.length || session._count?.educationalContents || 0} مرفقات
                            </span>
                          </div>

                          <span className="text-[10.5px] text-primary-600 font-extrabold hover:underline whitespace-nowrap mr-auto">
                            عرض التفاصيل ←
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-6 border-b border-dashed border-slate-100 group-hover:border-slate-300 flex items-center">
                    <span className="text-[10px] text-slate-300 group-hover:text-primary-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      + اضغط لإضافة حصة في هذا الموعد
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
