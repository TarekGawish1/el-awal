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
  newVisitors?: number;
  returningVisitors?: number;
  totalDurationSeconds?: number;
  totalDurationFormatted?: string;
  avgDurationPerVisitorFormatted?: string;
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

export interface AnalyticsOsBreakdown {
  os: string;
  labelAr: string;
  count: number;
  percentage: number;
}

export interface AnalyticsBrowserBreakdown {
  browser: string;
  labelAr: string;
  count: number;
  percentage: number;
}

export interface AnalyticsStatsData {
  summary: AnalyticsSummary;
  timeSeries: AnalyticsTimeSeriesPoint[];
  topPages: AnalyticsTopPage[];
  devices: AnalyticsDeviceBreakdown[];
  osBreakdown?: AnalyticsOsBreakdown[];
  browserBreakdown?: AnalyticsBrowserBreakdown[];
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

export interface IndividualVisitItem {
  id: string;
  path: string;
  isLandingPage: boolean;
  createdAt: string;
  referrer?: string | null;
  userAgent?: string | null;
  city?: string;
  country?: string;
  durationSeconds?: number;
  durationFormatted?: string;
}

export interface VisitorListItem {
  visitorHash: string;
  shortHash: string;
  totalVisits: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  firstSeenAt: string;
  lastSeenAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    studentCode?: string;
    gradeLevel?: string;
  } | null;
  country: string;
  city: string;
  device: 'Desktop' | 'Mobile' | 'Tablet';
  os: string;
  browser: string;
  topPages: string[];
  visits: IndividualVisitItem[];
}

export interface VisitorListResponse {
  visitors: VisitorListItem[];
  totalVisitors: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  avgDurationFormatted: string;
  page: number;
  limit: number;
  totalPages: number;
}


export interface VisitorListParams {
  scope?: AnalyticsScope;
  range?: AnalyticsRange;
  from?: string;
  to?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'recent' | 'visits';
}

