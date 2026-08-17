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
