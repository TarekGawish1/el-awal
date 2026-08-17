'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardFilterState, DateRangePreset } from '../types/dashboard.types';
import { useTeacherDashboard, useTeacherGroups, DEFAULT_DASHBOARD_FILTERS } from '../hooks/useTeacherDashboard';
import { DashboardHeader } from './DashboardHeader';
import { DashboardFilters } from './DashboardFilters';
import { DashboardKpiGrid } from './DashboardKpiGrid';
import { TodaySessionsSection } from './TodaySessionsSection';
import { AttendanceTrendSection } from './AttendanceTrendSection';
import { GroupPerformanceSection } from './GroupPerformanceSection';
import { AttentionSection } from './AttentionSection';
import { DashboardOfflineBanner } from './DashboardOfflineBanner';
import { DashboardErrorState } from './DashboardErrorState';
import { DashboardEmptyState } from './DashboardEmptyState';

export function TeacherDashboardContainer() {
  const router = useRouter();

  // Read initial filter values from URL params or defaults
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialFilters: DashboardFilterState = {
    academicYear: searchParams?.get('academicYear') || DEFAULT_DASHBOARD_FILTERS.academicYear,
    groupId: searchParams?.get('groupId') || DEFAULT_DASHBOARD_FILTERS.groupId,
    dateRange: (searchParams?.get('dateRange') as DateRangePreset) || DEFAULT_DASHBOARD_FILTERS.dateRange,
    startDate: searchParams?.get('startDate') || undefined,
    endDate: searchParams?.get('endDate') || undefined,
  };

  const [filters, setFilters] = useState<DashboardFilterState>(initialFilters);

  // Fetch groups for filter dropdown
  const { data: groups = [], isLoading: isGroupsLoading } = useTeacherGroups();

  // Fetch primary dashboard overview
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    isOffline,
  } = useTeacherDashboard(filters);

  // Handle filter changes and sync to URL params
  const handleFilterChange = (updated: Partial<DashboardFilterState>) => {
    const newFilters = { ...filters, ...updated };
    setFilters(newFilters);

    const params = new URLSearchParams();
    if (newFilters.academicYear) params.set('academicYear', newFilters.academicYear);
    if (newFilters.groupId && newFilters.groupId !== 'ALL') params.set('groupId', newFilters.groupId);
    if (newFilters.dateRange) params.set('dateRange', newFilters.dateRange);
    if (newFilters.startDate) params.set('startDate', newFilters.startDate);
    if (newFilters.endDate) params.set('endDate', newFilters.endDate);

    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : '/teacher/dashboard');
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_DASHBOARD_FILTERS);
    router.replace('/teacher/dashboard');
  };

  const isFiltered = filters.groupId !== 'ALL' || filters.dateRange !== 'week' || filters.academicYear !== '2026-2027';

  // Permission Denied Check (403)
  const isForbidden = isError && (error as { statusCode?: number })?.statusCode === 403;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Offline / Degraded State Banner */}
      {isOffline && (
        <DashboardOfflineBanner lastUpdatedTimestamp={dashboardData?.lastUpdatedTimestamp} />
      )}

      {/* 2. Top-level Header & Quick Refresh */}
      <DashboardHeader
        isFetching={isFetching && !isLoading}
        isOffline={isOffline}
        lastUpdatedTimestamp={dashboardData?.lastUpdatedTimestamp}
        onRefresh={() => refetch()}
      />

      {/* 3. Global Filter Bar */}
      <DashboardFilters
        filters={filters}
        groups={groups}
        isGroupsLoading={isGroupsLoading}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* 4. Partial Loading Progress Bar */}
      {isFetching && !isLoading && (
        <div className="w-full bg-neutral-100 h-1 overflow-hidden rounded-full">
          <div className="bg-primary-600 h-full w-1/3 animate-pulse rounded-full" />
        </div>
      )}

      {/* 5. Permission Denied State (403) */}
      {isForbidden ? (
        <div className="p-8 text-center bg-white border border-error-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold text-error-700 mb-2">غير مصرح بالوصول (403)</h3>
          <p className="text-sm text-neutral-600 mb-4">
            هذه اللوحة مخصصة لحسابات المدرسين فقط. لا تملك الصلاحيات الكافية لعرض هذه البيانات.
          </p>
          <a href="/login" className="text-sm font-semibold text-primary-600 underline">
            العودة لصفحة تسجيل الدخول
          </a>
        </div>
      ) : isError && !dashboardData ? (
        /* 6. API Error State with Retry */
        <DashboardErrorState
          errorMessage={error?.message}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : !isLoading && dashboardData?.kpis.totalActiveStudents === 0 && !isFiltered ? (
        /* 7. First-Time / Onboarding Empty State */
        <DashboardEmptyState isFiltered={false} />
      ) : !isLoading && dashboardData?.kpis.todaySessionsCount === 0 && isFiltered && dashboardData?.todaySessions.length === 0 ? (
        /* 8. Filtered Empty State */
        <DashboardEmptyState isFiltered={true} onResetFilters={handleResetFilters} />
      ) : (
        /* 9. Fully Loaded & Responsive Decision-Support Hierarchy */
        <div className="space-y-6">
          {/* Level 1: Primary 4 KPIs */}
          <DashboardKpiGrid kpis={dashboardData?.kpis} isLoading={isLoading} />

          {/* Level 2 & 4: Today's Sessions & Attendance Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5 flex flex-col">
              <TodaySessionsSection
                sessions={dashboardData?.todaySessions}
                isLoading={isLoading}
              />
            </div>
            <div className="lg:col-span-7 flex flex-col">
              <AttendanceTrendSection
                trends={dashboardData?.attendanceTrends}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Level 2 & 3: Attention Alerts & Group Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-6 flex flex-col">
              <AttentionSection
                atRiskStudents={dashboardData?.atRiskStudents}
                pendingGrading={dashboardData?.pendingGradingList}
                isLoading={isLoading}
              />
            </div>
            <div className="lg:col-span-6 flex flex-col">
              <GroupPerformanceSection
                groups={dashboardData?.groupPerformance}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
