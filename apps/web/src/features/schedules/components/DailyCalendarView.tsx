'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { Clock, Users, FileText, QrCode, Sparkles, BookOpen, AlertTriangle, CalendarDays, Plus, ChevronDown } from 'lucide-react';
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
  const [showAllHours, setShowAllHours] = useState(false);

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

  const renderedHours = useMemo(() => {
    if (showAllHours || daySessions.length === 0) return HOURS;
    
    let minH = 24;
    let maxH = 0;
    
    daySessions.forEach(s => {
      let h = 16;
      if (s.startTime) h = parseInt(s.startTime.split(':')[0], 10);
      if (!isNaN(h)) {
        minH = Math.min(minH, h);
        maxH = Math.max(maxH, h);
      }
      if (s.endTime) {
        let endH = parseInt(s.endTime.split(':')[0], 10);
        if (!isNaN(endH)) maxH = Math.max(maxH, endH);
      }
    });
    
    // Fallback if parsing fails
    if (minH === 24) return HOURS;
    
    // Add 1 hour padding
    minH = Math.max(6, minH - 1);
    maxH = Math.min(23, maxH + 1);
    
    return HOURS.filter(h => h.hour24 >= minH && h.hour24 <= maxH);
  }, [daySessions, showAllHours]);

  // Auto-scroll to the first lesson of the day on mount/date change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (firstSessionRef.current) {
        firstSessionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } else if (scrollContainerRef.current) {
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
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center font-black text-lg border border-primary-100 shrink-0">
            {currentDate.getDate()}
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base truncate">{fullDateFormatted}</h3>
            <p className="text-xs text-slate-500 font-medium truncate">
              {daySessions.length > 0 ? `${daySessions.length} حصص مجدولة لهذا اليوم` : 'لا توجد حصص مجدولة'}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => onAddSessionForDate?.(dateStr, '16:00')}
          className="shadow-xs text-xs font-bold rounded-xl shrink-0"
        >
          <Plus className="w-3.5 h-3.5 ml-1.5" />
          إضافة حصة
        </Button>
      </div>

      {daySessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">لا توجد حصص مجدولة لهذا اليوم</h3>
          <p className="text-sm text-slate-500 mb-6">يمكنك إضافة حصة جديدة أو الانتقال ليوم آخر.</p>
          <Button onClick={() => onAddSessionForDate?.(dateStr, '16:00')} className="rounded-xl shadow-sm">
            <Plus className="w-4 h-4 ml-2" />
            إضافة حصة جديدة
          </Button>
        </div>
      ) : (
        <div ref={scrollContainerRef} className="overflow-y-auto max-h-[640px] divide-y divide-slate-100">
          {/* Top padding / expand toggle */}
          {!showAllHours && renderedHours[0]?.hour24 > 6 && (
            <div className="py-2 flex justify-center bg-slate-50/50">
              <button onClick={() => setShowAllHours(true)} className="text-[10px] font-bold text-slate-400 hover:text-primary-600 flex items-center gap-1">
                <ChevronDown className="w-3 h-3 rotate-180" />
                إظهار الساعات السابقة
              </button>
            </div>
          )}

          {renderedHours.map((hour) => {
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
              className="flex items-start p-3 sm:p-4 hover:bg-slate-50/50 transition-colors group cursor-pointer overflow-hidden"
            >
              {/* Hour Column */}
              <div className="w-16 sm:w-24 shrink-0 text-start pr-1 sm:pr-2">
                <span className="text-xs font-bold text-slate-400">{hour.label}</span>
              </div>

              {/* Session Cards Column */}
              <div className={`flex-1 min-w-0 ${hourSessions.length > 1 ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3'}`}>
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
                        className={`py-2 px-3 rounded-xl border shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-1.5 cursor-pointer overflow-hidden max-w-full ${
                          isCancelled
                            ? 'bg-rose-50/80 border-rose-200 border-dashed hover:border-rose-300'
                            : `${gradeTheme.bg} ${layoutInfo?.hasConflict ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`
                        }`}
                      >
                        {/* Top Row: Title + Status + Group Badge (Fitted to card without overflow) */}
                        <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden flex-1">
                            <h4
                              className={`font-black text-xs sm:text-sm truncate min-w-0 ${
                                isCancelled ? 'text-rose-900 line-through decoration-rose-400' : 'text-slate-900'
                              }`}
                              title={session.topic || 'حصة بدون عنوان'}
                            >
                              {session.topic || 'حصة بدون عنوان'}
                            </h4>
                            {isCancelled && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-600 text-white rounded shadow-2xs shrink-0 whitespace-nowrap">
                                ملغاة
                              </span>
                            )}
                            {layoutInfo?.hasConflict && !isCancelled && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded shadow-2xs flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                تعارض
                              </span>
                            )}
                          </div>

                          {session.group && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 bg-white/95 text-primary-800 rounded-md border border-primary-100 shadow-2xs shrink-0 truncate max-w-[120px] sm:max-w-[180px]"
                              title={session.group.name}
                            >
                              {session.group.name}
                            </span>
                          )}
                        </div>

                        {/* Cancellation reason if applicable */}
                        {isCancelled && session.cancellationReason && (
                          <p className="text-[10px] text-rose-700 font-semibold truncate leading-tight overflow-hidden">
                            سبب الإلغاء: {session.cancellationReason}
                          </p>
                        )}

                        {/* Bottom Row: Time, stats, and details link (strictly truncated/fitted) */}
                        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-black/5 text-[10px] sm:text-[10.5px] text-slate-600 font-medium overflow-hidden min-w-0">
                          <div className="flex items-center gap-2 min-w-0 overflow-hidden flex-1">
                            <span className="flex items-center gap-1 font-bold text-slate-700 shrink-0">
                              <Clock className="w-3 h-3 text-primary-600 shrink-0" />
                              <span className="truncate">
                                {formatArabicTimeRange12H(session.startTime, session.endTime) || hour.label}
                              </span>
                            </span>

                            <span className="flex items-center gap-0.5 text-emerald-700 font-semibold shrink-0">
                              <Users className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{session._count?.attendanceRecords || 0}</span>
                            </span>

                            <span className="flex items-center gap-0.5 text-amber-700 font-semibold shrink-0">
                              <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{session.educationalContents?.length || session._count?.educationalContents || 0}</span>
                            </span>
                          </div>

                          <span className="text-[10px] text-primary-600 font-extrabold hover:underline shrink-0 whitespace-nowrap">
                            عرض التفاصيل ←
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-6 border-b border-dashed border-slate-100 group-hover:border-slate-300 flex items-center">
                    <span className="text-[10px] text-slate-300 group-hover:text-primary-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity truncate">
                      + اضغط لإضافة حصة في هذا الموعد
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
          })}
          
          {/* Bottom padding / expand toggle */}
          {!showAllHours && renderedHours[renderedHours.length - 1]?.hour24 < 23 && (
            <div className="py-2 flex justify-center bg-slate-50/50">
              <button onClick={() => setShowAllHours(true)} className="text-[10px] font-bold text-slate-400 hover:text-primary-600 flex items-center gap-1">
                <ChevronDown className="w-3 h-3" />
                إظهار الساعات اللاحقة
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
