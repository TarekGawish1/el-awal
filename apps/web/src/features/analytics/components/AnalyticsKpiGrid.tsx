'use client';

import React from 'react';
import { Eye, Users, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

interface AnalyticsKpiGridProps {
  isLoading: boolean;
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    landingViews: number;
    systemViews: number;
    viewsPerVisitor: number;
    newVisitors?: number;
    returningVisitors?: number;
    totalDurationFormatted?: string;
    avgDurationPerVisitorFormatted?: string;
  };
  formatNumber: (num?: number) => string;
}

export function AnalyticsKpiGrid({ isLoading, summary, formatNumber }: AnalyticsKpiGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Card 1: Total Views */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs relative overflow-hidden group hover:border-primary-200 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-500 uppercase">الزيارات الإجمالية</span>
          <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl group-hover:scale-105 transition-transform">
            <Eye className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            {isLoading ? (
              <div className="h-8 w-24 bg-neutral-200 animate-pulse rounded-md" />
            ) : (
              formatNumber(summary.totalViews)
            )}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-neutral-500">
            <span>تتضمن:</span>
            <span className="font-bold text-primary-700">{formatNumber(summary.landingViews)}</span>
            <span>موقع</span>
            <span>·</span>
            <span className="font-bold text-emerald-700">{formatNumber(summary.systemViews)}</span>
            <span>نظام</span>
          </div>
        </div>
        <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-primary-500/5 to-transparent rounded-bl-full pointer-events-none" />
      </div>

      {/* Card 2: Unique Visitors */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-200 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-500 uppercase">الزوار الفريدين</span>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            {isLoading ? (
              <div className="h-8 w-20 bg-neutral-200 animate-pulse rounded-md" />
            ) : (
              formatNumber(summary.uniqueVisitors)
            )}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-neutral-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>معرّف آمن للخصوصية (SHA-256)</span>
          </div>
        </div>
        <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />
      </div>

      {/* Card 3: Views per Visitor */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs relative overflow-hidden group hover:border-purple-200 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-500 uppercase">متوسط الزيارات للزائر</span>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            {isLoading ? (
              <div className="h-8 w-16 bg-neutral-200 animate-pulse rounded-md" />
            ) : (
              summary.viewsPerVisitor
            )}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-neutral-500">
            <span>تفاعل الزائر مع صفحات الموقع</span>
          </div>
        </div>
        <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-bl-full pointer-events-none" />
      </div>

      {/* Card 4: New vs Returning Visitors */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs relative overflow-hidden group hover:border-rose-200 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-500 uppercase">زوار جدد / عائدون</span>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <div className="h-8 w-24 bg-neutral-200 animate-pulse rounded-md" />
          ) : summary.uniqueVisitors > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-emerald-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  جدد: {formatNumber(summary.newVisitors ?? 0)}
                </span>
                <span className="text-rose-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                  عائدون: {formatNumber(summary.returningVisitors ?? 0)}
                </span>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width:
                      summary.uniqueVisitors > 0
                        ? `${Math.round(((summary.newVisitors ?? 0) / summary.uniqueVisitors) * 100)}%`
                        : '0%',
                  }}
                  title="زوار جدد"
                />
                <div
                  className="h-full bg-rose-400 transition-all duration-500"
                  style={{
                    width:
                      summary.uniqueVisitors > 0
                        ? `${Math.round(((summary.returningVisitors ?? 0) / summary.uniqueVisitors) * 100)}%`
                        : '0%',
                  }}
                  title="عائدون"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">
                {summary.uniqueVisitors > 0
                  ? Math.round(((summary.returningVisitors ?? 0) / summary.uniqueVisitors) * 100)
                  : 0}
                % زاروا أكثر من مرة
              </p>
            </>
          ) : (
            <div className="text-xs text-neutral-400 mt-2">لا توجد بيانات كافية</div>
          )}
        </div>
        <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-bl-full pointer-events-none" />
      </div>

      {/* Card 5: Total Browsing Time */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs relative overflow-hidden group hover:border-amber-200 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-500 uppercase">إجمالي وقت التواجد</span>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            {isLoading ? (
              <div className="h-8 w-24 bg-neutral-200 animate-pulse rounded-md" />
            ) : (
              summary.totalDurationFormatted || '0 دقيقة'
            )}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-neutral-500">
            <span>متوسط للزائر:</span>
            <span className="font-bold text-amber-700">
              {summary.avgDurationPerVisitorFormatted || '0 دقيقة'}
            </span>
          </div>
        </div>
        <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />
      </div>
    </div>
  );
}
