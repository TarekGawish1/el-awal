'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LessonSessionItem } from '../types/schedules.types';

interface MiniCalendarProps {
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  sessions: LessonSessionItem[];
}

const ARABIC_WEEKDAYS_SHORT = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']; // Sun..Sat

export function MiniCalendar({ currentDate, onSelectDate, sessions }: MiniCalendarProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = useMemo(() => {
    return currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Set of dates that have sessions for dot indicators
  const sessionDatesSet = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      const d = s.sessionDate.includes('T') ? s.sessionDate.split('T')[0] : s.sessionDate;
      set.add(d);
    });
    return set;
  }, [sessions]);

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun .. 6 = Sat
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasSession: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const selectedStr = currentDate.toISOString().split('T')[0];

    // Previous month padding days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({
        date: prevDate,
        dateStr,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
        hasSession: sessionDatesSet.has(dateStr),
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const thisDate = new Date(year, month, day);
      const dateStr = thisDate.toISOString().split('T')[0];
      days.push({
        date: thisDate,
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
        hasSession: sessionDatesSet.has(dateStr),
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({
        date: nextDate,
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedStr,
        hasSession: sessionDatesSet.has(dateStr),
      });
    }

    return days;
  }, [year, month, currentDate, sessionDatesSet]);

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    onSelectDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    onSelectDate(next);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
      {/* Header Month / Year */}
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{monthName}</h3>
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center hover:text-slate-700 transition-colors cursor-pointer"
            title="الشهر السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center hover:text-slate-700 transition-colors cursor-pointer"
            title="الشهر القادم"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 text-center">
        {ARABIC_WEEKDAYS_SHORT.map((wd, i) => (
          <span key={i} className="text-[11px] font-bold text-slate-400 py-1">
            {wd}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {calendarDays.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center">
            <button
              onClick={() => onSelectDate(item.date)}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                item.isSelected
                  ? 'bg-primary-600 text-white shadow-md shadow-primary/30 scale-105'
                  : item.isToday
                  ? 'bg-primary-50 text-primary-700 font-black border border-primary-200'
                  : item.isCurrentMonth
                  ? 'text-slate-700 hover:bg-slate-100'
                  : 'text-slate-300 hover:text-slate-500'
              }`}
            >
              <span>{item.dayNumber}</span>
              {item.hasSession && !item.isSelected && (
                <span className="w-1 h-1 rounded-full bg-primary-500 absolute bottom-1"></span>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
