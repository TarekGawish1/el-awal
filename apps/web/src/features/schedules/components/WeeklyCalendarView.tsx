'use client';

import { useMemo } from 'react';
import { Clock, Users, FileText, QrCode, Sparkles, CheckCircle2 } from 'lucide-react';
import { LessonSessionItem } from '../types/schedules.types';

interface WeeklyCalendarViewProps {
  currentDate: Date;
  sessions: LessonSessionItem[];
  onSelectSession: (session: LessonSessionItem) => void;
  onAddSessionForDate?: (dateStr: string, timeStr?: string) => void;
}

const HOURS = [
  { hour24: 8, label: '08:00 AM' },
  { hour24: 9, label: '09:00 AM' },
  { hour24: 10, label: '10:00 AM' },
  { hour24: 11, label: '11:00 AM' },
  { hour24: 12, label: '12:00 PM' },
  { hour24: 13, label: '01:00 PM' },
  { hour24: 14, label: '02:00 PM' },
  { hour24: 15, label: '03:00 PM' },
  { hour24: 16, label: '04:00 PM' },
  { hour24: 17, label: '05:00 PM' },
  { hour24: 18, label: '06:00 PM' },
  { hour24: 19, label: '07:00 PM' },
  { hour24: 20, label: '08:00 PM' },
  { hour24: 21, label: '09:00 PM' },
  { hour24: 22, label: '10:00 PM' },
];

const PASTEL_THEMES = [
  {
    bg: 'bg-purple-100/90 hover:bg-purple-200/90 text-purple-950 border-purple-200/90',
    badge: 'bg-purple-200/70 text-purple-900',
    iconColor: 'text-purple-700',
  },
  {
    bg: 'bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 border-amber-200/90',
    badge: 'bg-amber-200/70 text-amber-900',
    iconColor: 'text-amber-700',
  },
  {
    bg: 'bg-sky-100/90 hover:bg-sky-200/90 text-sky-950 border-sky-200/90',
    badge: 'bg-sky-200/70 text-sky-900',
    iconColor: 'text-sky-700',
  },
  {
    bg: 'bg-pink-100/90 hover:bg-pink-200/90 text-pink-950 border-pink-200/90',
    badge: 'bg-pink-200/70 text-pink-900',
    iconColor: 'text-pink-700',
  },
  {
    bg: 'bg-emerald-100/90 hover:bg-emerald-200/90 text-emerald-950 border-emerald-200/90',
    badge: 'bg-emerald-200/70 text-emerald-900',
    iconColor: 'text-emerald-700',
  },
  {
    bg: 'bg-indigo-100/90 hover:bg-indigo-200/90 text-indigo-950 border-indigo-200/90',
    badge: 'bg-indigo-200/70 text-indigo-900',
    iconColor: 'text-indigo-700',
  },
];

export function WeeklyCalendarView({
  currentDate,
  sessions,
  onSelectSession,
  onAddSessionForDate,
}: WeeklyCalendarViewProps) {
  // Calculate 7 days for the week containing currentDate (starting Saturday or Sunday)
  const weekDays = useMemo(() => {
    const days: Array<{
      date: Date;
      dateStr: string;
      dayName: string;
      dayNumber: number;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const selectedStr = currentDate.toISOString().split('T')[0];

    // Find Sunday of the current week (or Saturday)
    const current = new Date(currentDate);
    const dayOfWeek = current.getDay(); // 0 = Sun .. 6 = Sat
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

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

  // Group sessions by date and hour slot
  const sessionsByDateAndHour = useMemo(() => {
    const map = new Map<string, LessonSessionItem[]>();

    sessions.forEach((s) => {
      const dateStr = s.sessionDate.includes('T') ? s.sessionDate.split('T')[0] : s.sessionDate;
      let hourNum = 16; // default 4 PM
      if (s.startTime) {
        const [h] = s.startTime.split(':').map(Number);
        if (!isNaN(h)) hourNum = h;
      }

      const key = `${dateStr}_${hourNum}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });

    return map;
  }, [sessions]);

  const getSessionTheme = (index: number) => {
    return PASTEL_THEMES[index % PASTEL_THEMES.length];
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col min-w-0">
      {/* Top Days Header Row (Matching Photo Style) */}
      <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/70">
        {/* Timezone / Time axis corner */}
        <div className="p-4 text-center border-l border-slate-100 flex flex-col items-center justify-center">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">التوقيت</span>
          <span className="text-[10px] text-slate-400 font-medium">مصر (GMT+3)</span>
        </div>

        {/* 7 Days Headers */}
        {weekDays.map((day) => (
          <div
            key={day.dateStr}
            className={`p-3 text-center border-l border-slate-100 transition-all flex flex-col items-center justify-center gap-1 ${
              day.isToday
                ? 'bg-sky-50/90 text-sky-900 font-bold border-b-2 border-sky-500'
                : 'hover:bg-slate-100/60'
            }`}
          >
            <span className="text-xs font-bold text-slate-500">{day.dayName}</span>
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center text-base font-black transition-all ${
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

      {/* Main Hourly Grid */}
      <div className="overflow-x-auto overflow-y-auto max-h-[680px]">
        <div className="min-w-[800px]">
          {HOURS.map((hour) => (
            <div key={hour.hour24} className="grid grid-cols-8 border-b border-slate-100/90 min-h-[96px]">
              {/* Hour Label */}
              <div className="p-2 border-l border-slate-100/90 text-end pr-3 flex items-start justify-end">
                <span className="text-[11px] font-bold text-slate-400 tracking-tight pt-1">
                  {hour.label}
                </span>
              </div>

              {/* 7 Columns for the week */}
              {weekDays.map((day) => {
                const key = `${day.dateStr}_${hour.hour24}`;
                const cellSessions = sessionsByDateAndHour.get(key) || [];

                return (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      if (cellSessions.length === 0 && onAddSessionForDate) {
                        const timePad = hour.hour24 < 10 ? `0${hour.hour24}:00` : `${hour.hour24}:00`;
                        onAddSessionForDate(day.dateStr, timePad);
                      }
                    }}
                    className={`p-1.5 border-l border-slate-100/90 flex flex-col gap-1.5 relative transition-colors group ${
                      day.isToday ? 'bg-sky-50/20' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Render Session Cards */}
                    {cellSessions.map((session, sIdx) => {
                      const theme = getSessionTheme(sIdx);

                      return (
                        <div
                          key={session.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSession(session);
                          }}
                          className={`p-2.5 rounded-2xl border shadow-2xs transition-all cursor-pointer transform hover:-translate-y-0.5 hover:shadow-md ${theme.bg}`}
                        >
                          {/* Title */}
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <h4 className="text-xs font-black leading-snug line-clamp-2">
                              {session.topic || 'حصة بدون عنوان'}
                            </h4>
                          </div>

                          {/* Time & Group info */}
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold opacity-85 mb-1.5">
                            <Clock className={`w-3 h-3 ${theme.iconColor}`} />
                            <span>{session.startTime || `${hour.label}`}</span>
                          </div>

                          {/* Group Chip */}
                          {session.group && (
                            <div
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-lg inline-block truncate max-w-full mb-1.5 ${theme.badge}`}
                            >
                              {session.group.name} ({session.group.gradeLevel})
                            </div>
                          )}

                          {/* Counters: Attachments & Attendees */}
                          <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[10px] font-bold opacity-80">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {session.educationalContents?.length || session._count?.educationalContents || 0}
                            </span>

                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {session._count?.attendanceRecords || 0} حاضر
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
