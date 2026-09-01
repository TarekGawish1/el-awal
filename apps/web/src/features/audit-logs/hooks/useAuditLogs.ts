import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { AuditLogItem, AuditStats, PerformerItem, AuditQueryParams } from '../types/audit.types';

export function useAuditLogs(params: AuditQueryParams) {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.search) queryParams.set('search', params.search);
  if (params.action) queryParams.set('action', params.action);
  if (params.entityType) queryParams.set('entityType', params.entityType);
  if (params.userId) queryParams.set('userId', params.userId);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);

  const logsQuery = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const url = `/audit-logs?${queryParams.toString()}`;
      const res = await apiClient<{
        data: AuditLogItem[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(url);
      return res;
    },
    placeholderData: (prev) => prev,
  });

  const statsQuery = useQuery({
    queryKey: ['audit-logs-stats'],
    queryFn: async () => {
      const res = await apiClient<AuditStats>('/audit-logs/stats');
      return res;
    },
    staleTime: 60 * 1000,
  });

  const performersQuery = useQuery({
    queryKey: ['audit-performers'],
    queryFn: async () => {
      const res = await apiClient<PerformerItem[]>('/audit-logs/performers');
      return res;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    logs: logsQuery.data?.data || [],
    meta: logsQuery.data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
    isLoadingLogs: logsQuery.isLoading,
    isFetchingLogs: logsQuery.isFetching,
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    performers: performersQuery.data || [],
    isLoadingPerformers: performersQuery.isLoading,
    refetchLogs: logsQuery.refetch,
  };
}
