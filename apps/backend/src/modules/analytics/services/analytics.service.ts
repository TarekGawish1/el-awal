import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../../../core/database/prisma.service";
import { GeoLocationService } from "./geo-location.service";
import {
  TrackPageViewDto,
  AnalyticsQueryDto,
  StartSessionDto,
  PingSessionDto,
  GeoRankingQueryDto,
  LandingStatsQueryDto,
  StudentRankingQueryDto,
  VisitorListQueryDto,
  AnalyticsOverviewQueryDto,
} from "../dto/analytics.dto";
import {
  RecordPageViewParams,
  AnalyticsStatsResponse,
  GeoRankingItem,
  StudentLeaderboardItem,
  IndividualVisitItem,
  ParentLinkedChild,
  VisitorListItem,
  VisitorListResponse,
  AnalyticsOverviewResponse,
} from "../types/analytics.types";
import { TelemetryIngestionService } from "./telemetry-ingestion.service";
import { DashboardOverviewService } from "./dashboard-overview.service";
import { GeoAnalyticsService } from "./geo-analytics.service";
import { StudentAnalyticsService } from "./student-analytics.service";
import { VisitorAnalyticsService } from "./visitor-analytics.service";
import { FinancialAnalyticsService } from "./financial-analytics.service";
import { CourseAnalyticsService } from "./course-analytics.service";
import {
  getCairoMidnight,
  resolveDateRange,
  getExcludedTeacherHashes,
} from "../helpers/analytics-date.helper";
import {
  parseUserAgentString,
  calculateVisitorDuration,
  formatDurationArabic,
  calculateTotalActiveDuration,
} from "../helpers/visitor-analytics.helper";

