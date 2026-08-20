import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { LinkedStudentRecord } from '../types/parent-portal.types';

export function useLinkedStudents() {
  return useQuery({
    queryKey: ['parent-portal', 'linked-students'],
    queryFn: () => apiClient<LinkedStudentRecord[]>(API_ENDPOINTS.PARENT_PORTAL.LINKED_STUDENTS),
  });
}
