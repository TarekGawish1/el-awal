import { apiClient } from '@/lib/api/client';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  AnalyticsQueryParams,
  AnalyticsStatsData,
  GeoRankingParams,
  GeoRankingResponse,
  StudentLeaderboardParams,
  StudentLeaderboardResponse,
  LandingStatsResponse,
} from '../types/analytics.types';

/**
 * Clean query params record removing undefined/empty values.
 */
function cleanParams(obj: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * Fetches consolidated web analytics and telemetry statistics.
 */
export async function fetchAnalyticsStats(params: AnalyticsQueryParams): Promise<AnalyticsStatsData> {
  return apiClient<AnalyticsStatsData>(API_ENDPOINTS.ANALYTICS.STATS, {
    params: cleanParams(params),
  });
}

/**
 * Fetches geographic ranking breakdown (top countries or governorates/cities).
 */
export async function fetchGeoRanking(params: GeoRankingParams): Promise<GeoRankingResponse> {
  return apiClient<GeoRankingResponse>(API_ENDPOINTS.ANALYTICS.GEO_RANKING, {
    params: cleanParams(params),
  });
}

/**
 * Fetches student engagement leaderboard ranked by active time or visit frequency.
 */
export async function fetchStudentLeaderboard(
  params: StudentLeaderboardParams,
): Promise<StudentLeaderboardResponse> {
  return apiClient<StudentLeaderboardResponse>(API_ENDPOINTS.ANALYTICS.STUDENT_RANKING, {
    params: cleanParams(params),
  });
}

/**
 * Fetches public landing page overview metrics (views and unique visitors).
 */
export async function fetchLandingStats(params: {
  range?: string;
  from?: string;
  to?: string;
}): Promise<LandingStatsResponse> {
  return apiClient<LandingStatsResponse>(API_ENDPOINTS.ANALYTICS.LANDING, {
    params: cleanParams(params),
  });
}

/**
 * Starts an authenticated student or user activity tracking session.
 */
export async function startUserSession(
  tenantId?: string,
  geo?: { city?: string; country?: string },
): Promise<{ sessionId: string; country: string; city: string }> {
  return apiClient<{ sessionId: string; country: string; city: string }>(
    API_ENDPOINTS.ANALYTICS.SESSION_START,
    {
      method: 'POST',
      body: JSON.stringify({
        tenantId,
        city: geo?.city,
        country: geo?.country,
      }),
    },
  );
}

/**
 * Pings active session heartbeat to increment active duration.
 */
export async function pingUserSession(
  sessionId: string,
  elapsedSeconds: number = 30,
): Promise<{ success: boolean; totalDurationSeconds: number }> {
  return apiClient<{ success: boolean; totalDurationSeconds: number }>(
    API_ENDPOINTS.ANALYTICS.SESSION_PING,
    {
      method: 'POST',
      body: JSON.stringify({ sessionId, elapsedSeconds }),
    },
  );
}
