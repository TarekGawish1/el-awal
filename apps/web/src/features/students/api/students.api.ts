import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  StudentListItem,
  StudentDetail,
  CreateStudentPayload,
  StudentQrResponse,
  CursorPaginatedResponse,
  StudentQuery,
} from '../types/students.types';

export async function fetchStudents(query: StudentQuery): Promise<CursorPaginatedResponse<StudentListItem>> {
  return await apiClient<CursorPaginatedResponse<StudentListItem>>(API_ENDPOINTS.STUDENTS.LIST, {
    params: { ...query } as Record<string, string>,
  });
}

export async function createStudent(payload: CreateStudentPayload): Promise<any> {
  return await apiClient(API_ENDPOINTS.STUDENTS.LIST, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchStudentById(id: string): Promise<StudentDetail> {
  return await apiClient<StudentDetail>(API_ENDPOINTS.STUDENTS.DETAIL(id));
}

export async function fetchStudentQrCode(id: string): Promise<StudentQrResponse> {
  return await apiClient<StudentQrResponse>(API_ENDPOINTS.STUDENTS.QR_CODE(id));
}

export async function regenerateStudentQrToken(id: string): Promise<StudentQrResponse> {
  return await apiClient<StudentQrResponse>(API_ENDPOINTS.STUDENTS.REGENERATE_QR(id), {
    method: 'POST',
  });
}
