import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchAnalyticsStats,
  fetchGeoRanking,
  fetchStudentLeaderboard,
  fetchLandingStats,
} from '../api/analytics.api';
import {
  AnalyticsQueryParams,
  AnalyticsStatsData,
  GeoRankingParams,
  GeoRankingResponse,
  StudentLeaderboardParams,
  StudentLeaderboardResponse,
  LandingStatsResponse,
} from '../types/analytics.types';
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
    queryKey: ['analytics-student-ranking', params.sortBy, params.range, params.from, params.to, params.tenantId, params.limit],
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
