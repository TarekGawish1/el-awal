'use client';

import { useMemo } from 'react';
import { Clock, Users, FileText, QrCode, Sparkles, BookOpen, UploadCloud } from 'lucide-react';
import { LessonSessionItem } from '../types/schedules.types';
import { formatArabicTime12H, formatArabicTimeRange12H } from '../utils/time.utils';
import { Button } from '@/components/ui/Button';

interface DailyCalendarViewProps {
  currentDate: Date;
  sessions: LessonSessionItem[];
  onSelectSession: (session: LessonSessionItem) => void;
  onAddSessionForDate?: (dateStr: string, timeStr?: string) => void;
}

const HOURS = [
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
];

export function DailyCalendarView({
  currentDate,
  sessions,
  onSelectSession,
  onAddSessionForDate,
}: DailyCalendarViewProps) {
  const dateStr = currentDate.toISOString().split('T')[0];

  const daySessions = useMemo(() => {
    return sessions.filter((s) => {
      const d = s.sessionDate.includes('T') ? s.sessionDate.split('T')[0] : s.sessionDate;
      return d === dateStr;
    });
  }, [sessions, dateStr]);

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
      <div className="overflow-y-auto max-h-[640px] divide-y divide-slate-100">
        {HOURS.map((hour) => {
          const hourSessions = sessionsByHour.get(hour.hour24) || [];

          return (
            <div
              key={hour.hour24}
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
              <div className="flex-1 space-y-3">
                {hourSessions.length > 0 ? (
                  hourSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSession(session);
                      }}
                      className="p-4 bg-gradient-to-r from-sky-50/80 to-indigo-50/50 rounded-2xl border border-sky-100 shadow-2xs hover:shadow-md hover:border-sky-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-sm">{session.topic || 'حصة بدون عنوان'}</h4>
                          {session.group && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-white text-primary-700 rounded-md border border-primary-100 shadow-2xs">
                              {session.group.name} ({session.group.gradeLevel})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary-600" />
                            <span>
                              {formatArabicTimeRange12H(session.startTime, session.endTime) || hour.label}
                            </span>
                          </span>

                          <span className="flex items-center gap-1 text-amber-700">
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            {session.educationalContents?.length || session._count?.educationalContents || 0} مرفقات
                          </span>

                          <span className="flex items-center gap-1 text-emerald-700">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            {session._count?.attendanceRecords || 0} حاضرين
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-primary-600 font-bold hover:underline">
                          عرض التفاصيل والمرفقات ←
                        </span>
                      </div>
                    </div>
                  ))
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
