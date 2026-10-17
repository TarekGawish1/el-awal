import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  fetchAnalyticsOverview,
  fetchAnalyticsStats,
  fetchGeoRanking,
  fetchStudentLeaderboard,
  fetchLandingStats,
  fetchVisitorsList,
} from '../api/analytics.api';
import {
  AnalyticsQueryParams,
  AnalyticsStatsData,
  GeoRankingParams,
  GeoRankingResponse,
  StudentLeaderboardParams,
  StudentLeaderboardResponse,
  LandingStatsResponse,
  VisitorListParams,
  VisitorListResponse,
  AnalyticsOverviewParams,
  AnalyticsOverviewResponse,
} from '../types/analytics.types';
import { useOnlineStatus } from '@/lib/offline/use-online-status';

export function useAnalyticsOverview(params: AnalyticsOverviewParams) {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();

  return useQuery<AnalyticsOverviewResponse>({
    queryKey: [
      'analytics-overview',
      params.scope,
      params.range,
      params.from,
      params.to,
      params.tenantId,
      params.geoGroupBy,
      params.leaderboardSortBy,
    ],
    queryFn: async () => {
      const data = await fetchAnalyticsOverview(params);

      // Seed all sub-caches so child cards render without triggering additional network requests
      const geoScope = params.scope === 'system' ? 'platform' : (params.scope || 'all');
      const geoGroup = params.geoGroupBy || 'city';
      const lbSort = params.leaderboardSortBy || 'duration';
      const lbLimit = params.leaderboardLimit || 15;
      const vPage = params.visitorPage || 1;
      const vLimit = params.visitorLimit || 10;

      queryClient.setQueryData(
        ['analytics-stats', params.scope, params.range, params.from, params.to, params.tenantId],
        data.stats,
      );

      queryClient.setQueryData(
        ['analytics-geo-ranking', geoScope, geoGroup, params.range, params.from, params.to, params.tenantId],
        data.geoRanking,
      );

      queryClient.setQueryData(
        ['analytics-student-ranking', lbSort, params.range, params.from, params.to, params.tenantId, lbLimit],
        data.leaderboard,
      );

      queryClient.setQueryData(
        [
          'analytics-visitors-list',
          params.scope,
          params.range,
          params.from,
          params.to,
          vPage,
          vLimit,
          undefined,
          'recent',
          params.tenantId,
        ],
        data.visitors,
      );

      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: isOnline ? 60 * 1000 : false,
    enabled: isOnline,
  });
}

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

export function useGeoRanking(params: GeoRankingParams) {
  const isOnline = useOnlineStatus();

  return useQuery<GeoRankingResponse>({
    queryKey: ['analytics-geo-ranking', params.scope, params.groupBy, params.range, params.from, params.to, params.tenantId],
    queryFn: () => fetchGeoRanking(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: isOnline ? 60 * 1000 : false,
    enabled: isOnline,
  });
}

export function useStudentLeaderboard(params: StudentLeaderboardParams) {
  const isOnline = useOnlineStatus();

  return useQuery<StudentLeaderboardResponse>({
    queryKey: ['analytics-student-ranking', params.sortBy, params.range, params.from, params.to, params.tenantId, params.limit, params.role],
    queryFn: () => fetchStudentLeaderboard(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: isOnline ? 60 * 1000 : false,
    enabled: isOnline,
  });
}

export function useLandingStats(params: { range?: string; from?: string; to?: string }) {
  const isOnline = useOnlineStatus();

  return useQuery<LandingStatsResponse>({
    queryKey: ['analytics-landing-stats', params.range, params.from, params.to],
    queryFn: () => fetchLandingStats(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: isOnline ? 60 * 1000 : false,
    enabled: isOnline,
  });
}

export function useVisitorsList(params: VisitorListParams) {
  const isOnline = useOnlineStatus();

  return useQuery<VisitorListResponse>({
    queryKey: [
      'analytics-visitors-list',
      params.scope,
      params.range,
      params.from,
      params.to,
      params.page,
      params.limit,
      params.search,
      params.sortBy,
      params.tenantId,
      params.role,
    ],
    queryFn: () => fetchVisitorsList(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: isOnline ? 60 * 1000 : false,
    enabled: isOnline,
  });
}

