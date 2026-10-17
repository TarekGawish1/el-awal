import { TrackPageViewDto } from "../dto/analytics.dto";

export interface RecordPageViewParams extends TrackPageViewDto {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  headers?: Record<string, any>;
}

export interface AnalyticsStatsResponse {
  summary: {
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
    studentsCount?: number;
    parentsCount?: number;
    guestsCount?: number;
  };

  timeSeries: {
    date: string;
    label: string;
    totalViews: number;
    uniqueVisitors: number;
    landingViews: number;
    systemViews: number;
  }[];
  topPages: {
    path: string;
    isLandingPage: boolean;
    views: number;
    percentage: number;
  }[];
  devices: {
    device: "Desktop" | "Mobile" | "Tablet";
    labelAr: string;
    count: number;
    percentage: number;
  }[];
  osBreakdown?: {
    os: string;
    labelAr: string;
    count: number;
    percentage: number;
  }[];
  browserBreakdown?: {
    browser: string;
    labelAr: string;
    count: number;
    percentage: number;
  }[];
  filters: {
    scope: "landing" | "system" | "all";
    range: string;
    startDate: string;
    endDate: string;
  };
}

export interface GeoRankingItem {
  rank: number;
  name: string;
  countryCode?: string;
  visitCount: number;
  uniqueVisitors: number;
  percentage: number;
}

export interface StudentLeaderboardItem {
  rank: number;
  userId: string;
  studentName: string;
  studentCode: string;
  phone?: string;
  gradeLevel?: string;
  role?: "STUDENT" | "PARENT";
  relationshipType?: string;
  linkedStudentName?: string;
  city: string;
  country: string;
  totalSessions: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  lastActiveAt: string;
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

export interface ParentLinkedChild {
  studentName: string;
  studentCode?: string;
  gradeLevel?: string;
  phone?: string;
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
    parentInfo?: {
      relationshipType?: string | null;
      children: ParentLinkedChild[];
    } | null;
  } | null;
  country: string;
  city: string;
  device: "Desktop" | "Mobile" | "Tablet";
  os: string;
  browser: string;
  topPages: string[];
  visits: IndividualVisitItem[];
}

export interface VisitorListResponse {
  visitors: VisitorListItem[];
  totalVisitors: number;
  studentsCount?: number;
  parentsCount?: number;
  guestsCount?: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  avgDurationFormatted: string;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnalyticsOverviewResponse {
  stats: AnalyticsStatsResponse;
  geoRanking: {
    items: GeoRankingItem[];
    totalVisits: number;
    groupBy: "country" | "city";
  };
  leaderboard: {
    students: StudentLeaderboardItem[];
    sortBy: "duration" | "visits";
  };
  visitors: VisitorListResponse;
}
