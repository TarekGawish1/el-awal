'use client';

import React from 'react';
import { Layers, Globe, Sparkles, LayoutDashboard, Calendar, Filter } from 'lucide-react';
import { AnalyticsScope, AnalyticsRange } from '../types/analytics.types';

interface AnalyticsFilterBarProps {
  scope: AnalyticsScope;
  setScope: (scope: AnalyticsScope) => void;
  range: AnalyticsRange;
  onRangeChange: (range: AnalyticsRange) => void;
  isCustomOpen: boolean;
  customFrom: string;
  setCustomFrom: (date: string) => void;
  customTo: string;
  setCustomTo: (date: string) => void;
  todayStr: string;
  onApplyCustomRange: (e: React.FormEvent) => void;
}

export function AnalyticsFilterBar({
  scope,
  setScope,
  range,
  onRangeChange,
  isCustomOpen,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  todayStr,
  onApplyCustomRange,
}: AnalyticsFilterBarProps) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-200/80 shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Scope Segmented Control */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <span>نطاق التحليل:</span>
          </label>
          <div className="inline-flex p-1 bg-neutral-100/90 rounded-xl border border-neutral-200/60 max-w-full overflow-x-auto">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                scope === 'all'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>الكل (الموقع والنظام)</span>
            </button>

            <button
              type="button"
              onClick={() => setScope('landing')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                scope === 'landing'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>الموقع التعريفي فقط</span>
            </button>

            <button
              type="button"
              onClick={() => setScope('system')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                scope === 'system'
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-primary-600" />
              <span>النظام الداخلي</span>
            </button>
          </div>
        </div>

        {/* Quick Date Range Buttons */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span>الفترة الزمنية:</span>
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'هذا الأسبوع' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'year', label: 'هذه السنة' },
              { id: 'all', label: 'جميع الأوقات' },
              { id: 'custom', label: 'مخصص (تاريخ محدد)' },
            ].map((item) => {
              const isActive = range === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onRangeChange(item.id as AnalyticsRange)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker Accordion */}
      {isCustomOpen && (
        <form
          onSubmit={onApplyCustomRange}
          className="pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-600">
            <Filter className="w-3.5 h-3.5 text-primary-600" />
            <span>من:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              max={todayStr}
              required
              className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-neutral-600">
            <span>إلى:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              max={todayStr}
              required
              className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            تطبيق التصفية
          </button>
        </form>
      )}
    </div>
  );
}
