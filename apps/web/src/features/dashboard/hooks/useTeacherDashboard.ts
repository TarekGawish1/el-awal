'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTeacherGroups, fetchTeacherDashboardOverview } from '../api/dashboard.api';
import { DashboardFilterState } from '../types/dashboard.types';

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilterState = {
  academicYear: '2026-2027',
  groupId: 'ALL',
  dateRange: 'week',
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
    queryFn: () => fetchTeacherDashboardOverview(filters),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours in cache for offline viewing
    retry: 1,
  });

  return {
    ...query,
    isOffline: !isOnline,
  };
}
