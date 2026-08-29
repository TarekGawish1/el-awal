'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  Check,
  ChevronDown,
  X,
  MapPin,
  Clock,
  Sparkles,
  BookOpen,
  History,
} from 'lucide-react';

export interface SessionItem {
  id: string;
  groupId: string;
  topic?: string | null;
  sessionDate?: string | Date;
  startTime?: string | null;
  endTime?: string | null;
  dayOfWeek?: number;
  group?: {
    id?: string;
    name?: string;
    gradeLevel?: string;
    schedules?: Array<{ location?: string }>;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

interface SearchableSessionComboboxProps {
  label: string;
  countLabel?: string;
  sessions: SessionItem[];
  selectedSessionId: string;
  onSelectSession: (sessionId: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  isTodayPicker?: boolean;
  groupMap?: Map<string, any>;
  className?: string;
}

function formatTime12h(time24?: string | null) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  if (isNaN(h)) return time24;
  const ampm = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getFormattedDate(dateValue?: string | Date) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ar-EG', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });
}

export function SearchableSessionCombobox({
  label,
  countLabel,
  sessions = [],
  selectedSessionId,
  onSelectSession,
  placeholder = '-- اختر الحصة --',
  isLoading = false,
  isTodayPicker = false,
  groupMap,
  className = '',
}: SearchableSessionComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Lookup the currently selected session object
  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find(
      (s) => String(s.id).toLowerCase() === String(selectedSessionId).toLowerCase()
    ) || null;
  }, [sessions, selectedSessionId]);

  // Filter sessions by search query across group name, date, topic, location
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();

