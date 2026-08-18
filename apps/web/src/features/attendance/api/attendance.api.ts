import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  LessonSession,
  SessionReport,
  ScanQrResponse,
  BatchAttendanceDto,
} from '../types/attendance.types';

export async function fetchGroupSessions(groupId: string): Promise<LessonSession[]> {
  return await apiClient<LessonSession[]>(API_ENDPOINTS.GROUPS.SESSIONS(groupId));
}

export async function fetchTodaySessions(
  academicStage?: string,
  gradeLevel?: string,
  academicYear?: string,
  academicTerm?: string,
): Promise<LessonSession[]> {
  const query = new URLSearchParams();
  if (academicStage) query.append('academicStage', academicStage);
  if (gradeLevel) query.append('gradeLevel', gradeLevel);
  if (academicYear) query.append('academicYear', academicYear);
  if (academicTerm) query.append('academicTerm', academicTerm);
  const qs = query.toString();
  const url = `${API_ENDPOINTS.SCHEDULES.TODAY_SESSIONS}${qs ? `?${qs}` : ''}`;
  return await apiClient<LessonSession[]>(url);
}

export async function fetchSessionReport(sessionId: string): Promise<SessionReport> {
  return await apiClient<SessionReport>(API_ENDPOINTS.ATTENDANCE.REPORTS(sessionId));
}

export async function scanQrAttendance(sessionId: string, qrCodeToken: string): Promise<ScanQrResponse> {
  return await apiClient<ScanQrResponse>(API_ENDPOINTS.ATTENDANCE.SCAN_QR(sessionId), {
    method: 'POST',
    body: JSON.stringify({ qrCodeToken }),
  });
}

export async function recordManualBatch(sessionId: string, payload: BatchAttendanceDto): Promise<any> {
  return await apiClient<any>(API_ENDPOINTS.ATTENDANCE.MANUAL(sessionId), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
