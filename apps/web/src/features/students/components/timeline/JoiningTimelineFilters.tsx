'use client';

import React from 'react';
import { Search, Link as LinkIcon, UserCheck } from 'lucide-react';

export type TimelineMethodFilter = 'ALL' | 'GROUP_LINK' | 'MANUAL';

interface JoiningTimelineFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  methodFilter: TimelineMethodFilter;
  onMethodFilterChange: (filter: TimelineMethodFilter) => void;
  totalCount: number;
  groupLinkCount: number;
  manualCount: number;
}

export function JoiningTimelineFilters({
  search,
  onSearchChange,
  methodFilter,
  onMethodFilterChange,
  totalCount,
  groupLinkCount,
  manualCount,
}: JoiningTimelineFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="بحث في سجل الانضمام بالاسم أو الهاتف أو الكود أو المجموعة..."
          className="w-full h-10 pr-10 pl-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-primary-500 transition-colors"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onMethodFilterChange('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            methodFilter === 'ALL'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          الكل ({totalCount})
        </button>

        <button
          type="button"
          onClick={() => onMethodFilterChange('GROUP_LINK')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            methodFilter === 'GROUP_LINK'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          رابط المجموعة ({groupLinkCount})
        </button>

        <button
          type="button"
          onClick={() => onMethodFilterChange('MANUAL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            methodFilter === 'MANUAL'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          تسجيل يدوي ({manualCount})
        </button>
      </div>
    </div>
  );
}
