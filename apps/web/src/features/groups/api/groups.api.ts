import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  Group,
  CreateGroupPayload,
  GroupWithDetails,
  GroupEnrollment,
  EnrollStudentPayload,
  GroupRegistrationLink,
  Student
} from '../types/groups.types';

export async function fetchGroups(params?: {
  academicYear?: string;
  academicTerm?: string;
  gradeLevel?: string;
}): Promise<Group[]> {
  return await apiClient<Group[]>(API_ENDPOINTS.GROUPS.LIST, {
    params: params as any,
  });
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

export async function updateGroup(id: string, payload: Partial<CreateGroupPayload>): Promise<Group> {
  return await apiClient<Group>(API_ENDPOINTS.GROUPS.DETAIL(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteGroup(id: string): Promise<void> {
  return await apiClient<void>(API_ENDPOINTS.GROUPS.DETAIL(id), {
    method: 'DELETE',
  });
}

export async function fetchGroupStudents(id: string): Promise<GroupEnrollment[]> {
  const response = await apiClient<any>(API_ENDPOINTS.GROUPS.STUDENTS(id));
  const roster = Array.isArray(response)
    ? response
    : Array.isArray(response?.roster)
    ? response.roster
    : Array.isArray(response?.data?.roster)
    ? response.data.roster
    : Array.isArray(response?.students)
    ? response.students
    : [];
  return roster.map((r: any) => ({
    id: r.enrollmentId || r.id,
    enrolledAt: r.enrolledAt || new Date().toISOString(),
    status: r.status || 'ACTIVE',
    attendanceRate: r.attendanceRate ?? 100,
    student: {
      id: r.studentId || r.student?.id || r.id,
      code: r.studentCode || r.student?.studentCode || r.student?.code,
      gradeLevel: r.gradeLevel || r.student?.gradeLevel || '',
      academicStage: r.academicStage || r.student?.academicStage || '',
      academicStatus: r.academicStatus || r.student?.academicStatus || 'ACTIVE',
      user: {
        name: r.fullName || r.student?.user?.fullName || r.student?.user?.name || r.name || 'طالب',
        phone: r.phone || r.student?.user?.phone || '',
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

export async function generateRegistrationLink(groupId: string): Promise<GroupRegistrationLink> {
  return await apiClient<GroupRegistrationLink>(API_ENDPOINTS.GROUPS.REGISTRATION_LINK(groupId), {
    method: 'POST',
  });
}

export async function fetchPendingReservations(): Promise<any[]> {
  return await apiClient<any[]>('/groups/reservations/pending');
}

export async function acceptReservation(enrollmentId: string, payload?: { paymentStatus?: 'PAID' | 'LATER' }): Promise<void> {
  return await apiClient<void>(`/groups/reservations/${enrollmentId}/accept`, {
    method: 'POST',
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

export async function rejectReservation(enrollmentId: string): Promise<void> {
  return await apiClient<void>(`/groups/reservations/${enrollmentId}/reject`, {
    method: 'POST',
  });
}

export async function changeReservationGroup(enrollmentId: string, groupId: string): Promise<void> {
  return await apiClient<void>(`/groups/reservations/${enrollmentId}/group`, {
    method: 'PATCH',
    body: JSON.stringify({ groupId }),
  });
}
