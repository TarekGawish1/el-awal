import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  Group,
  CreateGroupPayload,
  GroupWithDetails,
  GroupEnrollment,
  EnrollStudentPayload,
  Student
} from '../types/groups.types';

export async function fetchGroups(): Promise<Group[]> {
  return await apiClient<Group[]>(API_ENDPOINTS.GROUPS.LIST);
}

export async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  return await apiClient<Group>(API_ENDPOINTS.GROUPS.LIST, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchGroup(id: string): Promise<GroupWithDetails> {
  return await apiClient<GroupWithDetails>(API_ENDPOINTS.GROUPS.DETAIL(id));
}

export async function deleteGroup(id: string): Promise<void> {
  return await apiClient<void>(API_ENDPOINTS.GROUPS.DETAIL(id), {
    method: 'DELETE',
  });
}

export async function fetchGroupStudents(id: string): Promise<GroupEnrollment[]> {
  const response = await apiClient<any>(API_ENDPOINTS.GROUPS.STUDENTS(id));
  const roster = response?.roster || [];
  return roster.map((r: any) => ({
    id: r.enrollmentId,
    enrolledAt: r.enrolledAt,
    status: 'ACTIVE',
    attendanceRate: r.attendanceRate,
    student: {
      id: r.studentId,
      code: r.studentCode,
      gradeLevel: r.gradeLevel,
      user: {
        name: r.fullName,
        phone: r.phone,
      }
    }
  }));
}

export async function addStudentToGroup(id: string, payload: EnrollStudentPayload): Promise<any> {
  return await apiClient<any>(API_ENDPOINTS.GROUPS.STUDENTS(id), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function removeStudentFromGroup(id: string, studentId: string): Promise<void> {
  return await apiClient<void>(`${API_ENDPOINTS.GROUPS.STUDENTS(id)}/${studentId}`, {
    method: 'DELETE',
  });
}

export async function searchStudents(query: string): Promise<{ data: Student[] }> {
  // Use existing students endpoint. Assumes GET /students is implemented.
  return await apiClient<{ data: Student[] }>(API_ENDPOINTS.STUDENTS.LIST, {
    params: { search: query, limit: 10 },
  });
}
