import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchPayments,
  fetchStudentPaymentHistory,
  fetchGroupDefaulters,
  recordPayment,
  scanPaymentQr,
  deletePayment,
} from '../api/finance.api';
import { PaymentQuery, RecordPaymentPayload, ScanPaymentQrPayload, DefaultersResponse, ScanPaymentQrResponse, StudentPaymentRecord } from '../types/finance.types';
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
    queryFn: async ({ pageParam }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const offlineList = await offlineDb.getPaymentsOffline({
          groupId: query.groupId,
          studentId: query.studentId,
          year: query.periodYear ? Number(query.periodYear) : undefined,
          month: query.periodMonth ? Number(query.periodMonth) : undefined,
        });
        return {
          data: offlineList,
          meta: {
            total: offlineList.length,
            nextCursor: undefined,
            hasMore: false,
          },
        };
      }

      try {
        const result = await fetchPayments({ ...query, cursor: pageParam });
        if (result?.data && result.data.length > 0) {
          offlineDb.bulkPutPayments(result.data);
        }
        return result;
      } catch (err) {
        const offlineList = await offlineDb.getPaymentsOffline({
          groupId: query.groupId,
          studentId: query.studentId,
          year: query.periodYear ? Number(query.periodYear) : undefined,
          month: query.periodMonth ? Number(query.periodMonth) : undefined,
        });
        return {
          data: offlineList,
          meta: {
            total: offlineList.length,
            nextCursor: undefined,
            hasMore: false,
          },
        };
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => lastPage?.meta?.nextCursor,
  });
}

export function useStudentPaymentHistory(studentId: string) {
  return useQuery<StudentPaymentRecord[]>({
    queryKey: financeKeys.studentHistory(studentId),
    queryFn: async (): Promise<StudentPaymentRecord[]> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const payments = await offlineDb.getPaymentsOffline({ studentId });
        return payments as unknown as StudentPaymentRecord[];
      }
      try {
        return await fetchStudentPaymentHistory(studentId);
      } catch {
        const payments = await offlineDb.getPaymentsOffline({ studentId });
        return payments as unknown as StudentPaymentRecord[];
      }
    },
    enabled: !!studentId,
  });
}

export function useGroupDefaulters(groupId: string, year: number, month: number) {
  return useQuery<DefaultersResponse>({
    queryKey: financeKeys.defaulters(groupId, year, month),
    queryFn: async (): Promise<DefaultersResponse> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const group = await offlineDb.getGroupByIdOffline(groupId);
        return {
          groupId,
          groupName: group?.name || 'المجموعة الدراسية',
          periodYear: year,
          periodMonth: month,
          totalEnrolled: group?._count?.enrollments || 0,
          totalDefaulters: 0,
          defaulters: [],
        };
      }
      try {
        return await fetchGroupDefaulters(groupId, year, month);
      } catch {
        const group = await offlineDb.getGroupByIdOffline(groupId);
        return {
          groupId,
          groupName: group?.name || 'المجموعة الدراسية',
          periodYear: year,
          periodMonth: month,
          totalEnrolled: group?._count?.enrollments || 0,
          totalDefaulters: 0,
          defaulters: [],
        };
      }
    },
    enabled: !!groupId && !!year && !!month,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RecordPaymentPayload): Promise<StudentPaymentRecord | { success: boolean; isOfflineSaved: boolean; message: string }> => {
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
    onSuccess: (data: any, variables) => {
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
    mutationFn: async (payload: ScanPaymentQrPayload): Promise<ScanPaymentQrResponse & { isOfflineSaved?: boolean }> => {
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

        const paymentRecord: any = {
          id: `offline-pay-${Date.now()}`,
          studentId,
          groupId: groupId || null,
          periodYear: payload.periodYear || new Date().getFullYear(),
          periodMonth: payload.periodMonth || (new Date().getMonth() + 1),
          amountExpected: payload.amountPaid || 350,
          amountPaid: payload.amountPaid || 350,
          currency: 'EGP',
          paymentStatus: 'PAID' as any,
          paymentMethod: payload.paymentMethod || 'CASH',
          receiptNumber: payload.receiptNumber || null,
          recordedById: 'offline-teacher',
          notes: payload.notes || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          success: true,
          isDuplicate: false,
          isOfflineSaved: true,
          message: 'تم تسجيل سداد الاشتراك محلياً بنجاح وسيتم إرساله عند الاتصال 💾',
          payment: paymentRecord,
          student: {
            id: studentId,
            fullName: resolvedStudentName,
            phone: localMatch?.student?.phone || null,
          },
          group: groupId ? {
            id: groupId,
            name: localMatch?.groupName || 'المجموعة',
          } : null,
        };
      }

      try {
        return await scanPaymentQr(payload);
      } catch (error) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const localMatch = await offlineDb.findStudentByQrToken(payload.qrCodeToken);
          const studentId = localMatch?.student?.id || payload.qrCodeToken;
          await syncEngine.enqueue(
            'finance',
            API_ENDPOINTS.SUBSCRIPTIONS.SCAN_QR,
            'POST',
            payload,
          );
          return {
            success: true,
            isDuplicate: false,
            isOfflineSaved: true,
            message: 'تم حفظ السداد محلياً بنجاح في انتظار الاتصال 💾',
            payment: {
              id: `offline-pay-${Date.now()}`,
              studentId,
              groupId: payload.groupId || null,
              periodYear: payload.periodYear || new Date().getFullYear(),
              periodMonth: payload.periodMonth || (new Date().getMonth() + 1),
              amountExpected: payload.amountPaid || 350,
              amountPaid: payload.amountPaid || 350,
              currency: 'EGP',
              paymentStatus: 'PAID' as any,
              paymentMethod: payload.paymentMethod || 'CASH',
              receiptNumber: payload.receiptNumber || null,
              recordedById: 'offline-teacher',
              notes: payload.notes || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            student: { id: studentId, fullName: localMatch?.student?.fullName || 'طالب' },
            group: null,
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
