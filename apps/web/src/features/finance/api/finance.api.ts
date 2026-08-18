import { apiClient } from '@/lib/api/client';
import {
  StudentPaymentRecord,
  DefaultersResponse,
  RecordPaymentPayload,
  ScanPaymentQrPayload,
  ScanPaymentQrResponse,
  PaymentQuery,
  CursorPaginatedResponse,
} from '../types/finance.types';

export async function fetchPayments(query: PaymentQuery = {}): Promise<CursorPaginatedResponse<StudentPaymentRecord>> {
  return apiClient<CursorPaginatedResponse<StudentPaymentRecord>>('/subscriptions/payments', {
    params: query as any,
  });
}

export async function fetchStudentPaymentHistory(studentId: string): Promise<StudentPaymentRecord[]> {
  return apiClient<StudentPaymentRecord[]>(`/subscriptions/student/${studentId}`);
}

export async function fetchGroupDefaulters(groupId: string, periodYear: number, periodMonth: number): Promise<DefaultersResponse> {
  return apiClient<DefaultersResponse>(`/subscriptions/group/${groupId}/defaulters`, {
    params: { periodYear, periodMonth },
  });
}

export async function recordPayment(payload: RecordPaymentPayload): Promise<StudentPaymentRecord> {
  return apiClient<StudentPaymentRecord>('/subscriptions/record', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function scanPaymentQr(payload: ScanPaymentQrPayload): Promise<ScanPaymentQrResponse> {
  return apiClient<ScanPaymentQrResponse>('/subscriptions/scan-qr', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deletePayment(id: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/subscriptions/${id}`, {
    method: 'DELETE',
  });
}
