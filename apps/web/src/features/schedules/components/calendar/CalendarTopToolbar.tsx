'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Check,
} from 'lucide-react';

export type CalendarViewMode = 'weekly' | 'monthly' | 'daily' | 'list';

interface CalendarTopToolbarProps {
  headerDateLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedGrades: string[];
  onToggleGrade: (grade: string) => void;
  onClearGrades: () => void;
  distinctGrades: string[];
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
}

export function CalendarTopToolbar({
  headerDateLabel,
  onPrev,
  onNext,
  onToday,
  searchQuery,
  onSearchChange,
  selectedGrades,
  onToggleGrade,
  onClearGrades,
  distinctGrades,
  viewMode,
  onViewModeChange,
}: CalendarTopToolbarProps) {
  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 relative z-20">
      {/* RIGHT SIDE: Current Date & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight truncate min-w-0 min-w-[140px]">
            {headerDateLabel}
          </h2>

          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-2xl border border-slate-100">
            {/* In RTL, Next is Left arrow, Prev is Right arrow */}
            <button
              onClick={onPrev}
              className="w-8 h-8 rounded-xl hover:bg-white hover:shadow-xs text-slate-600 flex items-center justify-center transition-all cursor-pointer"
              title="السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onToday}
              className="px-3 py-1 rounded-xl hover:bg-white hover:shadow-xs text-xs font-black text-slate-700 transition-all shrink-0 cursor-pointer"
            >
              اليوم
            </button>
            <button
              onClick={onNext}
              className="w-8 h-8 rounded-xl hover:bg-white hover:shadow-xs text-slate-600 flex items-center justify-center transition-all cursor-pointer"
              title="التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* LEFT SIDE: Search, Filters, View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في الحصص..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pr-9 pl-3 text-xs font-bold bg-slate-50 rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Filter Dropdown */}
          <div className="relative group/filter flex-1 sm:flex-none">
            <button
              className={`w-full sm:w-auto h-10 px-4 rounded-2xl border flex items-center justify-center gap-2 text-xs font-black transition-all ${
                selectedGrades.length > 0
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              الفلاتر
              {selectedGrades.length > 0 && (
                <span className="bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none">
                  {selectedGrades.length}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            <div className="absolute left-0 sm:right-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-xl border border-slate-100 p-4 opacity-0 invisible group-hover/filter:opacity-100 group-hover/filter:visible transition-all z-50 transform origin-top translate-y-2 group-hover/filter:translate-y-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-extrabold text-slate-800">تصفية الصفوف</h4>
                {selectedGrades.length > 0 && (
                  <button
                    onClick={onClearGrades}
                    className="text-[10px] text-rose-600 hover:underline font-bold bg-rose-50 px-2 py-1 rounded-md cursor-pointer"
                  >
                    مسح الفلاتر
                  </button>
                )}
              </div>

              {distinctGrades.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">لا توجد صفوف متاحة</p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {distinctGrades.map((grade) => {
                    const isChecked = selectedGrades.includes(grade);
                    return (
                      <button
                        key={grade}
                        onClick={() => onToggleGrade(grade)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-start cursor-pointer ${
                          isChecked
                            ? 'bg-primary-50 text-primary-700 border border-primary-100'
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span>{grade}</span>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="p-1 bg-slate-100 rounded-2xl flex items-center flex-1 sm:flex-none">
            <button
              onClick={() => onViewModeChange('daily')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-black transition-all text-center cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              يومي
            </button>
            <button
              onClick={() => onViewModeChange('weekly')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-black transition-all text-center cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              أسبوعي
            </button>
            <button
              onClick={() => onViewModeChange('monthly')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-black transition-all text-center cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              شهري
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
