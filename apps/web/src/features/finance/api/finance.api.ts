import { apiClient } from '@/lib/api/client';
import {
  StudentPaymentRecord,
  DefaultersResponse,
  RecordPaymentPayload,
  ScanPaymentQrPayload,
  ScanPaymentQrResponse,
  PaymentQuery,
  CursorPaginatedResponse,
  MatrixLedgerResponse,
  BillingConfigurationResponse,
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

export async function fetchMatrixLedger(query: {
  gradeLevel?: string;
  academicPeriodId?: string;
  academicYear?: string;
  academicTerm?: string;
  groupId?: string;
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<MatrixLedgerResponse> {
  return apiClient<MatrixLedgerResponse>('/payments/matrix-ledger', {
    params: query as Record<string, string | number | boolean | undefined>,
  });
}

export async function fetchBillingConfiguration(query: { academicYear: string; academicTerm: string }): Promise<BillingConfigurationResponse> {
  return apiClient<BillingConfigurationResponse>('/payments/billing-config', {
    params: query as Record<string, string | number | boolean | undefined>,
  });
}

export async function updateBillingConfiguration(payload: {
  academicYear: string;
  academicTerm: string;
  excludedMonths: number[];
}): Promise<BillingConfigurationResponse> {
  return apiClient<BillingConfigurationResponse>('/payments/billing-config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
