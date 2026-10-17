'use client';

import React, { useMemo } from 'react';
import { LessonSessionItem } from '../types/schedules.types';
import {
  parseTimeToMinutes,
  toLocalDateStr,
  calculateOverlappingColumns,
} from '../utils/time.utils';
import { WeeklySessionCard } from './calendar/WeeklySessionCard';

interface WeeklyCalendarViewProps {
  currentDate: Date;
  sessions: LessonSessionItem[];
  onSelectSession: (session: LessonSessionItem) => void;
  onAddSessionForDate?: (dateStr: string, timeStr?: string) => void;
}

export function WeeklyCalendarView({
  currentDate,
  sessions,
  onSelectSession,
  onAddSessionForDate,
}: WeeklyCalendarViewProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const HOUR_HEIGHT = 88; // pixels per hour

  const { minHour, maxHour } = React.useMemo(() => {
    let minM = 24 * 60;
    let maxM = 0;
    sessions.forEach(s => {
      const start = parseTimeToMinutes(s.startTime);
      if (start !== null) minM = Math.min(minM, start);
      let end = parseTimeToMinutes(s.endTime);
      if (!end || end <= (start || 0)) end = (start || 16 * 60) + 90;
      if (end !== null) maxM = Math.max(maxM, end);
    });
    
    if (minM === 24 * 60) return { minHour: 8, maxHour: 18 }; // default working hours
    
    let minH = Math.floor(minM / 60);
    let maxH = Math.ceil(maxM / 60);
    
    // Add 1 hour padding
    minH = Math.max(6, minH - 1);
    maxH = Math.min(24, maxH + 1);
    return { minHour: minH, maxHour: maxH };
  }, [sessions]);

  const TOTAL_HOURS = maxHour - minHour;
  
  const HOURS = React.useMemo(() => {
    return Array.from({ length: TOTAL_HOURS }, (_, i) => {
      const h24 = minHour + i;
      const period = h24 >= 12 ? 'م' : 'ص';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      const label = `${h12 < 10 ? '0' : ''}${h12}:00 ${period}`;
      const labelEn = `${h12 < 10 ? '0' : ''}${h12}:00 ${h24 >= 12 ? 'PM' : 'AM'}`;
      return { hour24: h24, label, labelEn };
    });
  }, [minHour, TOTAL_HOURS]);

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
          const startMinutes = minHour * 60;
          const targetPx = ((earliestMinutes - startMinutes) / 60) * HOUR_HEIGHT;
          const scrollOffset = Math.max(0, targetPx - 60);
          scrollContainerRef.current.scrollTo({
            top: scrollOffset,
            behavior: 'smooth',
          });
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [sessions, currentDate, minHour]);

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

    const startHourFraction = Math.max(0, (startMin - minHour * 60) / 60);
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
      maxHour - 1,
      Math.max(minHour, Math.floor(clickY / HOUR_HEIGHT) + minHour),
    );
    const timePad = clickedHour < 10 ? `0${clickedHour}:00` : `${clickedHour}:00`;
    onAddSessionForDate(dateStr, timePad);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col min-w-0">
      {/* Scrollable Container covering Header and Continuous Calendar Body */}
      <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '400px' }}>
        <div className="min-w-[760px] sm:min-w-[860px] flex flex-col">
          {/* Top Days Header Row */}
          <div className="flex border-b border-slate-100 bg-slate-50/90 sticky top-0 z-20 backdrop-blur-sm">
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
          <div className="flex relative">
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
                    const layoutInfo = layoutMap.get(session.id) || {
                      colIndex: 0,
                      colCount: 1,
                      hasConflict: false,
                    };
                    const { topPx, heightPx } = calculateSessionPosition(session);

                    return (
                      <WeeklySessionCard
                        key={session.id}
                        session={session}
                        layoutInfo={layoutInfo}
                        topPx={topPx}
                        heightPx={heightPx}
                        popupAlign={popupAlign}
                        onSelectSession={onSelectSession}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