    return sessions.filter((s) => {
      const g = groupMap?.get(s.groupId) || s.group;
      const groupName = (g?.name || '').toLowerCase();
      const grade = (g?.gradeLevel || '').toLowerCase();
      const topic = (s.topic || '').toLowerCase();
      const location = (g?.schedules?.[0]?.location || '').toLowerCase();
      const dateStr = getFormattedDate(s.sessionDate).toLowerCase();
      const rawDateStr = s.sessionDate ? String(s.sessionDate).toLowerCase() : '';
      const timeStr = formatTime12h(s.startTime).toLowerCase();

      return (
        groupName.includes(q) ||
        grade.includes(q) ||
        topic.includes(q) ||
        location.includes(q) ||
        dateStr.includes(q) ||
        rawDateStr.includes(q) ||
        timeStr.includes(q)
      );
    });
  }, [sessions, searchQuery, groupMap]);

  // Group items into Today, Upcoming, and Past if it's the term-wide picker
  const categorizedSessions = useMemo(() => {
    if (isTodayPicker) {
      return [{ category: '', icon: null, items: filteredSessions }];
    }

    const todayItems: SessionItem[] = [];
    const upcomingItems: SessionItem[] = [];
    const pastItems: SessionItem[] = [];

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowMidnight = todayMidnight + 24 * 60 * 60 * 1000;

    filteredSessions.forEach((s) => {
      if (!s.sessionDate) {
        upcomingItems.push(s);
        return;
      }
      const sTime = new Date(s.sessionDate).getTime();
      if (isNaN(sTime)) {
        upcomingItems.push(s);
      } else if (sTime >= todayMidnight && sTime < tomorrowMidnight) {
        todayItems.push(s);
      } else if (sTime >= tomorrowMidnight) {
        upcomingItems.push(s);
      } else {
        pastItems.push(s);
      }
    });

    const groupsList: Array<{ category: string; icon: React.ReactNode | null; items: SessionItem[] }> = [];

    if (todayItems.length > 0) {
      groupsList.push({
        category: 'حصص اليوم',
        icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" />,
        items: todayItems,
      });
    }

    if (upcomingItems.length > 0) {
      groupsList.push({
        category: 'الحصص القادمة',
        icon: <Calendar className="w-3.5 h-3.5 text-blue-600" />,
        items: upcomingItems,
      });
    }

    if (pastItems.length > 0) {
      groupsList.push({
        category: 'الحصص السابقة',
        icon: <History className="w-3.5 h-3.5 text-slate-500" />,
        items: pastItems,
      });
    }

    return groupsList;
  }, [filteredSessions, isTodayPicker]);

  const handleSelect = (id: string) => {
    onSelectSession(id);
    setIsOpen(false);
  };

  // Render item content helper
  const renderItemContent = (s: SessionItem) => {
    const g = groupMap?.get(s.groupId) || s.group;
    const groupName = g?.name || 'مجموعة دراسية';
    const formattedTime = formatTime12h(s.startTime);
    const dateLabel = getFormattedDate(s.sessionDate);
    const location = g?.schedules?.[0]?.location;
    const isSelected = String(s.id).toLowerCase() === String(selectedSessionId).toLowerCase();

    return (
      <button
        key={s.id}
        type="button"
        onClick={() => handleSelect(s.id)}
        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition-all cursor-pointer select-none text-xs ${
          isSelected
            ? isTodayPicker
              ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
              : 'bg-primary-50 text-primary-900 font-bold border border-primary-200'
            : 'hover:bg-slate-50 text-slate-700'
        }`}
      >
        <div className="flex flex-col gap-0.5 truncate text-right flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {!isTodayPicker && dateLabel && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                📅 {dateLabel}
              </span>
            )}
            <span className="font-bold truncate text-slate-900">{groupName}</span>
            {formattedTime && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100/80 text-slate-600 text-[10px]">
                <Clock className="w-2.5 h-2.5" />
                {formattedTime}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate mt-0.5">
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                {location}
              </span>
            )}
            {s.topic && <span className="truncate text-slate-600">📖 {s.topic}</span>}
          </div>
        </div>

        {isSelected && (
          <Check
            className={`w-4 h-4 shrink-0 mr-2 ${
              isTodayPicker ? 'text-emerald-600' : 'text-primary-600'
            }`}
          />
        )}
      </button>
    );
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Label and Header Info */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-bold text-neutral-700 flex items-center gap-1.5">
          {isTodayPicker ? (
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <Calendar className="w-4 h-4 text-emerald-600" />
              {label}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-primary-700 font-bold">
              <BookOpen className="w-4 h-4 text-primary-600" />
              {label}
            </span>
          )}
        </label>
        {countLabel && (
          <span className="text-slate-400 font-medium text-[11px]">{countLabel}</span>
        )}
      </div>

      {/* Main Trigger Button */}
      {isLoading ? (
        <div className="animate-pulse h-11 bg-slate-100 rounded-xl w-full"></div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full min-h-[44px] flex items-center justify-between gap-2 px-3.5 py-2 text-sm rounded-xl border transition-all cursor-pointer select-none text-right shadow-2xs ${
            isTodayPicker
              ? 'border-emerald-200 bg-emerald-50/25 hover:bg-emerald-50/50 hover:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20'
              : 'border-primary-200 bg-primary-50/20 hover:bg-primary-50/40 hover:border-primary-300 focus:ring-2 focus:ring-primary-500/20'
          } ${isOpen ? 'ring-2 ring-primary-500/20 border-primary-500' : ''}`}
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2 truncate text-right flex-1">
            {selectedSession ? (
              <div className="flex items-center gap-2 truncate">
                {!isTodayPicker && selectedSession.sessionDate && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 text-xs font-bold shrink-0">
                    {getFormattedDate(selectedSession.sessionDate)}
                  </span>
                )}
                <span className="font-bold text-slate-900 truncate">
                  {(groupMap?.get(selectedSession.groupId) || selectedSession.group)?.name ||
                    'مجموعة دراسية'}
                </span>
                {selectedSession.startTime && (
                  <span className="text-xs text-slate-600 shrink-0 font-medium">
                    ({formatTime12h(selectedSession.startTime)})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-500 font-medium text-xs sm:text-sm truncate">
                {placeholder} ({sessions.length} حصة)
              </span>
            )}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>
      )}

      {/* Downward Popover Container */}
      {isOpen && (
        <div
          className="absolute top-full mt-1.5 right-0 left-0 z-50 w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{ maxHeight: '320px' }}
        >
          {/* Embedded Sticky Search Bar */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالمجموعة، اليوم، التاريخ (مثال: 29-08)، المكان..."
                className="w-full h-9 pr-9 pl-8 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-right text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List of Sessions */}
          <div className="p-1.5 overflow-y-auto max-h-60 space-y-2 divide-y divide-slate-100/60">
            {filteredSessions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                <Search className="w-5 h-5 text-slate-300" />
                <span>لا توجد حصص مطابقة للبحث أو الفلاتر المحددة</span>
              </div>
            ) : isTodayPicker ? (
              <div className="space-y-1">
                {filteredSessions.slice(0, 100).map((s) => renderItemContent(s))}
              </div>
            ) : (
              categorizedSessions.map((grp, idx) => (
                <div key={idx} className={idx > 0 ? 'pt-2' : ''}>
                  {grp.category && (
                    <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider select-none">
                      {grp.icon}
                      <span>
                        {grp.category} ({grp.items.length})
                      </span>
                    </div>
                  )}
                  <div className="space-y-1 mt-1">
                    {grp.items.slice(0, 60).map((s) => renderItemContent(s))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
