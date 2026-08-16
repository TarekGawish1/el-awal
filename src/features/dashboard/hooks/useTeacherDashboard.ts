import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { DashboardFilterState, TeacherDashboardData } from '@/types/dashboard.types';

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilterState = {
  academicYear: '2026-2027',
  groupId: 'ALL',
  dateRange: 'week',
};

export interface GroupOption {
  id: string;
  name: string;
  gradeLevel: string;
}

/**
 * Custom hook to fetch groups for dashboard filter dropdown
 */
export function useTeacherGroups() {
  return useQuery({
    queryKey: ['teacher', 'groups'],
    queryFn: async () => {
      try {
        const response = await apiClient<GroupOption[]>(API_ENDPOINTS.GROUPS.LIST);
        return response;
      } catch (e) {
        // Return empty list on failure so filter dropdown degrades gracefully
        return [];
      }
    },
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
    queryFn: async () => {
      const queryParams: Record<string, string> = {
        academicYear: filters.academicYear,
        dateRange: filters.dateRange,
      };

      if (filters.groupId && filters.groupId !== 'ALL') {
        queryParams.groupId = filters.groupId;
      }

      if (filters.startDate) queryParams.startDate = filters.startDate;
      if (filters.endDate) queryParams.endDate = filters.endDate;

      return await apiClient<TeacherDashboardData>(API_ENDPOINTS.TEACHER.DASHBOARD_OVERVIEW, {
        params: queryParams,
      });
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours in cache for offline viewing
    retry: 1,
  });

  return {
    ...query,
    isOffline: !isOnline,
  };
}
