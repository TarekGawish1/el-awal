import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchPayments,
  fetchStudentPaymentHistory,
  fetchGroupDefaulters,
  recordPayment,
  scanPaymentQr,
  deletePayment,
} from '../api/finance.api';
import { PaymentQuery, RecordPaymentPayload, ScanPaymentQrPayload } from '../types/finance.types';
import { offlineDb } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export const financeKeys = {
  all: ['finance'] as const,
  payments: () => [...financeKeys.all, 'payments'] as const,
  paymentList: (query: PaymentQuery) => [...financeKeys.payments(), query] as const,
  studentHistory: (studentId: string) => [...financeKeys.all, 'student-history', studentId] as const,
  defaulters: (groupId: string, year: number, month: number) => 
    [...financeKeys.all, 'defaulters', groupId, year, month] as const,
};

export function usePayments(query: PaymentQuery) {
  return useInfiniteQuery({
    queryKey: financeKeys.paymentList(query),
    queryFn: ({ pageParam }) => fetchPayments({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
  });
}

export function useStudentPaymentHistory(studentId: string) {
  return useQuery({
    queryKey: financeKeys.studentHistory(studentId),
    queryFn: () => fetchStudentPaymentHistory(studentId),
    enabled: !!studentId,
  });
}

export function useGroupDefaulters(groupId: string, year: number, month: number) {
  return useQuery({
    queryKey: financeKeys.defaulters(groupId, year, month),
    queryFn: () => fetchGroupDefaulters(groupId, year, month),
    enabled: !!groupId && !!year && !!month,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RecordPaymentPayload) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        await syncEngine.enqueue(
          'finance',
          API_ENDPOINTS.SUBSCRIPTIONS.RECORD_PAYMENT,
          'POST',
          payload,
        );
        return {
          success: true,
          isOfflineSaved: true,
          message: 'تم تسجيل دفعة الاشتراك محلياً بنجاح ووضعها في انتظار المزامنة 💾',
        };
      }

      return recordPayment(payload);
    },
    onSuccess: (data, variables) => {
      if (!data?.isOfflineSaved) {
        queryClient.invalidateQueries({ queryKey: financeKeys.payments() });
        queryClient.invalidateQueries({ queryKey: financeKeys.studentHistory(variables.studentId) });
        if (variables.groupId) {
          queryClient.invalidateQueries({ 
            queryKey: financeKeys.defaulters(variables.groupId, variables.periodYear, variables.periodMonth) 
          });
        }
      }
    },
  });
}

export function useScanPaymentQr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ScanPaymentQrPayload) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const localMatch = await offlineDb.findStudentByQrToken(payload.qrCodeToken);
        const resolvedStudentName = localMatch?.student?.fullName || 'طالب';
        const studentId = localMatch?.student?.id || payload.qrCodeToken;
        const groupId = payload.groupId || localMatch?.groupId;

        await syncEngine.enqueue(
          'finance',
          API_ENDPOINTS.SUBSCRIPTIONS.SCAN_QR,
          'POST',
          {
            ...payload,
            studentId,
            groupId,
          },
        );

        return {
          success: true,
          isDuplicate: false,
          isOfflineSaved: true,
          message: 'تم تسجيل سداد الاشتراك محلياً بنجاح وسيتم إرساله عند الاتصال 💾',
          student: {
            id: studentId,
            fullName: resolvedStudentName,
            studentCode: localMatch?.student?.studentCode,
          },
          group: {
            id: groupId,
            name: localMatch?.groupName || 'المجموعة',
          },
          amount: payload.amountPaid || localMatch?.student ? 350 : 0,
        };
      }

      try {
        return await scanPaymentQr(payload);
      } catch (error) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const localMatch = await offlineDb.findStudentByQrToken(payload.qrCodeToken);
          await syncEngine.enqueue(
            'finance',
            API_ENDPOINTS.SUBSCRIPTIONS.SCAN_QR,
            'POST',
            payload,
          );
          return {
            success: true,
            isOfflineSaved: true,
            message: 'تم حفظ السداد محلياً بنجاح في انتظار الاتصال 💾',
            student: { fullName: localMatch?.student?.fullName || 'طالب' },
          };
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      if (!data?.isOfflineSaved) {
        queryClient.invalidateQueries({ queryKey: financeKeys.payments() });
        if (data?.student?.id) {
          queryClient.invalidateQueries({ queryKey: financeKeys.studentHistory(data.student.id) });
        }
        const targetGroupId = variables.groupId || data?.group?.id;
        if (targetGroupId) {
          const year = variables.periodYear || new Date().getFullYear();
          const month = variables.periodMonth || (new Date().getMonth() + 1);
          queryClient.invalidateQueries({ 
            queryKey: financeKeys.defaulters(targetGroupId, year, month) 
          });
        }
      }
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}
