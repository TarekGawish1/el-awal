'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTeacherGroups, fetchTeacherDashboardOverview, fetchTeacherDashboardInit } from '../api/dashboard.api';
import { DashboardFilterState, TeacherDashboardInitData } from '../types/dashboard.types';
import { offlineDb } from '@/lib/offline/db';
import { QUERY_KEYS } from '@/lib/api/query-keys';

const DASHBOARD_SNAPSHOT_KEY = 'el_awal_teacher_dashboard_snapshot_v1';

export const DEFAULT_EMPTY_SNAPSHOT: TeacherDashboardInitData = {
  kpis: {
    todaySessionsCount: 0,
    activeSessionsCount: 0,
    totalActiveStudents: 0,
    totalActiveGroups: 0,
    weeklyAttendanceRate: 100,
    pendingGradingCount: 0,
    pendingGradingAssessmentsCount: 0,
  },
  todaySessions: [],
  attendanceTrends: [],
  atRiskStudents: [],
  pendingGradingList: [],
  groupPerformance: [],
  lastUpdatedTimestamp: '',
};

function getCachedDashboardSnapshot(): TeacherDashboardInitData | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(DASHBOARD_SNAPSHOT_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.kpis ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function setCachedDashboardSnapshot(data: TeacherDashboardInitData): void {
  if (typeof window === 'undefined' || !data) return;
  try {
    localStorage.setItem(DASHBOARD_SNAPSHOT_KEY, JSON.stringify(data));
  } catch {
    // Gracefully ignore storage quota exceptions
  }
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilterState = {
  academicYear: '2026-2027',
  groupId: 'ALL',
  dateRange: 'week',
  layout: 'home',
};

/**
 * Custom hook to fetch groups for dashboard filter dropdown
 */
export function useTeacherGroups() {
  return useQuery({
    queryKey: ['teacher', 'groups'],
    queryFn: () => fetchTeacherGroups(),
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

/**
 * Primary Teacher Dashboard Query Hook
 * Connects to server-side overview contract and manages caching, filters, and offline status
 */
export function useTeacherDashboard(filters: DashboardFilterState = DEFAULT_DASHBOARD_FILTERS) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const queryClient = useQueryClient();
  const isHomeDashboard = filters.groupId === 'ALL' && (filters.layout === 'home' || !filters.layout);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const query = useQuery({
    queryKey: ['teacher', 'dashboard', 'overview', filters],
    queryFn: async () => {
      const data = await fetchTeacherDashboardInit(filters);

      if (data && isHomeDashboard) {
        setCachedDashboardSnapshot(data);
      }

      // Seed menus and offline stores
      if (data?.menus) {
        if (data.menus.groups?.length) {
          queryClient.setQueryData(['teacher', 'groups'], data.menus.groups);
          queryClient.setQueryData(['groups', undefined], data.menus.groups);
          offlineDb.bulkPutGroups(data.menus.groups as any).catch(() => {});
        }
        if (data.menus.academicPeriod) {
          queryClient.setQueryData(['teacher', 'academic-period'], data.menus.academicPeriod);
        }
      }

      // Seed pending reservations into courses subscriptions cache
      if (data?.pendingReservations) {
        queryClient.setQueryData(QUERY_KEYS.courses.teacherSubscriptions(), {
          pendingRequests: data.pendingReservations,
          activeStudents: [],
          unsubscribedStudents: [],
          counts: {
            pending: data.pendingReservations.length,
            active: 0,
            unsubscribed: 0,
          },
        });
      }

      return data;
    },
    initialData: isHomeDashboard ? () => getCachedDashboardSnapshot() || DEFAULT_EMPTY_SNAPSHOT : undefined,
    initialDataUpdatedAt: isHomeDashboard
      ? () => {
          const snap = getCachedDashboardSnapshot();
          return snap?.lastUpdatedTimestamp ? new Date(snap.lastUpdatedTimestamp).getTime() : 0;
        }
      : undefined,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours in cache for offline viewing
    retry: 1,
  });

  return {
    ...query,
    isOffline: !isOnline,
  };
}

