import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { GeoLocationService } from './geo-location.service';
import {
  TrackPageViewDto,
  AnalyticsQueryDto,
  StartSessionDto,
  PingSessionDto,
  GeoRankingQueryDto,
  LandingStatsQueryDto,
  StudentRankingQueryDto,
  VisitorListQueryDto,
} from '../dto/analytics.dto';
import * as crypto from 'crypto';

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
    device: 'Desktop' | 'Mobile' | 'Tablet';
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
    scope: 'landing' | 'system' | 'all';
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



@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly HASH_SALT = process.env.ANALYTICS_SALT || 'el-awal-analytics-salt-2026';

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoLocationService: GeoLocationService,
  ) {}

  async onModuleInit() {
    // Non-blocking initialization
  }


  /**
   * Generates a privacy-compliant SHA-256 visitor hash.
   * Prioritizes persistent client-side visitorId so multiple devices on the same Wi-Fi
   * network are accurately distinguished as separate unique visitors.
   */
  public generateVisitorHash(ip?: string, userAgent?: string, visitorId?: string): string {
    const cleanIp = (ip || '127.0.0.1').replace(/^::ffff:/, '').trim();
    const cleanUa = (userAgent || 'unknown').trim();
    const clientIdentifier = visitorId && visitorId.trim() ? `vid::${visitorId.trim()}` : `${cleanIp}::${cleanUa}`;
    return crypto
      .createHash('sha256')
      .update(`${clientIdentifier}::${this.HASH_SALT}`)
      .digest('hex');
  }

  /**
   * Non-blocking fire-and-forget page view persistence.
   */
  public async recordPageView(params: RecordPageViewParams): Promise<void> {
    try {
      // Never track teacher, secretariat, or admin paths
      if (
        params.path?.startsWith('/teacher') ||
        params.path?.startsWith('/secretariat') ||
        params.path?.startsWith('/assistant') ||
        params.path?.startsWith('/admin')
      ) {
        return;
      }

      if (params.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: params.userId },
          select: { role: true },
        });
        if (user?.role === UserRole.TEACHER || user?.role === UserRole.SECRETARIAT) {
          return;
        }
      }

      const visitorHash = this.generateVisitorHash(params.ipAddress, params.userAgent, params.visitorId);
      const isLanding =
        params.isLandingPage ??
        (params.path === '/' || params.path === '' || params.path.startsWith('/#'));

      const geo = await this.geoLocationService.resolveAsync(params.ipAddress, params.headers || {}, {
        city: params.city,
        country: params.country,
      });

      // If landing page, also record in dedicated LandingVisit table with resolved geo
      if (isLanding) {
        void this.prisma.landingVisit
          .create({
            data: {
              visitorHash,
              path: (params.path || '/').slice(0, 500),
              country: geo.country,
              city: geo.city,
            },
          })
          .catch(() => {});
      }

      await this.prisma.pageView.create({
        data: {
          path: (params.path || '/').slice(0, 500),
          referrer: params.referrer ? params.referrer.slice(0, 500) : null,
          userAgent: params.userAgent ? params.userAgent.slice(0, 500) : null,
          visitorHash,
          isLandingPage: isLanding,
          tenantId: params.tenantId || null,
          userId: params.userId || null,
          metadata: {
            ...(params.metadata || {}),
            country: geo.country,
            city: geo.city,
          },
        },
      });

      this.logger.debug(
        `[Analytics] Tracked: ${params.path} (landing: ${isLanding}, hash: ${visitorHash.slice(0, 8)})`,
      );
    } catch (err: any) {
      this.logger.warn(`Failed to record page view telemetry: ${err?.message}`);
    }
  }

  /**
   * Starts an authenticated user activity session.
   */
  public async startSession(
    userId: string,
    dto: StartSessionDto,
    ipAddress?: string,
    userAgent?: string,
    headers: Record<string, any> = {},
  ): Promise<{ sessionId: string; country: string; city: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === UserRole.TEACHER || user?.role === UserRole.SECRETARIAT) {
      return { sessionId: 'teacher-excluded', country: 'مصر', city: 'القاهرة' };
    }

    const geo = await this.geoLocationService.resolveAsync(ipAddress, headers, {
      city: dto.city,
      country: dto.country,
    });

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        tenantId: dto.tenantId || null,
        startedAt: new Date(),
        lastActiveAt: new Date(),
        durationSeconds: 0,
        country: geo.country,
        city: geo.city,
        ipAddress: ipAddress ? ipAddress.slice(0, 100) : null,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
      },
    });

    this.logger.debug(`[Session] Started session ${session.id} for user ${userId} in ${geo.city}, ${geo.country}`);
    return {
      sessionId: session.id,
      country: geo.country,
      city: geo.city,
    };
  }

  /**
   * Increments active session duration with safety thresholds against stale tabs.
   */
  public async pingSession(
    dto: PingSessionDto,
  ): Promise<{ success: boolean; totalDurationSeconds: number }> {
    const safeIncrement = Math.min(Math.max(dto.elapsedSeconds || 30, 1), 60);

    try {
      const session = await this.prisma.userSession.update({
        where: { id: dto.sessionId },
        data: {
          lastActiveAt: new Date(),
          durationSeconds: { increment: safeIncrement },
        },
      });

      return {
        success: true,
        totalDurationSeconds: session.durationSeconds,
      };
    } catch (err: any) {
      this.logger.debug(`Failed to ping session ${dto.sessionId}: ${err?.message}`);
      return { success: false, totalDurationSeconds: 0 };
    }
  }

  /**
   * Calculates the exact start and end of a given calendar day in Africa/Cairo timezone.
   */
  public getCairoMidnight(date: Date = new Date()): { startOfToday: Date; endOfToday: Date } {
    const cairoDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(date);
    const [year, month, day] = cairoDateStr.split('-').map(Number);
    const sample = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(sample);
    const cairoHourAtNoon = parseInt(parts.find((p) => p.type === 'hour')?.value || '15', 10);
    const offsetHours = cairoHourAtNoon - 12;

    const startOfToday = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetHours * 3600 * 1000);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 3600 * 1000 - 1);
    return { startOfToday, endOfToday };
  }

  /**
   * Resolves the start and end Date objects based on the requested filter range
   * normalized to Africa/Cairo local time.
   */
  public resolveDateRange(
    range: string = 'week',
    from?: string,
    to?: string,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    if (range === 'custom' && from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      if (isNaN(startDate.getTime())) startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (isNaN(endDate.getTime())) endDate = new Date();
      if (to.length <= 10) {
        endDate.setHours(23, 59, 59, 999);
      }
      return { startDate, endDate };
    }

    switch (range) {
      case 'today': {
        const { startOfToday, endOfToday } = this.getCairoMidnight(now);
        startDate = startOfToday;
        endDate = endOfToday;
        break;
      }
      case 'week': {
        const { endOfToday } = this.getCairoMidnight(now);
        endDate = endOfToday;
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
        break;
      }
      case 'month': {
        const cairoDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(now);
        const [year, month] = cairoDateStr.split('-').map(Number);
        const { startOfToday } = this.getCairoMidnight(new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)));
        const { endOfToday } = this.getCairoMidnight(now);
        startDate = startOfToday;
        endDate = endOfToday;
        break;
      }
      case 'year': {
        const cairoDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(now);
        const [year] = cairoDateStr.split('-').map(Number);
        const { startOfToday } = this.getCairoMidnight(new Date(Date.UTC(year, 0, 1, 12, 0, 0)));
        const { endOfToday } = this.getCairoMidnight(now);
        startDate = startOfToday;
        endDate = endOfToday;
        break;
      }
      case 'all': {
        startDate = new Date(2024, 0, 1, 0, 0, 0, 0);
        break;
      }
      default: {
        const { endOfToday } = this.getCairoMidnight(now);
        endDate = endOfToday;
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
      }
    }

    return { startDate, endDate };
  }

  /**
   * Identifies all visitor hashes associated with teachers or secretariat staff.
   */
  public async getExcludedTeacherHashes(): Promise<string[]> {
    const teacherUsers = await this.prisma.user.findMany({
      where: { role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] } },
      select: { id: true },
    });
    const teacherUserIds = teacherUsers.map((u) => u.id);

    const teacherPageViews = await this.prisma.pageView.findMany({
      where: {
        OR: [
          { userId: { in: teacherUserIds } },
          { path: { startsWith: '/teacher' } },
          { path: { startsWith: '/secretariat' } },
          { path: { startsWith: '/assistant' } },
        ],
      },
      select: { visitorHash: true },
      distinct: ['visitorHash'],
    });

    return teacherPageViews.map((pv) => pv.visitorHash);
  }

  /**
   * Retrieves aggregated analytics statistics for the dashboard.
   */
  public async getStats(query: AnalyticsQueryDto, userTenantId?: string): Promise<AnalyticsStatsResponse> {
    const scope = query.scope || 'all';
    const range = query.range || 'week';
    const { startDate, endDate } = this.resolveDateRange(range, query.from, query.to);

    const baseDateCondition = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    let scopeCondition: any = {};
    const effectiveTenantId = query.tenantId || userTenantId;

    if (scope === 'landing') {
      scopeCondition = { isLandingPage: true };
    } else if (scope === 'system') {
      scopeCondition = {
        isLandingPage: false,
        ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      };
    } else {
      if (effectiveTenantId) {
        scopeCondition = {
          OR: [
            { isLandingPage: true },
            { tenantId: effectiveTenantId, isLandingPage: false },
          ],
        };
      }
    }

    const excludedTeacherHashes = await this.getExcludedTeacherHashes();
    const teacherExclusion = {
      ...(excludedTeacherHashes.length > 0 ? { visitorHash: { notIn: excludedTeacherHashes } } : {}),
      NOT: [
        { user: { role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] } } },
        { path: { startsWith: '/teacher' } },
        { path: { startsWith: '/secretariat' } },
        { path: { startsWith: '/assistant' } },
      ],
    };

    const where = {
      ...baseDateCondition,
      ...scopeCondition,
      ...teacherExclusion,
    };

    const totalViews = await this.prisma.pageView.count({ where });

    const uniqueGroups = await this.prisma.pageView.groupBy({
      by: ['visitorHash'],
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
      ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      ...teacherExclusion,
    };

    const [landingViews, systemViews] = await Promise.all([
      scope === 'system' ? 0 : this.prisma.pageView.count({ where: landingWhere }),
      scope === 'landing' ? 0 : this.prisma.pageView.count({ where: systemWhere }),
    ]);

    const viewsPerVisitor = uniqueVisitors > 0 ? Number((totalViews / uniqueVisitors).toFixed(1)) : 0;

    const topPagesGroup = await this.prisma.pageView.groupBy({
      by: ['path', 'isLandingPage'],
      where,
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 8,
    });

    const topPages = topPagesGroup.map((item) => ({
      path: item.path,
      isLandingPage: item.isLandingPage,
      views: item._count.path,
      percentage: totalViews > 0 ? Math.round((item._count.path / totalViews) * 100) : 0,
    }));

    const timeSeries = await this.buildTimeSeries(where, range, startDate, endDate);
    const { devices, osBreakdown, browserBreakdown } = await this.buildEnhancedDeviceBreakdown(where, totalViews);

    // New vs Returning: visitors with exactly 1 pageView in the period = new; >1 = returning
    const visitCountGroups = await this.prisma.pageView.groupBy({
      by: ['visitorHash'],
      where,
      _count: { visitorHash: true },
    });
    const newVisitors = visitCountGroups.filter((g) => g._count.visitorHash === 1).length;
    const returningVisitors = visitCountGroups.filter((g) => g._count.visitorHash > 1).length;

    // Aggregate total platform browsing duration (strictly for students and guests, excluding teachers & assistants)
    const sessionAgg = await this.prisma.userSession.aggregate({
      where: {
        startedAt: { gte: startDate, lte: endDate },
        user: { role: { notIn: [UserRole.TEACHER, UserRole.SECRETARIAT] } },
        ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      },
      _sum: { durationSeconds: true },
    });
    const sessionDuration = sessionAgg._sum?.durationSeconds || 0;
    const estimatedGuestDuration = Math.round(landingViews * 50);
    const totalDurationSeconds = sessionDuration + estimatedGuestDuration;
    const totalDurationFormatted = this.formatDurationArabic(totalDurationSeconds);
    const avgDurationSeconds = uniqueVisitors > 0 ? Math.round(totalDurationSeconds / uniqueVisitors) : 0;
    const avgDurationPerVisitorFormatted = this.formatDurationArabic(avgDurationSeconds);

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

  /**
   * Retrieves summary metrics specifically for the landing page.
   */
  public async getLandingStats(
    query: LandingStatsQueryDto,
  ): Promise<{ totalViews: number; uniqueVisitors: number }> {
    const { startDate, endDate } = this.resolveDateRange(query.range, query.from, query.to);
    const excludedTeacherHashes = await this.getExcludedTeacherHashes();

    const where = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(excludedTeacherHashes.length > 0 ? { visitorHash: { notIn: excludedTeacherHashes } } : {}),
    };

    const [totalLandingViews, uniqueLandingVisitors] = await Promise.all([
      this.prisma.landingVisit.count({ where }),
      this.prisma.landingVisit.groupBy({
        by: ['visitorHash'],
        where,
      }),
    ]);

    // Fallback to PageView where isLandingPage is true if LandingVisit is still bootstrapping
    if (totalLandingViews === 0) {
      const pvWhere = {
        ...where,
        isLandingPage: true,
      };
      const [pvCount, pvUnique] = await Promise.all([
        this.prisma.pageView.count({ where: pvWhere }),
        this.prisma.pageView.groupBy({ by: ['visitorHash'], where: pvWhere }),
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

  /**
   * Aggregates and ranks visits by Country or City/Governorate.
   */
  public async getGeoRanking(
    query: GeoRankingQueryDto,
    userTenantId?: string,
  ): Promise<{ items: GeoRankingItem[]; totalVisits: number; groupBy: 'country' | 'city' }> {
    const groupBy = query.groupBy || 'city';
    const scope = query.scope || 'all';
    const { startDate, endDate } = this.resolveDateRange(query.range, query.from, query.to);
    const effectiveTenantId = query.tenantId || userTenantId;

    const excludedTeacherHashes = await this.getExcludedTeacherHashes();
    const teacherExclusion = {
      ...(excludedTeacherHashes.length > 0 ? { visitorHash: { notIn: excludedTeacherHashes } } : {}),
      NOT: [
        { user: { role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] } } },
        { path: { startsWith: '/teacher' } },
        { path: { startsWith: '/secretariat' } },
        { path: { startsWith: '/assistant' } },
      ],
    };

    // We collect counts in a Map: locationName -> { count, uniqueHashes }
    const locationMap = new Map<string, { count: number; hashes: Set<string> }>();

    // 1. Landing Visits (if scope is landing or all)
    if (scope === 'landing' || scope === 'all') {
      const landingWhere = {
        createdAt: { gte: startDate, lte: endDate },
        ...(excludedTeacherHashes.length > 0 ? { visitorHash: { notIn: excludedTeacherHashes } } : {}),
      };
      const landingVisits = await this.prisma.landingVisit.findMany({
        where: landingWhere,
        select: {
          country: true,
          city: true,
          visitorHash: true,
        },
      });

      for (const lv of landingVisits) {
        let city = lv.city;
        let country = lv.country || 'مصر';
        if (country === 'SG' || country === 'سنغافورة') {
          country = 'سنغافورة';
          if (!city || city === 'عام' || city === 'خارج مصر') city = 'سنغافورة';
        } else if (city === 'عام' || city === 'خارج مصر') {
          city = country;
        }

        const key = groupBy === 'country' ? country : (city || 'غير محدد');
        if (!locationMap.has(key)) {
          locationMap.set(key, { count: 0, hashes: new Set<string>() });
        }
        const entry = locationMap.get(key)!;
        entry.count++;
        entry.hashes.add(lv.visitorHash);
      }
    }

    // 2. User Sessions & Platform Views (if scope is platform or all)
    if (scope === 'platform' || scope === 'all') {
      const sessionWhere: any = {
        startedAt: { gte: startDate, lte: endDate },
        user: { role: { notIn: [UserRole.TEACHER, UserRole.SECRETARIAT] } },
        ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      };

      const pvWhere: any = {
        createdAt: { gte: startDate, lte: endDate },
        isLandingPage: false,
        ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
        ...teacherExclusion,
      };

      const [userSessions, platformPageViews] = await Promise.all([
        this.prisma.userSession.findMany({
          where: sessionWhere,
          select: {
            country: true,
            city: true,
            userId: true,
          },
        }),
        this.prisma.pageView.findMany({
          where: pvWhere,
          select: {
            visitorHash: true,
            metadata: true,
          },
        }),
      ]);

      // Aggregate platform pageviews with embedded geo
      for (const pv of platformPageViews || []) {
        const meta = pv.metadata as any;
        let city = meta?.city;
        let country = meta?.country;
        if (country === 'SG' || country === 'سنغافورة') {
          country = 'سنغافورة';
          if (!city || city === 'عام' || city === 'خارج مصر') city = 'سنغافورة';
        } else if (city === 'عام' || city === 'خارج مصر') {
          city = country || 'خارج مصر';
        }

        if (city || country) {
          const key = groupBy === 'country' ? (country || 'مصر') : (city || 'غير محدد');
          if (!locationMap.has(key)) {
            locationMap.set(key, { count: 0, hashes: new Set<string>() });
          }
          const entry = locationMap.get(key)!;
          entry.count++;
          entry.hashes.add(pv.visitorHash);
        }
      }

      // Aggregate user sessions
      for (const us of userSessions || []) {
        let city = us.city;
        let country = us.country || 'مصر';
        if (country === 'SG' || country === 'سنغافورة') {
          country = 'سنغافورة';
          if (!city || city === 'عام' || city === 'خارج مصر') city = 'سنغافورة';
        } else if (city === 'عام' || city === 'خارج مصر') {
          city = country;
        }

        const key = groupBy === 'country' ? country : (city || 'غير محدد');
        if (!locationMap.has(key)) {
          locationMap.set(key, { count: 0, hashes: new Set<string>() });
        }
        const entry = locationMap.get(key)!;
        if (!platformPageViews || platformPageViews.length === 0) {
          entry.count++;
        }
        entry.hashes.add(us.userId);
      }
    }

    if (locationMap.size === 0) {
      return {
        items: [],
        totalVisits: 0,
        groupBy,
      };
    }

    const totalVisits = Array.from(locationMap.values()).reduce((sum, val) => sum + val.count, 0);

    // Inline country code → Arabic name map for normalizing any raw ISO codes stored in DB
    const LEGACY_COUNTRY_CODES: Record<string, string> = {
      EG: 'مصر', SA: 'المملكة العربية السعودية', AE: 'الإمارات العربية المتحدة',
      KW: 'الكويت', QA: 'قطر', OM: 'سلطنة عمان', BH: 'البحرين', JO: 'الأردن',
      IQ: 'العراق', LB: 'لبنان', PS: 'فلسطين', SY: 'سوريا', YE: 'اليمن',
      LY: 'ليبيا', SD: 'السودان', DZ: 'الجزائر', TN: 'تونس', MA: 'المغرب',
      US: 'الولايات المتحدة', GB: 'المملكة المتحدة', DE: 'ألمانيا', FR: 'فرنسا',
      TR: 'تركيا', IT: 'إيطاليا', CA: 'كندا', AU: 'أستراليا', NL: 'هولندا',
      SE: 'السويد', NO: 'النرويج', DK: 'الدنمارك', CH: 'سويسرا', RU: 'روسيا',
      SG: 'سنغافورة', JP: 'اليابان', CN: 'الصين', IN: 'الهند', KR: 'كوريا الجنوبية',
      PK: 'باكستان', ID: 'إندونيسيا', MY: 'ماليزيا', TH: 'تايلاند', HK: 'هونج كونج',
      BR: 'البرازيل', MX: 'المكسيك', NG: 'نيجيريا', ZA: 'جنوب أفريقيا',
    };

    const sorted = Array.from(locationMap.entries())
      .map(([name, stat]) => {
        // Normalize legacy entries and raw ISO codes (e.g. "SG") stored in DB
        let normalizedName = name;
        if (normalizedName === 'عام' || normalizedName === 'خارج مصر') {
          normalizedName = 'سنغافورة';
        }
        // If the name looks like a raw 2-letter ISO code, translate it
        if (/^[A-Z]{2}$/.test(normalizedName) && LEGACY_COUNTRY_CODES[normalizedName]) {
          normalizedName = LEGACY_COUNTRY_CODES[normalizedName];
        }
        return {
          name: normalizedName,
          visitCount: stat.count,
          uniqueVisitors: stat.hashes.size,
          percentage: totalVisits > 0 ? Math.round((stat.count / totalVisits) * 100) : 0,
        };
      })

      // Merge entries with the same name (e.g., old "عام" merged with new "خارج مصر")
      .reduce(
        (acc, item) => {
          const existing = acc.find((a) => a.name === item.name);
          if (existing) {
            existing.visitCount += item.visitCount;
            existing.uniqueVisitors += item.uniqueVisitors;
          } else {
            acc.push(item);
          }
          return acc;
        },
        [] as { name: string; visitCount: number; uniqueVisitors: number; percentage: number }[],
      )
      .map((item) => ({
        ...item,
        percentage: totalVisits > 0 ? Math.round((item.visitCount / totalVisits) * 100) : 0,
      }))
      .sort((a, b) => b.visitCount - a.visitCount)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }));

    return {
      items: sorted,
      totalVisits,
      groupBy,
    };
  }

  /**
   * Retrieves the Student Engagement Leaderboard ranked by active duration or session frequency.
   * Strictly filters for authenticated STUDENTS belonging to the teacher's workspace.
   */
  public async getStudentEngagementLeaderboard(
    query: StudentRankingQueryDto,
    userTenantId?: string,
  ): Promise<{ students: StudentLeaderboardItem[]; sortBy: 'duration' | 'visits' }> {
    const sortBy = query.sortBy || 'duration';
    const limit = query.limit || 20;
    const { startDate, endDate } = this.resolveDateRange(query.range, query.from, query.to);
    const effectiveTenantId = query.tenantId || userTenantId;

    const where: any = {
      startedAt: { gte: startDate, lte: endDate },
      ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      user: {
        role: 'STUDENT',
      },
    };

    // Aggregate sessions strictly for students
    const sessions = await this.prisma.userSession.findMany({
      where,
      select: {
        userId: true,
        durationSeconds: true,
        startedAt: true,
        lastActiveAt: true,
        city: true,
        country: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    const studentMap = new Map<
      string,
      {
        totalDuration: number;
        sessionsCount: number;
        lastActive: Date;
        city: string;
        country: string;
      }
    >();

    for (const s of sessions) {
      if (!studentMap.has(s.userId)) {
        studentMap.set(s.userId, {
          totalDuration: 0,
          sessionsCount: 0,
          lastActive: s.lastActiveAt || s.startedAt,
          city: s.city || 'غير محدد',
          country: s.country || 'مصر',
        });
      }
      const agg = studentMap.get(s.userId)!;
      agg.totalDuration += s.durationSeconds;
      agg.sessionsCount += 1;
      if (s.lastActiveAt && s.lastActiveAt > agg.lastActive) {
        agg.lastActive = s.lastActiveAt;
      }
    }

    const userIds = Array.from(studentMap.keys());
    if (userIds.length === 0) {
      return { students: [], sortBy };
    }

    // Fetch user details with student profiles
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        studentProfile: {
          select: {
            studentCode: true,
            gradeLevel: true,
          },
        },
      },
    });

    const userDetailsMap = new Map(users.map((u) => [u.id, u]));

    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours} ساعة ${minutes > 0 ? `و ${minutes} د` : ''}`;
      }
      return `${Math.max(1, minutes)} دقيقة`;
    };

    const leaderboard: StudentLeaderboardItem[] = userIds
      .map((uid) => {
        const agg = studentMap.get(uid)!;
        const details = userDetailsMap.get(uid);

        return {
          rank: 0,
          userId: uid,
          studentName: details?.fullName || 'طالب',
          studentCode: details?.studentProfile?.studentCode || 'STU-000',
          phone: details?.phone || undefined,
          gradeLevel: details?.studentProfile?.gradeLevel || undefined,
          city: agg.city,
          country: agg.country,
          totalSessions: agg.sessionsCount,
          totalDurationSeconds: agg.totalDuration,
          totalDurationFormatted: formatDuration(agg.totalDuration),
          lastActiveAt: agg.lastActive.toISOString(),
        };
      })
      .sort((a, b) => {
        if (sortBy === 'duration') {
          return b.totalDurationSeconds - a.totalDurationSeconds;
        }
        return b.totalSessions - a.totalSessions;
      })
      .slice(0, limit)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return {
      students: leaderboard,
      sortBy,
    };
  }

  /**
   * Builds time-series buckets.
   * - Today → hourly buckets
   * - Week/Month/Custom → daily buckets
   * - Year/All → monthly buckets (to avoid hundreds of X-axis labels)
   */
  private async buildTimeSeries(where: any, range: string, startDate: Date, endDate: Date) {
    const views = await this.prisma.pageView.findMany({
      where,
      select: {
        createdAt: true,
        visitorHash: true,
        isLandingPage: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const isToday = range === 'today';
    const isMonthly = range === 'year';
    const isYearly = range === 'all';
    const bucketsMap = new Map<
      string,
      { label: string; date: string; views: number; visitors: Set<string>; landing: number; system: number }
    >();

    if (isToday) {
      // Hourly buckets for today
      for (let hour = 0; hour < 24; hour++) {
        const key = `${hour.toString().padStart(2, '0')}:00`;
        const hourLabel = `${hour % 12 || 12} ${hour < 12 ? 'ص' : 'م'}`;
        bucketsMap.set(key, {
          label: hourLabel,
          date: key,
          views: 0,
          visitors: new Set<string>(),
          landing: 0,
          system: 0,
        });
      }

      for (const v of views) {
        const cairoHourStr = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Africa/Cairo',
          hour: 'numeric',
          hour12: false,
        }).format(new Date(v.createdAt));
        const cairoHour = parseInt(cairoHourStr, 10);
        const key = `${(cairoHour % 24).toString().padStart(2, '0')}:00`;
        const bucket = bucketsMap.get(key);
        if (bucket) {
          bucket.views++;
          bucket.visitors.add(v.visitorHash);
          if (v.isLandingPage) bucket.landing++;
          else bucket.system++;
        }
      }
    } else if (isYearly) {
      // Yearly buckets for 'all time' range
      const current = new Date(startDate);
      current.setMonth(0);
      current.setDate(1);
      current.setHours(0, 0, 0, 0);

      while (current <= endDate) {
        const cairoStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Cairo',
        }).format(current);
        const [yr] = cairoStr.split('-').map(Number);
        const yearKey = `${yr}`;

        if (!bucketsMap.has(yearKey)) {
          bucketsMap.set(yearKey, {
            label: `${yr}`,
            date: yearKey,
            views: 0,
            visitors: new Set<string>(),
            landing: 0,
            system: 0,
          });
        }

        // Advance by one year
        current.setFullYear(current.getFullYear() + 1);
      }

      for (const v of views) {
        const cairoStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Cairo',
        }).format(new Date(v.createdAt));
        const [yr] = cairoStr.split('-').map(Number);
        const yearKey = `${yr}`;
        const bucket = bucketsMap.get(yearKey);
        if (bucket) {
          bucket.views++;
          bucket.visitors.add(v.visitorHash);
          if (v.isLandingPage) bucket.landing++;
          else bucket.system++;
        }
      }
    } else if (isMonthly) {
      // Monthly buckets for 'year' range
      const current = new Date(startDate);
      // Start from the first day of the start month
      current.setDate(1);
      current.setHours(0, 0, 0, 0);

      while (current <= endDate) {
        const cairoStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Cairo',
        }).format(current);
        const [yr, mo] = cairoStr.split('-').map(Number);
        const monthKey = `${yr}-${mo.toString().padStart(2, '0')}`;

        if (!bucketsMap.has(monthKey)) {
          const monthLabel = current.toLocaleDateString('ar-EG', {
            timeZone: 'Africa/Cairo',
            month: 'long',
            year: 'numeric',
          });
          bucketsMap.set(monthKey, {
            label: monthLabel,
            date: monthKey,
            views: 0,
            visitors: new Set<string>(),
            landing: 0,
            system: 0,
          });
        }

        // Advance by one month
        current.setMonth(current.getMonth() + 1);
      }

      for (const v of views) {
        const cairoStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Cairo',
        }).format(new Date(v.createdAt));
        const [yr, mo] = cairoStr.split('-').map(Number);
        const monthKey = `${yr}-${mo.toString().padStart(2, '0')}`;
        const bucket = bucketsMap.get(monthKey);
        if (bucket) {
          bucket.views++;
          bucket.visitors.add(v.visitorHash);
          if (v.isLandingPage) bucket.landing++;
          else bucket.system++;
        }
      }
    } else {
      // Daily buckets for week/month/custom ranges
      const current = new Date(startDate);
      while (current <= endDate) {
        const cairoDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Cairo',
        }).format(current);
        const dayLabel = current.toLocaleDateString('ar-EG', {
          timeZone: 'Africa/Cairo',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        bucketsMap.set(cairoDate, {
          label: dayLabel,
          date: cairoDate,
          views: 0,
          visitors: new Set<string>(),
          landing: 0,
          system: 0,
        });
        current.setDate(current.getDate() + 1);
      }

      for (const v of views) {
        const cairoDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Cairo',
        }).format(new Date(v.createdAt));
        const bucket = bucketsMap.get(cairoDate);
        if (bucket) {
          bucket.views++;
          bucket.visitors.add(v.visitorHash);
          if (v.isLandingPage) bucket.landing++;
          else bucket.system++;
        }
      }
    }

    return Array.from(bucketsMap.values()).map((b) => ({
      date: b.date,
      label: b.label,
      totalViews: b.views,
      uniqueVisitors: b.visitors.size,
      landingViews: b.landing,
      systemViews: b.system,
    }));
  }

  /**
   * Infers device category, OS, and browser from User-Agent patterns.
   * Returns three parallel breakdowns in a single DB fetch.
   */
  private async buildEnhancedDeviceBreakdown(where: any, totalViews: number) {
    const empty = {
      devices: [
        { device: 'Desktop' as const, labelAr: 'أجهزة الكمبيوتر', count: 0, percentage: 0 },
        { device: 'Mobile' as const, labelAr: 'الهواتف الذكية', count: 0, percentage: 0 },
        { device: 'Tablet' as const, labelAr: 'الأجهزة اللوحية', count: 0, percentage: 0 },
      ],
      osBreakdown: [] as { os: string; labelAr: string; count: number; percentage: number }[],
      browserBreakdown: [] as { browser: string; labelAr: string; count: number; percentage: number }[],
    };

    if (totalViews === 0) return empty;

    const sampleViews = await this.prisma.pageView.findMany({
      where,
      select: { userAgent: true },
      take: 2000,
    });

    // Device counters
    let mobileCount = 0;
    let tabletCount = 0;
    let desktopCount = 0;

    // OS counters
    const osCounts: Record<string, number> = {
      Android: 0, iOS: 0, Windows: 0, macOS: 0, Linux: 0, Other: 0,
    };

    // Browser counters
    const browserCounts: Record<string, number> = {
      Chrome: 0, Safari: 0, Firefox: 0, Edge: 0, Opera: 0, Other: 0,
    };

    for (const v of sampleViews) {
      const ua = v.userAgent || '';
      const ual = ua.toLowerCase();

      // --- Device ---
      if (/tablet|ipad|playbook|silk/i.test(ua)) {
        tabletCount++;
      } else if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
        mobileCount++;
      } else {
        desktopCount++;
      }

      // --- OS ---
      if (/android/i.test(ua)) {
        osCounts['Android']++;
      } else if (/iphone|ipad|ipod/i.test(ua)) {
        osCounts['iOS']++;
      } else if (/windows nt|windows phone/i.test(ua)) {
        osCounts['Windows']++;
      } else if (/macintosh|mac os x/i.test(ua)) {
        osCounts['macOS']++;
      } else if (/linux/i.test(ual)) {
        osCounts['Linux']++;
      } else {
        osCounts['Other']++;
      }

      // --- Browser (order matters: Edge before Chrome, Opera before Chrome) ---
      if (/edg\//i.test(ua) || /edghtml/i.test(ua)) {
        browserCounts['Edge']++;
      } else if (/opr\//i.test(ua) || /opera/i.test(ua)) {
        browserCounts['Opera']++;
      } else if (/chrome|chromium/i.test(ua)) {
        browserCounts['Chrome']++;
      } else if (/firefox|fxios/i.test(ua)) {
        browserCounts['Firefox']++;
      } else if (/safari/i.test(ua)) {
        browserCounts['Safari']++;
      } else {
        browserCounts['Other']++;
      }
    }

    const sample = sampleViews.length || 1;

    // Scale device counts to totalViews
    const desktopRatio = desktopCount / sample;
    const mobileRatio  = mobileCount  / sample;
    const tabletRatio  = tabletCount  / sample;
    const scaledDesktop = Math.round(desktopRatio * totalViews);
    const scaledMobile  = Math.round(mobileRatio  * totalViews);
    const scaledTablet  = totalViews - scaledDesktop - scaledMobile;

    const devices = [
      { device: 'Desktop' as const, labelAr: 'أجهزة الكمبيوتر', count: Math.max(0, scaledDesktop), percentage: Math.round(desktopRatio * 100) },
      { device: 'Mobile'  as const, labelAr: 'الهواتف الذكية',    count: Math.max(0, scaledMobile),  percentage: Math.round(mobileRatio  * 100) },
      { device: 'Tablet'  as const, labelAr: 'الأجهزة اللوحية',   count: Math.max(0, scaledTablet),  percentage: Math.round(tabletRatio  * 100) },
    ];

    // OS breakdown — filter zeros, sort descending
    const OS_LABELS: Record<string, string> = {
      Android: 'أندرويد', iOS: 'آيفون / iOS',
      Windows: 'ويندوز', macOS: 'ماك (macOS)',
      Linux: 'لينكس', Other: 'أخرى',
    };
    const osBreakdown = Object.entries(osCounts)
      .filter(([, c]) => c > 0)
      .map(([os, c]) => ({
        os,
        labelAr: OS_LABELS[os] || os,
        count: Math.round((c / sample) * totalViews),
        percentage: Math.round((c / sample) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Browser breakdown — filter zeros, sort descending
    const BROWSER_LABELS: Record<string, string> = {
      Chrome: 'جوجل كروم', Safari: 'سافاري',
      Firefox: 'فايرفوكس', Edge: 'مايكروسوفت إيج',
      Opera: 'أوبرا', Other: 'أخرى',
    };
    const browserBreakdown = Object.entries(browserCounts)
      .filter(([, c]) => c > 0)
      .map(([browser, c]) => ({
        browser,
        labelAr: BROWSER_LABELS[browser] || browser,
        count: Math.round((c / sample) * totalViews),
        percentage: Math.round((c / sample) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return { devices, osBreakdown, browserBreakdown };
  }

  /**
   * Helper to parse device category, OS, and browser from User-Agent string.
   */
  public parseUserAgentString(ua: string = ''): {
    device: 'Desktop' | 'Mobile' | 'Tablet';
    os: string;
    browser: string;
  } {
    const ual = ua.toLowerCase();
    let device: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      device = 'Tablet';
    } else if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
      device = 'Mobile';
    }

    let os = 'Other';
    if (/android/i.test(ua)) {
      os = 'Android';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      os = 'iOS';
    } else if (/windows nt|windows phone/i.test(ua)) {
      os = 'Windows';
    } else if (/macintosh|mac os x/i.test(ua)) {
      os = 'macOS';
    } else if (/linux/i.test(ual)) {
      os = 'Linux';
    }

    let browser = 'Other';
    if (/edg\//i.test(ua) || /edghtml/i.test(ua)) {
      browser = 'Edge';
    } else if (/opr\//i.test(ua) || /opera/i.test(ua)) {
      browser = 'Opera';
    } else if (/chrome|chromium/i.test(ua)) {
      browser = 'Chrome';
    } else if (/firefox|fxios/i.test(ua)) {
      browser = 'Firefox';
    } else if (/safari/i.test(ua)) {
      browser = 'Safari';
    }

    return { device, os, browser };
  }

  /**
   * Calculates realistic browsing/engagement duration in seconds for a visitor based on visits timestamps
   * or authenticated user session pings.
   */
  public calculateVisitorDuration(views: { createdAt: Date | string }[], sessionsDuration: number = 0): number {
    if (sessionsDuration > 0) {
      return sessionsDuration;
    }
    if (!views || views.length === 0) return 0;
    if (views.length === 1) return 45; // baseline engagement 45s

    const times = views
      .map((v) => new Date(v.createdAt).getTime())
      .sort((a, b) => a - b);

    let totalSeconds = 0;
    let sessionStart = times[0];
    let sessionLast = times[0];

    for (let i = 1; i < times.length; i++) {
      const diffSec = (times[i] - sessionLast) / 1000;
      if (diffSec <= 1800) {
        // Continuous session (<= 30 min gap)
        sessionLast = times[i];
      } else {
        // Gap > 30 min: end previous session
        const sessionDiff = Math.round((sessionLast - sessionStart) / 1000);
        totalSeconds += Math.max(sessionDiff, 45);
        sessionStart = times[i];
        sessionLast = times[i];
      }
    }
    const finalSessionDiff = Math.round((sessionLast - sessionStart) / 1000);
    totalSeconds += Math.max(finalSessionDiff, 45);

    return Math.max(totalSeconds, views.length * 30);
  }

  /**
   * Formats duration in seconds to a human-readable Arabic string.
   */
  public formatDurationArabic(seconds: number = 0): string {
    if (seconds <= 0) return 'أقل من دقيقة';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSecs = seconds % 60;

    if (hours > 0) {
      return `${hours} ساعة ${minutes > 0 ? `و ${minutes} دقيقة` : ''}`;
    }
    if (minutes > 0) {
      return `${minutes} دقيقة ${remainingSecs > 10 ? `و ${remainingSecs} ثانية` : ''}`;
    }
    return `${remainingSecs} ثانية`;
  }


  /**
   * Retrieves a filtered list of unique visitors with visit frequency, metadata, and detailed visit history.
   */
  public async getVisitorsList(
    query: VisitorListQueryDto,
    userTenantId?: string,
  ): Promise<VisitorListResponse> {
    const scope = query.scope || 'all';
    const range = query.range || 'week';
    const { startDate, endDate } = this.resolveDateRange(range, query.from, query.to);

    const baseDateCondition = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    let scopeCondition: any = {};
    const effectiveTenantId = query.tenantId || userTenantId;

    if (scope === 'landing') {
      scopeCondition = { isLandingPage: true };
    } else if (scope === 'system') {
      scopeCondition = {
        isLandingPage: false,
        ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      };
    } else {
      if (effectiveTenantId) {
        scopeCondition = {
          OR: [
            { isLandingPage: true },
            { tenantId: effectiveTenantId, isLandingPage: false },
          ],
        };
      }
    }

    let searchUserIds: string[] | undefined;
    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      const matchedUsers = await this.prisma.user.findMany({
        where: {
          role: { notIn: [UserRole.TEACHER, UserRole.SECRETARIAT] },
          OR: [
            { fullName: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { studentProfile: { studentCode: { contains: searchTerm, mode: 'insensitive' } } },
          ],
        },
        select: { id: true },
        take: 100,
      });
      searchUserIds = matchedUsers.map((u) => u.id);
    }

    const excludedTeacherHashes = await this.getExcludedTeacherHashes();
    const teacherExclusion = {
      ...(excludedTeacherHashes.length > 0 ? { visitorHash: { notIn: excludedTeacherHashes } } : {}),
      NOT: [
        { user: { role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] } } },
        { path: { startsWith: '/teacher' } },
        { path: { startsWith: '/secretariat' } },
        { path: { startsWith: '/assistant' } },
      ],
    };

    const where: any = {
      ...baseDateCondition,
      ...scopeCondition,
      ...teacherExclusion,
      ...(searchUserIds !== undefined ? { userId: { in: searchUserIds } } : {}),
    };

    // Aggregate unique visitors in period
    const groups = await this.prisma.pageView.groupBy({
      by: ['visitorHash'],
      where,
      _count: { visitorHash: true },
      _max: { createdAt: true },
      _min: { createdAt: true },
    });

    // Sort groups
    if (query.sortBy === 'visits') {
      groups.sort((a, b) => (b._count?.visitorHash || 0) - (a._count?.visitorHash || 0));
    } else {
      // Default: recent
      groups.sort((a, b) => {
        const timeA = a._max?.createdAt ? new Date(a._max.createdAt).getTime() : 0;
        const timeB = b._max?.createdAt ? new Date(b._max.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    const totalVisitors = groups.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 30));
    const totalPages = Math.ceil(totalVisitors / limit) || 1;
    const pagedGroups = groups.slice((page - 1) * limit, page * limit);
    const pagedHashes = pagedGroups.map((g) => g.visitorHash);

    if (pagedHashes.length === 0) {
      return {
        visitors: [],
        totalVisitors,
        page,
        limit,
        totalPages,
        totalDurationSeconds: 0,
        totalDurationFormatted: '0 دقيقة',
        avgDurationFormatted: '0 دقيقة',
      };
    }

    // Fetch page views for these visitors in the filtered period
    const views = await this.prisma.pageView.findMany({
      where: {
        visitorHash: { in: pagedHashes },
        ...baseDateCondition,
        ...scopeCondition,
        ...teacherExclusion,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        visitorHash: true,
        path: true,
        referrer: true,
        userAgent: true,
        isLandingPage: true,
        metadata: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            studentProfile: {
              select: {
                studentCode: true,
                gradeLevel: true,
              },
            },
          },
        },
      },
      take: 2000,
    });

    // Also fetch landing visits to resolve city/country if pageView metadata doesn't have it
    const landingVisits = await this.prisma.landingVisit.findMany({
      where: {
        visitorHash: { in: pagedHashes },
        ...(excludedTeacherHashes.length > 0 ? { visitorHash: { notIn: excludedTeacherHashes } } : {}),
      },
      select: { visitorHash: true, city: true, country: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const landingGeoMap = new Map<string, { city?: string; country?: string }>();
    for (const lv of landingVisits) {
      if (!landingGeoMap.has(lv.visitorHash)) {
        landingGeoMap.set(lv.visitorHash, { city: lv.city || undefined, country: lv.country || undefined });
      }
    }

    // Map views by visitorHash
    const viewsMap = new Map<string, typeof views>();
    for (const v of views) {
      const list = viewsMap.get(v.visitorHash) || [];
      list.push(v);
      viewsMap.set(v.visitorHash, list);
    }

    // Fetch user sessions for authenticated users in current page (strictly students)
    const userIds = views
      .filter((v) => v.user?.id && v.user.role !== UserRole.TEACHER && v.user.role !== UserRole.SECRETARIAT)
      .map((v) => v.user!.id);
    const sessionDurationsByUserId = new Map<string, number>();
    if (userIds.length > 0) {
      const userSessions = await this.prisma.userSession.findMany({
        where: {
          userId: { in: userIds },
          user: { role: { notIn: [UserRole.TEACHER, UserRole.SECRETARIAT] } },
          startedAt: { gte: startDate, lte: endDate },
        },
        select: { userId: true, durationSeconds: true },
      });
      for (const s of userSessions) {
        sessionDurationsByUserId.set(
          s.userId,
          (sessionDurationsByUserId.get(s.userId) || 0) + s.durationSeconds,
        );
      }
    }

    const visitors: VisitorListItem[] = pagedGroups.map((g) => {
      const visitorViews = viewsMap.get(g.visitorHash) || [];
      const firstView = visitorViews[0]; // newest
      const userView = visitorViews.find((v) => v.user);

      // Geo resolution
      const landingGeo = landingGeoMap.get(g.visitorHash);
      let city = 'دمياط';
      let country = 'مصر';

      for (const v of visitorViews) {
        const meta = v.metadata as any;
        if (meta?.city && String(meta.city).trim()) {
          city = String(meta.city).trim();
          if (meta?.country) country = String(meta.country).trim();
          break;
        }
      }
      if (city === 'دمياط' && landingGeo?.city) {
        city = landingGeo.city;
        if (landingGeo.country) country = landingGeo.country;
      }

      // Device & Browser
      const ua = firstView?.userAgent || '';
      const { device, os, browser } = this.parseUserAgentString(ua);

      // Top pages
      const pageCounts = new Map<string, number>();
      for (const v of visitorViews) {
        pageCounts.set(v.path, (pageCounts.get(v.path) || 0) + 1);
      }
      const topPages = Array.from(pageCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([p]) => p);

      const individualVisits: IndividualVisitItem[] = visitorViews.map((v) => {
        const meta = v.metadata as any;
        return {
          id: v.id,
          path: v.path,
          isLandingPage: v.isLandingPage,
          createdAt: v.createdAt.toISOString(),
          referrer: v.referrer,
          userAgent: v.userAgent,
          city: meta?.city || city,
          country: meta?.country || country,
        };
      });

      // Calculate visit duration for this specific visitor
      const userSessionSecs = userView?.user ? (sessionDurationsByUserId.get(userView.user.id) || 0) : 0;
      const durationSeconds = this.calculateVisitorDuration(visitorViews, userSessionSecs);
      const totalDurationFormatted = this.formatDurationArabic(durationSeconds);

      return {
        visitorHash: g.visitorHash,
        shortHash: g.visitorHash.slice(0, 8),
        totalVisits: g._count?.visitorHash || visitorViews.length,
        totalDurationSeconds: durationSeconds,
        totalDurationFormatted,
        firstSeenAt: g._min?.createdAt ? new Date(g._min.createdAt).toISOString() : new Date().toISOString(),
        lastSeenAt: g._max?.createdAt ? new Date(g._max.createdAt).toISOString() : new Date().toISOString(),
        user: userView?.user
          ? {
              id: userView.user.id,
              name: userView.user.fullName,
              email: userView.user.email,
              phone: userView.user.phone || undefined,
              role: userView.user.role,
              studentCode: userView.user.studentProfile?.studentCode || undefined,
              gradeLevel: userView.user.studentProfile?.gradeLevel || undefined,
            }
          : null,
        country,
        city,
        device,
        os,
        browser,
        topPages,
        visits: individualVisits,
      };
    });

    let totalAllVisitorsDurationSeconds = 0;
    for (const v of visitors) {
      totalAllVisitorsDurationSeconds += v.totalDurationSeconds;
    }
    if (totalVisitors > visitors.length && visitors.length > 0) {
      const avg = totalAllVisitorsDurationSeconds / visitors.length;
      totalAllVisitorsDurationSeconds = Math.round(avg * totalVisitors);
    }
    const totalDurationFormatted = this.formatDurationArabic(totalAllVisitorsDurationSeconds);
    const avgDurationSeconds = totalVisitors > 0 ? Math.round(totalAllVisitorsDurationSeconds / totalVisitors) : 0;
    const avgDurationFormatted = this.formatDurationArabic(avgDurationSeconds);

    return {
      visitors,
      totalVisitors,
      totalDurationSeconds: totalAllVisitorsDurationSeconds,
      totalDurationFormatted,
      avgDurationFormatted,
      page,
      limit,
      totalPages,
    };

  }
}

