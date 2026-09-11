import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchAnalyticsStats } from '../api/analytics.api';
import { AnalyticsQueryParams, AnalyticsStatsData } from '../types/analytics.types';
import { useOnlineStatus } from '@/lib/offline/use-online-status';

export function useAnalyticsStats(params: AnalyticsQueryParams) {
  const isOnline = useOnlineStatus();

  return useQuery<AnalyticsStatsData>({
    queryKey: ['analytics-stats', params.scope, params.range, params.from, params.to, params.tenantId],
    queryFn: () => fetchAnalyticsStats(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: isOnline ? 60 * 1000 : false,
    enabled: isOnline,
  });
}
