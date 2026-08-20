'use client';

import { useMemo } from 'react';
import { Clock, FileText, Users, Plus } from 'lucide-react';
import { LessonSessionItem } from '../types/schedules.types';
import {
  formatArabicTime12H,
  toLocalDateStr,
  getGradeLevelTheme,
  calculateOverlappingColumns,
} from '../utils/time.utils';

interface MonthlyCalendarViewProps {
  currentDate: Date;
  sessions: LessonSessionItem[];
  onSelectSession: (session: LessonSessionItem) => void;
  onAddSessionForDate?: (dateStr: string) => void;
}

const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const PASTEL_THEMES = [
  'bg-purple-100 text-purple-900 border-purple-200 hover:bg-purple-200',
  'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200',
  'bg-sky-100 text-sky-900 border-sky-200 hover:bg-sky-200',
  'bg-pink-100 text-pink-900 border-pink-200 hover:bg-pink-200',
  'bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-200',
];

export function MonthlyCalendarView({
  currentDate,
  sessions,
  onSelectSession,
  onAddSessionForDate,
}: MonthlyCalendarViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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

  // Generate 35 or 42 grid cells
  const monthGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDaysInMonth = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = toLocalDateStr(new Date());

    // Prev month padding
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = toLocalDateStr(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = toLocalDateStr(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = toLocalDateStr(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [year, month]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col">
      {/* Weekday Columns Header */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center">
        {ARABIC_WEEKDAYS.map((wd) => (
          <div key={wd} className="p-3 text-xs font-black text-slate-600 border-l border-slate-100 last:border-l-0">
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {monthGridDays.map((item) => {
          const daySessions = sessionsByDate.get(item.dateStr) || [];

          return (
            <div
              key={item.dateStr}
              onClick={() => onAddSessionForDate?.(item.dateStr)}
              className={`min-h-[120px] p-2 border-b border-l border-slate-100/90 flex flex-col justify-between transition-colors group cursor-pointer ${
                item.isToday
                  ? 'bg-sky-50/30'
                  : item.isCurrentMonth
                  ? 'bg-white hover:bg-slate-50/70'
                  : 'bg-slate-50/40 text-slate-300'
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center transition-all ${
                    item.isToday
                      ? 'bg-sky-500 text-white shadow-sm'
                      : item.isCurrentMonth
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {item.dayNumber}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddSessionForDate?.(item.dateStr);
                  }}
                  className="w-5 h-5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="إضافة حصة لهذا اليوم"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Day Sessions Pills */}
              <div className="space-y-1 overflow-y-auto overflow-x-hidden no-scrollbar max-h-[85px] w-full">
                {daySessions.map((session) => {
                  const isCancelled = !!session.isCancelled;
                  const gradeTheme = getGradeLevelTheme(session.group?.gradeLevel, session.group?.name);
                  const layoutMap = calculateOverlappingColumns(daySessions);
                  const layoutInfo = layoutMap.get(session.id);

                  const theme = isCancelled
                    ? 'bg-rose-100/90 text-rose-900 border-rose-300 border-dashed line-through decoration-rose-400 opacity-80'
                    : gradeTheme.bg;

                  return (
                    <div
                      key={session.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSession(session);
                      }}
                      className={`w-full max-w-full px-2 py-1 rounded-lg border text-[10px] font-extrabold truncate cursor-pointer transition-all hover:scale-[1.02] shadow-2xs overflow-hidden ${theme} ${
                        layoutInfo?.hasConflict ? 'ring-1 ring-amber-400' : ''
                      }`}
                      title={`${session.topic} (${session.startTime || ''})${
                        isCancelled ? ' - ملغاة' : layoutInfo?.hasConflict ? ' - تعارض في الموعد' : ''
                      }`}
                    >
                      <span className="opacity-75 mr-1 font-semibold whitespace-nowrap">
                        {formatArabicTime12H(session.startTime)}
                      </span>
                      <span className="truncate">{session.topic || 'حصة'}</span>
                      {isCancelled ? (
                        <span className="mr-1 text-[9px] text-rose-700 font-black no-underline whitespace-nowrap">
                          (ملغاة)
                        </span>
                      ) : layoutInfo?.hasConflict ? (
                        <span className="mr-1 text-[9px] text-amber-800 font-black whitespace-nowrap">
                          ⚠️
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
