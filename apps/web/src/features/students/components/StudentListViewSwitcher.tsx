'use client';

import React from 'react';
import { Users, Clock, Sparkles } from 'lucide-react';

export type StudentListTab = 'LIST' | 'HISTORY';

interface StudentListViewSwitcherProps {
  activeTab: StudentListTab;
  onTabChange: (tab: StudentListTab) => void;
  totalStudents?: number;
}

export function StudentListViewSwitcher({
  activeTab,
  onTabChange,
  totalStudents,
}: StudentListViewSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-2xs">
      <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => onTabChange('LIST')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'LIST'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-primary-600" />
          <span>جدول وسجل الطلاب</span>
          {totalStudents !== undefined && (
            <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded">
              {totalStudents}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('HISTORY')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>سجل وتاريخ الانضمام</span>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-200/60 hidden sm:inline-flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5" />
            تتبع فوري
          </span>
        </button>
      </div>

      <div className="text-[11px] text-slate-400 font-medium px-2">
        {activeTab === 'LIST' ? 'عرض جدولي تفصيلي مع الفلاتر' : 'تتبع زمني دقيق لتاريخ ووقت انضمام الطلاب'}
      </div>
    </div>
  );
}
