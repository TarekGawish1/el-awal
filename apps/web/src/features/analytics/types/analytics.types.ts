export type AnalyticsScope = 'landing' | 'system' | 'all';
export type AnalyticsRange = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
export type GeoGroupBy = 'country' | 'city';
export type StudentLeaderboardSort = 'duration' | 'visits';

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

export interface GeoRankingItem {
  rank: number;
  name: string;
  countryCode?: string;
  visitCount: number;
  uniqueVisitors: number;
  percentage: number;
}

export interface GeoRankingResponse {
  items: GeoRankingItem[];
  totalVisits: number;
  groupBy: GeoGroupBy;
}

export interface GeoRankingParams {
  scope?: 'landing' | 'platform' | 'all';
  groupBy?: GeoGroupBy;
  range?: AnalyticsRange;
  from?: string;
  to?: string;
  tenantId?: string;
}

export interface StudentLeaderboardItem {
  rank: number;
  userId: string;
  studentName: string;
  studentCode: string;
  phone?: string;
  gradeLevel?: string;
  city: string;
  country: string;
  totalSessions: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  lastActiveAt: string;
}

export interface StudentLeaderboardResponse {
  students: StudentLeaderboardItem[];
  sortBy: StudentLeaderboardSort;
}

export interface StudentLeaderboardParams {
  sortBy?: StudentLeaderboardSort;
  range?: AnalyticsRange;
  from?: string;
  to?: string;
  tenantId?: string;
  limit?: number;
}

export interface LandingStatsResponse {
  totalViews: number;
  uniqueVisitors: number;
}
