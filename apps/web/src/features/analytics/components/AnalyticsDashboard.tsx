'use client';

import React, { useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { useAnalyticsOverview } from '../hooks/useAnalytics';
import { AnalyticsScope, AnalyticsRange } from '../types/analytics.types';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { AnalyticsFilterBar } from './AnalyticsFilterBar';
import { AnalyticsKpiGrid } from './AnalyticsKpiGrid';
import { AnalyticsRoleCards } from './AnalyticsRoleCards';
import { AnalyticsTimeSeriesChart } from './AnalyticsTimeSeriesChart';
import { AnalyticsDevicesBreakdown } from './AnalyticsDevicesBreakdown';
import { GeoRankingCard } from './GeoRankingCard';
import { StudentLeaderboardCard } from './StudentLeaderboardCard';
import { VisitorListCard } from './VisitorListCard';

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

  // Selected role filter for visitor list navigation
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'students' | 'parents' | 'guests'>('all');

  const handleRoleCardClick = (targetRole: 'all' | 'students' | 'parents' | 'guests') => {
    setSelectedRoleFilter(targetRole);
    const element = document.getElementById('visitors-list-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const { data: overviewData, isLoading, isFetching, refetch } = useAnalyticsOverview({
    scope,
    range,
    from: range === 'custom' ? appliedCustomFrom : undefined,
    to: range === 'custom' ? appliedCustomTo : undefined,
  });

  const data = overviewData?.stats;

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
    return new Intl.NumberFormat('en-US').format(num);
  };

  const summary = data?.summary || {
    totalViews: 0,
    uniqueVisitors: 0,
    landingViews: 0,
    systemViews: 0,
    viewsPerVisitor: 0,
    totalDurationSeconds: 0,
    totalDurationFormatted: '0 دقيقة',
    avgDurationPerVisitorFormatted: '0 دقيقة',
    studentsCount: 0,
    parentsCount: 0,
    guestsCount: 0,
  };

  const timeSeries = data?.timeSeries || [];

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
      <AnalyticsFilterBar
        scope={scope}
        setScope={setScope}
        range={range}
        onRangeChange={handleRangeChange}
        isCustomOpen={isCustomOpen}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        todayStr={todayStr}
        onApplyCustomRange={handleApplyCustomRange}
      />

      {/* KPI Cards Grid */}
      <AnalyticsKpiGrid
        isLoading={isLoading}
        summary={summary}
        formatNumber={formatNumber}
      />

      {/* Dedicated Registered Users Classification (Students vs Parents vs Guests) */}
      <AnalyticsRoleCards
        isLoading={isLoading}
        selectedRoleFilter={selectedRoleFilter}
        onRoleCardClick={handleRoleCardClick}
        summary={summary}
        formatNumber={formatNumber}
      />

      {/* Time Series Trend Section */}
      <AnalyticsTimeSeriesChart
        timeSeries={timeSeries}
        totalViews={summary.totalViews}
        range={range}
        formatNumber={formatNumber}
      />

      {/* Two Column Layout: Top Pages & Device Distribution */}
      <AnalyticsDevicesBreakdown
        topPages={data?.topPages}
        devices={data?.devices}
        osBreakdown={data?.osBreakdown}
        browserBreakdown={data?.browserBreakdown}
        formatNumber={formatNumber}
      />

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

      {/* Detailed Visitors List & Visits Log */}
      <VisitorListCard
        range={range}
        from={range === 'custom' ? appliedCustomFrom : undefined}
        to={range === 'custom' ? appliedCustomTo : undefined}
        scope={scope}
        roleFilter={selectedRoleFilter}
        onRoleFilterChange={setSelectedRoleFilter}
      />
    </div>
  );
}
