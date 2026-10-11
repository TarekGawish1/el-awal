import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { AuditLogItem, AuditStats, PerformerItem, AuditQueryParams } from '../types/audit.types';

export function useAuditLogs(params: AuditQueryParams) {
  const queryClient = useQueryClient();
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));
  if (params.search) queryParams.set('search', params.search);
  if (params.action) queryParams.set('action', params.action);
  if (params.entityType) queryParams.set('entityType', params.entityType);
  if (params.userId) queryParams.set('userId', params.userId);
  if (params.userRole) queryParams.set('userRole', params.userRole);
  if (params.startDate) queryParams.set('startDate', params.startDate);
  if (params.endDate) queryParams.set('endDate', params.endDate);

  const overviewQuery = useQuery({
    queryKey: ['audit-logs-overview', params],
    queryFn: async () => {
      const url = `${API_ENDPOINTS.AUDIT_LOGS.OVERVIEW}?${queryParams.toString()}`;
      const res = await apiClient<{
        data: AuditLogItem[];
        meta: { total: number; page: number; limit: number; totalPages: number };
        stats: AuditStats;
        performers: PerformerItem[];
      }>(url);

      // Seed individual sub-caches for compatibility
      queryClient.setQueryData(['audit-logs', params], {
        data: res.data,
        meta: res.meta,
      });
      queryClient.setQueryData(['audit-logs-stats'], res.stats);
      queryClient.setQueryData(['audit-performers'], res.performers);

      return res;
    },
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
  });

  return {
    logs: overviewQuery.data?.data || [],
    meta: overviewQuery.data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
    isLoadingLogs: overviewQuery.isLoading,
    isFetchingLogs: overviewQuery.isFetching,
    stats: overviewQuery.data?.stats,
    isLoadingStats: overviewQuery.isLoading,
    performers: overviewQuery.data?.performers || [],
    isLoadingPerformers: overviewQuery.isLoading,
    refetchLogs: overviewQuery.refetch,
  };
}
