import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { AnalyticsQueryParams, AnalyticsStatsData } from '../types/analytics.types';

/**
 * Fetches consolidated web analytics and telemetry statistics.
 */
export async function fetchAnalyticsStats(params: AnalyticsQueryParams): Promise<AnalyticsStatsData> {
  const queryRecord: Record<string, string | undefined> = {
    scope: params.scope,
    range: params.range,
    from: params.from,
    to: params.to,
    tenantId: params.tenantId,
  };

  // Remove undefined properties
  const cleanParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(queryRecord)) {
    if (value !== undefined && value !== '') {
      cleanParams[key] = value;
    }
  }

  const response = await apiClient<AnalyticsStatsData>(API_ENDPOINTS.ANALYTICS.STATS, {
    params: cleanParams,
  });

  return response;
}
