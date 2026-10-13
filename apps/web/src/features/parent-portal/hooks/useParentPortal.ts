import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { LinkedStudentRecord } from '../types/parent-portal.types';

export interface ParentDashboardResponse {
  linkedStudents: LinkedStudentRecord[];
  activeChildOverview: any;
  selectedStudentId: string | null;
}

export function useParentDashboard(studentId?: string | null) {
  return useQuery({
    queryKey: ['parent-portal', 'dashboard', studentId || 'default'],
    queryFn: () => apiClient<ParentDashboardResponse>(API_ENDPOINTS.PARENT_PORTAL.DASHBOARD(studentId || undefined)),
    staleTime: 60_000,
  });
}

export function useLinkedStudents() {
  return useQuery({
    queryKey: ['parent-portal', 'linked-students'],
    queryFn: () => apiClient<LinkedStudentRecord[]>(API_ENDPOINTS.PARENT_PORTAL.LINKED_STUDENTS),
  });
}

export function useChildOverview(studentId: string) {
  return useQuery({
    queryKey: ['parent-portal', 'student-overview', studentId],
    enabled: !!studentId,
    queryFn: () => apiClient<any>(API_ENDPOINTS.PARENT_PORTAL.CHILD_OVERVIEW(studentId)),
    staleTime: 60_000,
  });
}

