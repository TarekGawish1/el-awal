'use client';

import React from 'react';
import { Users, Clock, Eye, Search, GraduationCap, Globe } from 'lucide-react';

interface VisitorListHeaderProps {
  totalVisitors: number;
  totalDurationFormatted?: string;
  sortBy: 'recent' | 'visits';
  onSortByChange: (val: 'recent' | 'visits') => void;
  search: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onSearchClear: () => void;
  filterType: 'all' | 'students' | 'parents' | 'guests';
  onFilterChange: (newFilter: 'all' | 'students' | 'parents' | 'guests') => void;
  studentsCount: number;
  parentsCount: number;
  guestsCount: number;
}

export function VisitorListHeader({
  totalVisitors,
  totalDurationFormatted,
  sortBy,
  onSortByChange,
  search,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  filterType,
  onFilterChange,
  studentsCount,
  parentsCount,
  guestsCount,
}: VisitorListHeaderProps) {
  const formatNumber = (num: number = 0) => new Intl.NumberFormat('en-US').format(num);

  return (
    <>
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-neutral-900 leading-tight">
                سجل وهوية الزوار التفصيلي
              </h2>
              <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs font-black">
                {formatNumber(totalVisitors)} زائر فريد
              </span>
              {totalDurationFormatted && (
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full text-xs font-black flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>إجمالي وقت التواجد: {totalDurationFormatted}</span>
                </span>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            استعرض الزوار الذين دخلوا المنصة وفق الفلتر المحدد، مع عدد مرات الدخول وتفاصيل كل جلسة وزيارة
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <span className="text-xs text-neutral-400 font-bold hidden sm:inline">الترتيب:</span>
          <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200/60">
            <button
              type="button"
              onClick={() => onSortByChange('recent')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'recent'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-primary-600" />
              <span>الأحدث زيارة</span>
            </button>
            <button
              type="button"
              onClick={() => onSortByChange('visits')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'visits'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-primary-600" />
              <span>الأكثر دخولاً</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Search input */}
        <form onSubmit={onSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث باسم الطالب، الهاتف، الكود، أو المحافظة..."
            className="w-full pl-10 pr-9 py-2 bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white text-xs sm:text-sm text-neutral-800 rounded-xl border border-neutral-200 focus:border-primary-500 focus:outline-none transition-all"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {search && (
            <button
              type="button"
              onClick={onSearchClear}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              مسح
            </button>
          )}
        </form>

        {/* User type segmented toggle */}
        <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200/60 self-start sm:self-auto flex-wrap gap-1">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <span>الكل</span>
            {totalVisitors > 0 && (
              <span className="px-1.5 py-0.2 bg-neutral-200/70 text-neutral-700 text-[10px] font-mono rounded-md">
                {formatNumber(totalVisitors)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('students')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'students'
                ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-200'
                : 'text-neutral-500 hover:text-emerald-700'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>الطلاب</span>
            {studentsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-mono rounded-md font-black">
                {formatNumber(studentsCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('parents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'parents'
                ? 'bg-white text-purple-700 shadow-xs ring-1 ring-purple-200'
                : 'text-neutral-500 hover:text-purple-700'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>أولياء الأمور</span>
            {parentsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] font-mono rounded-md font-black">
                {formatNumber(parentsCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('guests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'guests'
                ? 'bg-white text-neutral-800 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-neutral-500" />
            <span>زوار غير مسجلين</span>
            {guestsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-neutral-200/70 text-neutral-700 text-[10px] font-mono rounded-md">
                {formatNumber(guestsCount)}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
