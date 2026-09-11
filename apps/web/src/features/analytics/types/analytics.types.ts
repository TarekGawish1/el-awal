export type AnalyticsScope = 'landing' | 'system' | 'all';
export type AnalyticsRange = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  landingViews: number;
  systemViews: number;
  viewsPerVisitor: number;
}

export interface AnalyticsTimeSeriesPoint {
  date: string;
  label: string;
  totalViews: number;
  uniqueVisitors: number;
  landingViews: number;
  systemViews: number;
}

export interface AnalyticsTopPage {
  path: string;
  isLandingPage: boolean;
  views: number;
  percentage: number;
}

export interface AnalyticsDeviceBreakdown {
  device: 'Desktop' | 'Mobile' | 'Tablet';
  labelAr: string;
  count: number;
  percentage: number;
}

export interface AnalyticsStatsData {
  summary: AnalyticsSummary;
  timeSeries: AnalyticsTimeSeriesPoint[];
  topPages: AnalyticsTopPage[];
  devices: AnalyticsDeviceBreakdown[];
  filters: {
    scope: AnalyticsScope;
    range: AnalyticsRange;
    startDate: string;
    endDate: string;
  };
}

export interface AnalyticsQueryParams {
  scope?: AnalyticsScope;
  range?: AnalyticsRange;
  from?: string;
  to?: string;
  tenantId?: string;
}
