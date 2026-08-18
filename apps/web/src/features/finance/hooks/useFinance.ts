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
    mutationFn: (payload: RecordPaymentPayload) => recordPayment(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.payments() });
      queryClient.invalidateQueries({ queryKey: financeKeys.studentHistory(variables.studentId) });
      if (variables.groupId) {
        queryClient.invalidateQueries({ 
          queryKey: financeKeys.defaulters(variables.groupId, variables.periodYear, variables.periodMonth) 
        });
      }
    },
  });
}

export function useScanPaymentQr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ScanPaymentQrPayload) => scanPaymentQr(payload),
    onSuccess: (data, variables) => {
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
