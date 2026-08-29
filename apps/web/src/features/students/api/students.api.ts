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

export async function updateStudentStatus(id: string, status: string): Promise<StudentDetail> {
  return await apiClient<StudentDetail>(`${API_ENDPOINTS.STUDENTS.LIST}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteStudent(id: string): Promise<{ success: boolean; message: string }> {
  return await apiClient<{ success: boolean; message: string }>(`${API_ENDPOINTS.STUDENTS.LIST}/${id}`, {
    method: 'DELETE',
  });
}

export interface StudentCredentialsResponse {
  studentId: string;
  studentName: string;
  studentCode: string;
  studentPhone: string | null;
  parentName: string | null;
  parentPhone: string | null;
  tempAccessPin: string | null;
  pinExpiresAt: string | null;
  isPinActive: boolean;
}

export interface ResetStudentPasswordPayload {
  newPassword?: string;
  sendWhatsApp?: boolean;
}

export interface ResetStudentPasswordResponse {
  success: boolean;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentPhone: string;
  parentPhone: string;
  newPassword: string;
  messageSent: boolean;
}

export async function fetchStudentCredentials(id: string): Promise<StudentCredentialsResponse> {
  return await apiClient<StudentCredentialsResponse>(API_ENDPOINTS.STUDENTS.CREDENTIALS(id));
}

export async function resetStudentPassword(
  id: string,
  payload: ResetStudentPasswordPayload,
): Promise<ResetStudentPasswordResponse> {
  return await apiClient<ResetStudentPasswordResponse>(API_ENDPOINTS.STUDENTS.RESET_PASSWORD(id), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
