'use client';

import React from 'react';
import { useAuth } from '@/features/auth';
import { useTeacherDashboard } from '../hooks/useTeacherDashboard';
import { DashboardHeader } from './DashboardHeader';
import { DashboardOfflineBanner } from './DashboardOfflineBanner';
import { DashboardErrorState } from './DashboardErrorState';
import { CurrentNextClass } from './CurrentNextClass';
import { TodayScheduleTimeline } from './TodayScheduleTimeline';
import { NeedsAttentionUnified } from './NeedsAttentionUnified';
import { QuickActions } from './QuickActions';
import { DEFAULT_DASHBOARD_FILTERS } from '../hooks/useTeacherDashboard';

export function TeacherDashboardContainer() {
  const { user } = useAuth();

  // We only care about TODAY for the Home page, so we use default/empty filters
  // that backend interprets as today. Or explicitly pass a dateRange if needed by hook.
  const filters = DEFAULT_DASHBOARD_FILTERS; 

  const {
    data: dashboardData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    isOffline,
  } = useTeacherDashboard(filters);

  // Permission Denied Check (403)
  const isForbidden = isError && (error as { statusCode?: number })?.statusCode === 403;

  if (isForbidden) {
    return (
      <div className="p-8 text-center bg-white border border-error-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-bold text-error-700 mb-2">غير مصرح بالوصول (403)</h3>
        <p className="text-sm text-neutral-600 mb-4">
          هذه اللوحة مخصصة لحسابات المدرسين فقط. لا تملك الصلاحيات الكافية لعرض هذه البيانات.
        </p>
        <a href="/login" className="text-sm font-semibold text-primary-600 underline">
          العودة لصفحة تسجيل الدخول
        </a>
      </div>
    );
  }

  if (isError && !dashboardData) {
    return (
      <DashboardErrorState
        errorMessage={error?.message}
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-12 max-w-7xl mx-auto">
      {/* Offline Indicator */}
      {isOffline && (
        <DashboardOfflineBanner lastUpdatedTimestamp={dashboardData?.lastUpdatedTimestamp} />
      )}

      {/* Header */}
      <DashboardHeader
        teacherName={user?.fullName}
        isFetching={isFetching && !isLoading}
        isOffline={isOffline}
        lastUpdatedTimestamp={dashboardData?.lastUpdatedTimestamp}
        onRefresh={() => refetch()}
        todaySessionsCount={dashboardData?.todaySessions?.length || 0}
      />

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">
        
        {/* Left Column: Chronological Focus (60% on desktop) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          <CurrentNextClass 
            sessions={dashboardData?.todaySessions} 
            isLoading={isLoading} 
          />
          
          <TodayScheduleTimeline 
            sessions={dashboardData?.todaySessions} 
            isLoading={isLoading} 
          />
        </div>

        {/* Right Column: Task Focus (40% on desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          <NeedsAttentionUnified 
            atRiskStudents={dashboardData?.atRiskStudents}
            pendingGrading={dashboardData?.pendingGradingList}
            isLoading={isLoading}
          />
        </div>

      </div>

      <QuickActions />
    </div>
  );
}
