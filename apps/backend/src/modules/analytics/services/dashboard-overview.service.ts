import { Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "../../../core/database/prisma.service";
import { RedisCacheService } from "../../../core/cache/redis-cache.service";
import { GeoAnalyticsService } from "./geo-analytics.service";
import { StudentAnalyticsService } from "./student-analytics.service";
import { VisitorAnalyticsService } from "./visitor-analytics.service";
import {
  AnalyticsOverviewQueryDto,
  AnalyticsQueryDto,
  LandingStatsQueryDto,
} from "../dto/analytics.dto";
import {
  AnalyticsOverviewResponse,
  AnalyticsStatsResponse,
} from "../types/analytics.types";
import {
  resolveDateRange,
  getExcludedTeacherHashes,
  buildTenantTelemetryCondition,
} from "../helpers/analytics-date.helper";
import { buildTimeSeries, buildEnhancedDeviceBreakdown } from "../helpers/analytics-breakdown.helper";
import { formatDurationArabic, calculateTotalActiveDuration } from "../helpers/visitor-analytics.helper";
import { UserRole } from "@prisma/client";

@Injectable()
export class DashboardOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoAnalyticsService: GeoAnalyticsService,
    private readonly studentAnalyticsService: StudentAnalyticsService,
    private readonly visitorAnalyticsService: VisitorAnalyticsService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  public async getOverview(
    query: AnalyticsOverviewQueryDto,
    userTenantId?: string,
  ): Promise<AnalyticsOverviewResponse> {
    const cacheKey = `analytics:overview:${userTenantId || 'global'}:${JSON.stringify(query)}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<AnalyticsOverviewResponse>(cacheKey);
      if (cached) return cached;
    }

    const geoScope = query.scope === "system" ? "platform" : (query.scope as any);

    const [stats, geoRanking, leaderboard, visitors] = await Promise.all([
      this.getStats(
        {
          scope: query.scope,
          range: query.range,
          from: query.from,
          to: query.to,
          tenantId: query.tenantId,
        },
        userTenantId,
      ),
      this.geoAnalyticsService.getGeoRanking(
        {
          scope: geoScope,
          groupBy: query.geoGroupBy || "city",
          range: query.range,
          from: query.from,
          to: query.to,
          tenantId: query.tenantId,
        },
        userTenantId,
      ),
      this.studentAnalyticsService.getStudentEngagementLeaderboard(
        {
          sortBy: query.leaderboardSortBy || "duration",
          range: query.range,
          from: query.from,
          to: query.to,
          limit: query.leaderboardLimit || 15,
          tenantId: query.tenantId,
          role: query.leaderboardRole || "STUDENT",
        },
        userTenantId,
      ),
      this.visitorAnalyticsService.getVisitorsList(
        {
          scope: query.scope,
          range: query.range,
          from: query.from,
          to: query.to,
          page: query.visitorPage || 1,
          limit: query.visitorLimit || 10,
          sortBy: "recent",
          tenantId: query.tenantId,
          role: query.visitorRole || "ALL",
        },
        userTenantId,
      ),
    ]);

    const result: AnalyticsOverviewResponse = {
      stats,
      geoRanking,
      leaderboard,
      visitors,
    };

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, result, 180);
    }

    return result;
  }

  public async getStats(
    query: AnalyticsQueryDto,
    userTenantId?: string,
  ): Promise<AnalyticsStatsResponse> {
    const scope = query.scope || "all";
    const range = query.range || "week";
    const { startDate, endDate } = resolveDateRange(
      range,
      query.from,
      query.to,
    );

    const baseDateCondition = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    let scopeCondition: any = {};
    const effectiveTenantId = query.tenantId || userTenantId;
    const tenantCondition = buildTenantTelemetryCondition(effectiveTenantId);

    if (scope === "landing") {
      scopeCondition = { isLandingPage: true };
    } else if (scope === "system") {
      scopeCondition = {
        isLandingPage: false,
        ...tenantCondition,
      };
    } else {
      if (effectiveTenantId) {
        scopeCondition = {
          OR: [
            { isLandingPage: true },
            { isLandingPage: false, ...tenantCondition },
          ],
        };
      }
    }

    const excludedTeacherHashes = await getExcludedTeacherHashes(this.prisma);
    const teacherExclusion = {
      ...(excludedTeacherHashes.length > 0
        ? { visitorHash: { notIn: excludedTeacherHashes } }
        : {}),
      NOT: [
        { user: { role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] } } },
        { path: { startsWith: "/teacher" } },
        { path: { startsWith: "/secretariat" } },
        { path: { startsWith: "/assistant" } },
      ],
    };

    const where = {
      ...baseDateCondition,
      ...scopeCondition,
      ...teacherExclusion,
    };

    const totalViews = await this.prisma.pageView.count({ where });

    const uniqueGroups = await this.prisma.pageView.groupBy({
      by: ["visitorHash"],
      where,
    });
    const uniqueVisitors = uniqueGroups.length;

    const landingWhere = {
      ...baseDateCondition,
      isLandingPage: true,
      ...teacherExclusion,
    };
    const systemWhere = {
      ...baseDateCondition,
      isLandingPage: false,
      ...tenantCondition,
      ...teacherExclusion,
    };

    const [landingViews, systemViews] = await Promise.all([
      scope === "system"
        ? 0
        : this.prisma.pageView.count({ where: landingWhere }),
      scope === "landing"
        ? 0
        : this.prisma.pageView.count({ where: systemWhere }),
    ]);

    const viewsPerVisitor =
      uniqueVisitors > 0 ? Number((totalViews / uniqueVisitors).toFixed(1)) : 0;

    const topPagesGroup = await this.prisma.pageView.groupBy({
      by: ["path", "isLandingPage"],
      where,
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 8,
    });

    const topPages = topPagesGroup.map((item) => ({
      path: item.path,
      isLandingPage: item.isLandingPage,
      views: item._count.path,
      percentage:
        totalViews > 0 ? Math.round((item._count.path / totalViews) * 100) : 0,
    }));

    const timeSeries = await buildTimeSeries(
      this.prisma,
      where,
      range,
      startDate,
      endDate,
    );
    const { devices, osBreakdown, browserBreakdown } =
      await buildEnhancedDeviceBreakdown(this.prisma, where, totalViews);

    const visitCountGroups = await this.prisma.pageView.groupBy({
      by: ["visitorHash"],
      where,
      _count: { visitorHash: true },
    });
    const newVisitors = visitCountGroups.filter(
      (g) => g._count.visitorHash === 1,
    ).length;
    const returningVisitors = visitCountGroups.filter(
      (g) => g._count.visitorHash > 1,
    ).length;

    const { totalDurationSeconds, avgDurationSeconds } =
      await calculateTotalActiveDuration(this.prisma, where, startDate, endDate);
    const totalDurationFormatted =
      formatDurationArabic(totalDurationSeconds);
    const avgDurationPerVisitorFormatted =
      formatDurationArabic(avgDurationSeconds);

    const pageViewUsers = await this.prisma.pageView.findMany({
      where: {
        ...where,
        userId: { not: null },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
      distinct: ["userId"],
    });

    let sessionUsers: { userId: string; user: { id: string; role: UserRole } }[] = [];
    if (scope !== "landing") {
      sessionUsers = await this.prisma.userSession.findMany({
        where: {
          startedAt: { gte: startDate, lte: endDate },
          ...tenantCondition,
          user: {
            role: { in: [UserRole.STUDENT, UserRole.PARENT] },
          },
        },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              role: true,
            },
          },
        },
        distinct: ["userId"],
      });
    }

    const studentUserIds = new Set<string>();
    const parentUserIds = new Set<string>();

    for (const pu of pageViewUsers) {
      if (pu.user?.role === UserRole.STUDENT) studentUserIds.add(pu.userId!);
      else if (pu.user?.role === UserRole.PARENT) parentUserIds.add(pu.userId!);
    }

    for (const su of sessionUsers) {
      if (su.user?.role === UserRole.STUDENT) studentUserIds.add(su.userId);
      else if (su.user?.role === UserRole.PARENT) parentUserIds.add(su.userId);
    }

    const studentsCount = studentUserIds.size;
    const parentsCount = parentUserIds.size;
    const registeredCount = studentsCount + parentsCount;
    const guestsCount = Math.max(0, uniqueVisitors - registeredCount);

    return {
      summary: {
        totalViews,
        uniqueVisitors,
        landingViews,
        systemViews,
        viewsPerVisitor,
        newVisitors,
        returningVisitors,
        totalDurationSeconds,
        totalDurationFormatted,
        avgDurationPerVisitorFormatted,
        studentsCount,
        parentsCount,
        guestsCount,
      },

      timeSeries,
      topPages,
      devices,
      osBreakdown,
      browserBreakdown,
      filters: {
        scope,
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  public async getLandingStats(
    query: LandingStatsQueryDto,
  ): Promise<{ totalViews: number; uniqueVisitors: number }> {
    const { startDate, endDate } = resolveDateRange(
      query.range,
      query.from,
      query.to,
    );
    const excludedTeacherHashes = await getExcludedTeacherHashes(this.prisma);

    const where = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(excludedTeacherHashes.length > 0
        ? { visitorHash: { notIn: excludedTeacherHashes } }
        : {}),
    };

    const [totalLandingViews, uniqueLandingVisitors] = await Promise.all([
      this.prisma.landingVisit.count({ where }),
      this.prisma.landingVisit.groupBy({
        by: ["visitorHash"],
        where,
      }),
    ]);

    if (totalLandingViews === 0) {
      const pvWhere = {
        ...where,
        isLandingPage: true,
      };
      const [pvCount, pvUnique] = await Promise.all([
        this.prisma.pageView.count({ where: pvWhere }),
        this.prisma.pageView.groupBy({ by: ["visitorHash"], where: pvWhere }),
      ]);
      return {
        totalViews: pvCount,
        uniqueVisitors: pvUnique.length,
      };
    }

    return {
      totalViews: totalLandingViews,
      uniqueVisitors: uniqueLandingVisitors.length,
    };
  }
}
