'use client';

import React, { useState } from 'react';
import {
  Eye,
  Users,
  TrendingUp,
  Globe,
  LayoutDashboard,
  Calendar,
  RefreshCw,
  Laptop,
  Smartphone,
  Tablet,
  ArrowUpRight,
  Sparkles,
  Layers,
  Filter,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useAnalyticsStats } from '../hooks/useAnalytics';
import { AnalyticsScope, AnalyticsRange } from '../types/analytics.types';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { GeoRankingCard } from './GeoRankingCard';
import { StudentLeaderboardCard } from './StudentLeaderboardCard';

export function AnalyticsDashboard() {
  const isOnline = useOnlineStatus();

  // Filter states
  const [scope, setScope] = useState<AnalyticsScope>('all');
  const [range, setRange] = useState<AnalyticsRange>('week');
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Default custom range: last 7 days
  const todayStr = new Date().toISOString().split('T')[0];
  const lastWeekStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [customFrom, setCustomFrom] = useState(lastWeekStr);
  const [customTo, setCustomTo] = useState(todayStr);
  const [appliedCustomFrom, setAppliedCustomFrom] = useState<string | undefined>(undefined);
  const [appliedCustomTo, setAppliedCustomTo] = useState<string | undefined>(undefined);

  // Hovered time series bar tooltip
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fetch aggregated stats
  const { data, isLoading, isFetching, refetch, error } = useAnalyticsStats({
    scope,
    range,
    from: range === 'custom' ? appliedCustomFrom : undefined,
    to: range === 'custom' ? appliedCustomTo : undefined,
  });

  const handleRangeChange = (newRange: AnalyticsRange) => {
    setRange(newRange);
    if (newRange === 'custom') {
      setIsCustomOpen(true);
      setAppliedCustomFrom(customFrom);
      setAppliedCustomTo(customTo);
    } else {
      setIsCustomOpen(false);
      setAppliedCustomFrom(undefined);
      setAppliedCustomTo(undefined);
    }
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFrom || !customTo) return;
    setRange('custom');
    setAppliedCustomFrom(customFrom);
    setAppliedCustomTo(customTo);
  };

  const formatNumber = (num: number = 0) => {
    return new Intl.NumberFormat('ar-EG').format(num);
  };

  const summary = data?.summary || {
    totalViews: 0,
    uniqueVisitors: 0,
    landingViews: 0,
    systemViews: 0,
    viewsPerVisitor: 0,
  };

  const timeSeries = data?.timeSeries || [];
  const maxViews = Math.max(...timeSeries.map((t) => t.totalViews), 1);

  return (
    <div className="space-y-6 pb-28 sm:pb-12 animate-in fade-in duration-200">
      {/* Header & Refresh */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 leading-tight">
                إحصائيات الزوار وحركة المنصة
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                تتبع الزيارات الفورية، والزوار الفريدين للموقع التعريفي وبوابة النظام
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>تحديث مباشر</span>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching || !isOnline}
            className="flex items-center gap-2 px-3.5 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs sm:text-sm font-semibold rounded-xl border border-neutral-200/90 transition-colors disabled:opacity-50 cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-primary-600' : ''}`} />
            <span>{isFetching ? 'جاري التحديث...' : 'تحديث'}</span>
          </button>
        </div>
      </div>

      {/* Scope Switcher & Date Range Filters Bar */}
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
                    onClick={() => handleRangeChange(item.id as AnalyticsRange)}
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
            onSubmit={handleApplyCustomRange}
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Card 4: Scope Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs relative overflow-hidden group hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase">توزيع النطاقات</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {summary.totalViews > 0 ? (
              <>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-primary-700">
                    موقع: {Math.round((summary.landingViews / summary.totalViews) * 100)}%
                  </span>
                  <span className="text-emerald-700">
                    نظام: {Math.round((summary.systemViews / summary.totalViews) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-primary-600 transition-all duration-500"
                    style={{
                      width: `${(summary.landingViews / summary.totalViews) * 100}%`,
                    }}
                    title={`الموقع التعريفي: ${summary.landingViews} زيارة`}
                  />
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${(summary.systemViews / summary.totalViews) * 100}%`,
                    }}
                    title={`النظام الداخلي: ${summary.systemViews} زيارة`}
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-2">نسبة نشاط الزوار حسب المنصة</p>
              </>
            ) : (
              <div className="text-xs text-neutral-400 mt-2">لا توجد بيانات كافية للحساب</div>
            )}
          </div>
          <div className="absolute top-0 end-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full pointer-events-none" />
        </div>
      </div>

      {/* Time Series Trend Section */}
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
        {timeSeries.length === 0 || summary.totalViews === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-neutral-50/50 rounded-xl border border-dashed border-neutral-200">
            <Info className="w-8 h-8 text-neutral-400 mb-2" />
            <p className="text-sm font-bold text-neutral-700">لا توجد بيانات مسجلة في هذه الفترة</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              يتم تسجيل الزيارات تلقائياً بمجرد تصفح الطلاب أو الزوار لصفحات الموقع أو المنصة.
            </p>
          </div>
        ) : (
          <div className="relative pt-6 pb-2 overflow-x-auto scrollbar-thin">
            <div className={`h-56 flex items-end gap-2 sm:gap-3 px-2 ${timeSeries.length > 7 ? 'min-w-[640px]' : 'min-w-[420px] sm:min-w-0'} w-full`}>
              {timeSeries.map((point, index) => {
                const totalHeightPct = Math.max(12, (point.totalViews / maxViews) * 100);
                const landingHeightPct = point.totalViews > 0 ? (point.landingViews / point.totalViews) * 100 : 0;
                const systemHeightPct = point.totalViews > 0 ? (point.systemViews / point.totalViews) * 100 : 0;
                const isHovered = hoveredIndex === index;

                return (
                  <div
                    key={point.date}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer min-w-[36px]"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => setHoveredIndex(hoveredIndex === index ? null : index)}
                  >
                    {/* Tooltip on Hover / Touch */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 z-30 px-3 py-2 bg-neutral-900 text-white rounded-xl shadow-lg text-xs whitespace-nowrap pointer-events-none animate-in fade-in duration-150">
                        <p className="font-bold text-neutral-200 border-b border-neutral-700 pb-1 mb-1">
                          {point.label}
                        </p>
                        <div className="space-y-0.5 text-[11px]">
                          <p className="flex justify-between gap-3">
                            <span className="text-neutral-400">إجمالي الزيارات:</span>
                            <span className="font-bold text-white">{formatNumber(point.totalViews)}</span>
                          </p>
                          <p className="flex justify-between gap-3">
                            <span className="text-neutral-400">الزوار الفريدين:</span>
                            <span className="font-bold text-emerald-400">{formatNumber(point.uniqueVisitors)}</span>
                          </p>
                          <p className="flex justify-between gap-3">
                            <span className="text-neutral-400">الموقع التعريفي:</span>
                            <span className="font-bold text-primary-300">{formatNumber(point.landingViews)}</span>
                          </p>
                          <p className="flex justify-between gap-3">
                            <span className="text-neutral-400">لوحة النظام:</span>
                            <span className="font-bold text-emerald-300">{formatNumber(point.systemViews)}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Stacked Bar or Base Placeholder for 0 views */}
                    {point.totalViews === 0 ? (
                      <div
                        className="w-full bg-neutral-100 hover:bg-neutral-200 rounded-t-sm h-2 transition-colors"
                        title={`${point.label}: 0 زيارة`}
                      />
                    ) : (
                      <div
                        className={`w-full rounded-t-lg overflow-hidden flex flex-col-reverse shadow-xs transition-all duration-200 ${
                          isHovered ? 'ring-2 ring-primary-500 scale-y-105' : 'opacity-95 hover:opacity-100'
                        }`}
                        style={{ height: `${totalHeightPct}%` }}
                      >
                        {/* Landing part */}
                        <div
                          className="bg-primary-600 transition-all"
                          style={{ height: `${landingHeightPct}%` }}
                        />
                        {/* System part */}
                        <div
                          className="bg-emerald-500 transition-all"
                          style={{ height: `${systemHeightPct}%` }}
                        />
                      </div>
                    )}

                    {/* X-axis Label */}
                    <span className="text-[10px] sm:text-xs font-bold text-neutral-500 mt-2 truncate max-w-full text-center whitespace-nowrap">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout: Top Pages & Device Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Visited Pages (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                أكثر الصفحات زيارة
              </h2>
              <p className="text-xs text-neutral-500">
                المسارات الأكثر طلباً وتردداً من الزوار والمستخدمين
              </p>
            </div>
          </div>

          {data?.topPages && data.topPages.length > 0 ? (
            <div className="space-y-3">
              {data.topPages.map((page, idx) => (
                <div
                  key={page.path}
                  className="p-3 bg-neutral-50/80 hover:bg-neutral-50 rounded-xl border border-neutral-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-neutral-200/80 text-neutral-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate dir-ltr text-end sm:text-start" dir="ltr">
                        {page.path}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            page.isLandingPage
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-primary-100 text-primary-800'
                          }`}
                        >
                          {page.isLandingPage ? 'صفحة تعريفية' : 'لوحة النظام'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="w-28 h-2 bg-neutral-200 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="h-full bg-primary-600 rounded-full"
                        style={{ width: `${page.percentage}%` }}
                      />
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-black text-neutral-900">
                        {formatNumber(page.views)}
                        <span className="text-xs font-normal text-neutral-500 mr-1">زيارة</span>
                      </p>
                      <p className="text-[10px] text-neutral-400">{page.percentage}% من الإجمالي</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-neutral-400">
              لا توجد صفحات مسجلة حتى الآن
            </div>
          )}
        </div>

        {/* Device Breakdown (1 Col) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">
              الأجهزة المستخدمة
            </h2>
            <p className="text-xs text-neutral-500">
              توزيع الزوار حسب نوع الجهاز ومتصفحات الهاتف
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {data?.devices && data.devices.map((device) => {
              const Icon =
                device.device === 'Desktop'
                  ? Laptop
                  : device.device === 'Mobile'
                  ? Smartphone
                  : Tablet;

              return (
                <div
                  key={device.device}
                  className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-white rounded-lg border border-neutral-200 text-neutral-700 shadow-2xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900">{device.labelAr}</p>
                        <p className="text-[11px] text-neutral-400">{device.device}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-black text-neutral-900">{device.percentage}%</p>
                      <p className="text-[10px] text-neutral-500">{formatNumber(device.count)} زيارة</p>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-neutral-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full transition-all duration-500"
                      style={{ width: `${device.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Privacy Note Footer */}
          <div className="mt-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              جميع التقديرات وحساب الزوار تعتمد على بصمة تشفير SHA-256 متوافقة مع معايير حماية الخصوصية GDPR، دون حفظ أي عناوين IP صريحة.
            </p>
          </div>
        </div>
      </div>

      {/* Geographic Ranking & Student Engagement Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeoRankingCard
          range={range}
          from={range === 'custom' ? appliedCustomFrom : undefined}
          to={range === 'custom' ? appliedCustomTo : undefined}
          scope={scope === 'landing' ? 'landing' : scope === 'system' ? 'platform' : 'all'}
        />
        <StudentLeaderboardCard
          range={range}
          from={range === 'custom' ? appliedCustomFrom : undefined}
          to={range === 'custom' ? appliedCustomTo : undefined}
        />
      </div>
    </div>
  );
}
