import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { DashboardFilterState, TeacherDashboardData, GroupOption } from '../types/dashboard.types';

/**
 * Fetches teacher groups for dashboard filter dropdown
 */
export async function fetchTeacherGroups(): Promise<GroupOption[]> {
  try {
    return await apiClient<GroupOption[]>(API_ENDPOINTS.GROUPS.LIST);
  } catch (e) {
    // Return empty array on failure so UI degrades gracefully
    return [];
  }
}

/**
 * Fetches primary teacher dashboard aggregated metrics & activities
 */
export async function fetchTeacherDashboardOverview(
  filters: DashboardFilterState
): Promise<TeacherDashboardData> {
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
}