export type * from "../types/analytics.types";

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly telemetryIngestion: TelemetryIngestionService;
  private readonly dashboardOverview: DashboardOverviewService;
  private readonly geoAnalytics: GeoAnalyticsService;
  private readonly studentAnalytics: StudentAnalyticsService;
  private readonly visitorAnalytics: VisitorAnalyticsService;
  private readonly financialAnalytics: FinancialAnalyticsService;
  private readonly courseAnalytics: CourseAnalyticsService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoLocationService: GeoLocationService,
    @Optional() telemetryIngestion?: TelemetryIngestionService,
    @Optional() dashboardOverview?: DashboardOverviewService,
    @Optional() geoAnalytics?: GeoAnalyticsService,
    @Optional() studentAnalytics?: StudentAnalyticsService,
    @Optional() visitorAnalytics?: VisitorAnalyticsService,
    @Optional() financialAnalytics?: FinancialAnalyticsService,
    @Optional() courseAnalytics?: CourseAnalyticsService,
  ) {
    this.telemetryIngestion =
      telemetryIngestion ??
      new TelemetryIngestionService(this.prisma, this.geoLocationService);
    this.geoAnalytics =
      geoAnalytics ??
      new GeoAnalyticsService(this.prisma, this.geoLocationService);
    this.studentAnalytics =
      studentAnalytics ?? new StudentAnalyticsService(this.prisma);
    this.visitorAnalytics =
      visitorAnalytics ??
      new VisitorAnalyticsService(this.prisma, this.geoLocationService);
    this.dashboardOverview =
      dashboardOverview ??
      new DashboardOverviewService(
        this.prisma,
        this.geoAnalytics,
        this.studentAnalytics,
        this.visitorAnalytics,
      );
    this.financialAnalytics =
      financialAnalytics ?? new FinancialAnalyticsService(this.prisma);
    this.courseAnalytics =
      courseAnalytics ?? new CourseAnalyticsService(this.prisma);
  }

  async onModuleInit() {
    this.telemetryIngestion.onModuleInit();
  }

  async onModuleDestroy() {
    await this.telemetryIngestion.onModuleDestroy();
  }

  public async flushBuffers(): Promise<void> {
    return this.telemetryIngestion.flushBuffers();
  }

  public generateVisitorHash(
    ip?: string,
    userAgent?: string,
    visitorId?: string,
  ): string {
    return this.telemetryIngestion.generateVisitorHash(ip, userAgent, visitorId);
  }

  public async recordPageView(params: RecordPageViewParams): Promise<void> {
    return this.telemetryIngestion.recordPageView(params);
  }

  public async startSession(
    userId: string,
    dto: StartSessionDto,
    ipAddress?: string,
    userAgent?: string,
    headers: Record<string, any> = {},
  ): Promise<{ sessionId: string; country: string; city: string }> {
    return this.telemetryIngestion.startSession(
      userId,
      dto,
      ipAddress,
      userAgent,
      headers,
    );
  }

  public async pingSession(
    dto: PingSessionDto,
  ): Promise<{ success: boolean; totalDurationSeconds: number }> {
    return this.telemetryIngestion.pingSession(dto);
  }

  public async recordPageEngagement(params: {
    visitorId?: string;
    path: string;
    durationSeconds: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; duration: number }> {
    return this.telemetryIngestion.recordPageEngagement(params);
  }

  public getCairoMidnight(date: Date = new Date()): {
    startOfToday: Date;
    endOfToday: Date;
  } {
    return getCairoMidnight(date);
  }

  public resolveDateRange(
    range: string = "week",
    from?: string,
    to?: string,
  ): { startDate: Date; endDate: Date } {
    return resolveDateRange(range, from, to);
  }

  public async getExcludedTeacherHashes(): Promise<string[]> {
    return getExcludedTeacherHashes(this.prisma);
  }

  public async getOverview(
    query: AnalyticsOverviewQueryDto,
    userTenantId?: string,
  ): Promise<AnalyticsOverviewResponse> {
    return this.dashboardOverview.getOverview(query, userTenantId);
  }

  public async getStats(
    query: AnalyticsQueryDto,
    userTenantId?: string,
  ): Promise<AnalyticsStatsResponse> {
    return this.dashboardOverview.getStats(query, userTenantId);
  }

  public async getLandingStats(
    query: LandingStatsQueryDto,
  ): Promise<{ totalViews: number; uniqueVisitors: number }> {
    return this.dashboardOverview.getLandingStats(query);
  }

  public async getGeoRanking(
    query: GeoRankingQueryDto,
    userTenantId?: string,
  ): Promise<{
    items: GeoRankingItem[];
    totalVisits: number;
    groupBy: "country" | "city";
  }> {
    return this.geoAnalytics.getGeoRanking(query, userTenantId);
  }

  public async getStudentEngagementLeaderboard(
    query: StudentRankingQueryDto,
    userTenantId?: string,
  ): Promise<{
    students: StudentLeaderboardItem[];
    sortBy: "duration" | "visits";
  }> {
    return this.studentAnalytics.getStudentEngagementLeaderboard(
      query,
      userTenantId,
    );
  }

  public parseUserAgentString(ua: string = ""): {
    device: "Desktop" | "Mobile" | "Tablet";
    os: string;
    browser: string;
  } {
    return parseUserAgentString(ua);
  }

  public calculateVisitorDuration(
    views: { createdAt: Date | string; metadata?: any }[],
    sessionsDuration: number = 0,
  ): number {
    return calculateVisitorDuration(views, sessionsDuration);
  }

  public formatDurationArabic(seconds: number = 0): string {
    return formatDurationArabic(seconds);
  }

  public async calculateTotalActiveDuration(
    where: any,
    startDate: Date,
    endDate: Date,
  ): Promise<{ totalDurationSeconds: number; avgDurationSeconds: number }> {
    return calculateTotalActiveDuration(this.prisma, where, startDate, endDate);
  }

  public async getVisitorsList(
    query: VisitorListQueryDto,
    userTenantId?: string,
  ): Promise<VisitorListResponse> {
    return this.visitorAnalytics.getVisitorsList(query, userTenantId);
  }

  // Financial and Course Analytics accessors
  public get financial(): FinancialAnalyticsService {
    return this.financialAnalytics;
  }

  public get courses(): CourseAnalyticsService {
    return this.courseAnalytics;
  }
}
