import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchPayments,
  fetchStudentPaymentHistory,
  fetchGroupDefaulters,
} from '../api/finance.api';
import {
  PaymentQuery,
  DefaultersResponse,
  StudentPaymentRecord,
} from '../types/finance.types';
import { offlineDb } from '@/lib/offline/db';
import { financeKeys } from './financeKeys';

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
          offlineDb.bulkPutPayments(result.data as any);
        }
        return result;
      } catch {
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
        try {
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
        } catch {
          return {
            groupId,
            groupName: 'المجموعة الدراسية',
            periodYear: year,
            periodMonth: month,
            totalEnrolled: 0,
            totalDefaulters: 0,
            defaulters: [],
          };
        }
      }
      try {
        return await fetchGroupDefaulters(groupId, year, month);
      } catch (err) {
        console.warn('fetchGroupDefaulters error, using fallback:', err);
        try {
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
        } catch {
          return {
            groupId,
            groupName: 'المجموعة الدراسية',
            periodYear: year,
            periodMonth: month,
            totalEnrolled: 0,
            totalDefaulters: 0,
            defaulters: [],
          };
        }
      }
    },
    enabled: !!groupId && !!year && !!month,
    staleTime: 30_000,
  });
}
