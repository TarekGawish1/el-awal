import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMatrixLedger,
  fetchBillingConfiguration,
  updateBillingConfiguration,
  fetchFinanceAnalytics,
  fetchFinanceDashboardAnalytics,
  fetchFinanceInit,
} from '../api/finance.api';
import {
  FinanceAnalyticsResponse,
  FinanceDashboardResponse,
  FinanceInitResponse,
} from '../types/finance.types';
import { offlineDb } from '@/lib/offline/db';
import { financeKeys } from './financeKeys';

export function useFinanceInit(
  query: {
    academicPeriodId?: string;
    academicYear?: string;
    academicTerm?: string;
    stage?: string;
    gradeLevel?: string;
    groupId?: string;
    month?: number;
  },
  options?: { enabled?: boolean }
) {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const queryClient = useQueryClient();

  return useQuery<FinanceInitResponse>({
    queryKey: financeKeys.init(query),
    queryFn: async () => {
      const initData = await fetchFinanceInit(query);

      if (initData?.menus) {
        if (initData.menus.groups?.length) {
          queryClient.setQueryData(['groups', undefined], initData.menus.groups);
          offlineDb.bulkPutGroups(initData.menus.groups as any).catch(() => {});
        }
        if (initData.menus.booklets?.length) {
          queryClient.setQueryData(['booklets', undefined], initData.menus.booklets);
          offlineDb.bulkPutBooklets(initData.menus.booklets as any).catch(() => {});
        }
        if (initData.menus.academicPeriod) {
          queryClient.setQueryData(['teacher', 'academic-period'], initData.menus.academicPeriod);
        }
        if (initData.analytics) {
          queryClient.setQueryData(financeKeys.dashboardAnalytics(query), initData.analytics);
        }
      }

      return initData;
    },
    enabled: (options?.enabled ?? true) && isOnline,
    networkMode: 'online',
    staleTime: 30_000,
  });
}

export function useFinanceDashboardAnalytics(
  query: {
    academicPeriodId?: string;
    academicYear?: string;
    academicTerm?: string;
    stage?: string;
    gradeLevel?: string;
    groupId?: string;
    month?: number;
  },
  options?: { enabled?: boolean }
) {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const queryClient = useQueryClient();

  return useQuery<FinanceDashboardResponse>({
    queryKey: financeKeys.dashboardAnalytics(query),
    queryFn: async () => {
      try {
        const initData = await fetchFinanceInit(query);
        if (initData?.menus) {
          if (initData.menus.groups?.length) {
            queryClient.setQueryData(['groups', undefined], initData.menus.groups);
            offlineDb.bulkPutGroups(initData.menus.groups as any).catch(() => {});
          }
          if (initData.menus.booklets?.length) {
            queryClient.setQueryData(['booklets', undefined], initData.menus.booklets);
            offlineDb.bulkPutBooklets(initData.menus.booklets as any).catch(() => {});
          }
          if (initData.menus.academicPeriod) {
            queryClient.setQueryData(['teacher', 'academic-period'], initData.menus.academicPeriod);
          }
        }
        return initData.analytics;
      } catch {
        return fetchFinanceDashboardAnalytics(query);
      }
    },
    enabled: (options?.enabled ?? true) && isOnline,
    networkMode: 'online',
    staleTime: 30_000,
  });
}

export function useMatrixLedger(query: {
  gradeLevel?: string;
  academicPeriodId?: string;
  academicYear?: string;
  academicTerm?: string;
  groupId?: string;
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: financeKeys.matrixLedger(query),
    queryFn: () => fetchMatrixLedger(query),
    enabled: Boolean((query.stage && query.gradeLevel) || query.groupId),
    staleTime: 30_000,
  });
}

export function useFinanceAnalytics(
  query: {
    academicPeriodId?: string;
    academicYear?: string;
    academicTerm?: string;
    stage?: string;
    gradeLevel?: string;
    groupId?: string;
    periodMonth?: number;
  },
  options?: { enabled?: boolean }
) {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return useQuery<FinanceAnalyticsResponse>({
    queryKey: financeKeys.financeAnalytics(query),
    queryFn: () => fetchFinanceAnalytics(query),
    enabled: (options?.enabled ?? true) && isOnline,
    networkMode: 'online',
    staleTime: 30_000,
  });
}

export function useBillingConfiguration(academicYear: string, academicTerm: string) {
  return useQuery({
    queryKey: financeKeys.billingConfiguration(academicYear, academicTerm),
    queryFn: () => fetchBillingConfiguration({ academicYear, academicTerm }),
    enabled: Boolean(academicYear && academicTerm),
    staleTime: 60_000,
  });
}

export function useUpdateBillingConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBillingConfiguration,
    onSuccess: (data) => {
      queryClient.setQueryData(financeKeys.billingConfiguration(data.academicYear, data.academicTerm), data);
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}
