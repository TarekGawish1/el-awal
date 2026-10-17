'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { AnalyticsRange } from '../types/analytics.types';

interface AnalyticsTimeSeriesChartProps {
  timeSeries: Array<{
    date: string;
    label: string;
    totalViews: number;
    landingViews: number;
    systemViews: number;
    uniqueVisitors: number;
  }>;
  totalViews: number;
  range: AnalyticsRange;
  formatNumber: (num?: number) => string;
}

export function AnalyticsTimeSeriesChart({
  timeSeries,
  totalViews,
  range,
  formatNumber,
}: AnalyticsTimeSeriesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxViews = Math.max(...timeSeries.map((t) => t.totalViews), 1);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-neutral-900">
            حركة الزيارات على مدار الفترة
          </h2>
          <p className="text-xs text-neutral-500">
            توزيع عدد المشاهدات والزوار الفريدين على مدار الوقت
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-bold text-neutral-600">
          <span className="text-[11px] text-neutral-400 sm:hidden">اسحب أفقياً للتنقل ⟵</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-primary-600" />
              <span>الموقع التعريفي</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500" />
              <span>النظام الداخلي</span>
            </div>
          </div>
        </div>
      </div>

      {/* Time-Series Chart Container */}
      {timeSeries.length === 0 || totalViews === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
          <Info className="w-8 h-8 text-neutral-400 mb-2" />
          <p className="text-sm font-bold text-neutral-700">لا توجد بيانات مسجلة في هذه الفترة</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            يتم تسجيل الزيارات تلقائياً بمجرد تصفح الطلاب أو الزوار لصفحات الموقع أو المنصة.
          </p>
        </div>
      ) : (
        <div className="relative pt-3 pb-2 overflow-x-auto scrollbar-thin">
          <div
            className={`flex items-end gap-1.5 sm:gap-2 px-2 ${
              timeSeries.length > 12
                ? `min-w-[${Math.max(680, timeSeries.length * 54)}px]`
                : timeSeries.length > 7
                ? 'min-w-[640px]'
                : 'min-w-[420px] sm:min-w-0'
            } w-full`}
            style={{ height: '260px' }}
          >
            {timeSeries.map((point, index) => {
              const totalHeightPct = Math.max(4, (point.totalViews / maxViews) * 100);
              const landingHeightPct = point.totalViews > 0 ? (point.landingViews / point.totalViews) * 100 : 0;
              const systemHeightPct = point.totalViews > 0 ? (point.systemViews / point.totalViews) * 100 : 0;
              const isHovered = hoveredIndex === index;

              const displayLabel =
                range === 'year' ? point.label.replace(/\s*\d{4}$/, '').trim() : point.label;

              return (
                <div
                  key={point.date}
                  className={`flex-1 flex flex-col items-center justify-end group relative cursor-pointer min-w-[38px] rounded-xl transition-all duration-150 ${
                    isHovered
                      ? 'bg-neutral-100/80 ring-1 ring-neutral-300/80 z-30'
                      : 'hover:bg-neutral-50/60'
                  }`}
                  style={{ height: '240px' }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setHoveredIndex(hoveredIndex === index ? null : index)}
                >
                  {isHovered && (
                    <div
                      className={`absolute top-2 z-50 p-3 bg-neutral-900/95 text-white rounded-xl shadow-2xl border border-neutral-700 text-xs whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xs min-w-[175px] ${
                        index < 3
                          ? 'right-0'
                          : index >= timeSeries.length - 3
                          ? 'left-0'
                          : 'left-1/2 -translate-x-1/2'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-neutral-700/80 pb-1.5 mb-2">
                        <span className="font-black text-white text-xs">{point.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary-500/30 text-primary-300 rounded-md font-black">
                          {formatNumber(point.totalViews)} زيارة
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-neutral-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            الزوار الفريدين:
                          </span>
                          <span className="font-black text-emerald-400 font-mono">
                            {formatNumber(point.uniqueVisitors)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-neutral-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                            الموقع التعريفي:
                          </span>
                          <span className="font-bold text-primary-300 font-mono">
                            {formatNumber(point.landingViews)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-neutral-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            لوحة النظام:
                          </span>
                          <span className="font-bold text-emerald-300 font-mono">
                            {formatNumber(point.systemViews)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="w-full flex flex-col justify-end px-1" style={{ height: '172px' }}>
                    {point.totalViews === 0 ? (
                      <div
                        className="w-full bg-neutral-200/60 hover:bg-neutral-300 rounded-t-xs h-1.5 transition-colors"
                        title={`${point.label}: 0 زيارة`}
                      />
                    ) : (
                      <div
                        className={`w-full rounded-t-lg overflow-hidden flex flex-col-reverse shadow-xs transition-all duration-200 ${
                          isHovered
                            ? 'ring-2 ring-primary-500/70 brightness-110'
                            : 'opacity-95 hover:opacity-100'
                        }`}
                        style={{ height: `${totalHeightPct}%` }}
                      >
                        <div
                          className="bg-primary-600 transition-all"
                          style={{ height: `${landingHeightPct}%` }}
                        />
                        <div
                          className="bg-emerald-500 transition-all"
                          style={{ height: `${systemHeightPct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <span
                    className="text-[10px] font-bold text-neutral-500 mt-1.5 truncate max-w-full text-center whitespace-nowrap leading-tight"
                    style={{ height: '24px' }}
                  >
                    {displayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
