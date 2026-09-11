import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly HASH_SALT = process.env.ANALYTICS_SALT || 'el-awal-analytics-salt-2026';

  constructor(
    private readonly prisma: PrismaService,
    private readonly geoLocationService: GeoLocationService,
  ) {}

  /**
   * Generates a privacy-compliant SHA-256 visitor hash using IP and User-Agent.
   */
  public generateVisitorHash(ip?: string, userAgent?: string): string {
    const cleanIp = (ip || '127.0.0.1').replace(/^::ffff:/, '').trim();
    const cleanUa = (userAgent || 'unknown').trim();
    return crypto
      .createHash('sha256')
      .update(`${cleanIp}::${cleanUa}::${this.HASH_SALT}`)
      .digest('hex');
  }

  /**
   * Non-blocking fire-and-forget page view persistence.
   */
  public async recordPageView(params: RecordPageViewParams): Promise<void> {
    try {
      const visitorHash = this.generateVisitorHash(params.ipAddress, params.userAgent);
      const isLanding =
        params.isLandingPage ??
        (params.path === '/' || params.path === '' || params.path.startsWith('/#'));

      // If landing page, also record in dedicated LandingVisit table with resolved geo
      if (isLanding) {
        const geo = await this.geoLocationService.resolveAsync(params.ipAddress, params.headers || {}, {
          city: params.city,
          country: params.country,
        });
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
          metadata: params.metadata || {},
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

    const where = {
      ...baseDateCondition,
      ...scopeCondition,
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
    };
    const systemWhere = {
      ...baseDateCondition,
      isLandingPage: false,
      ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
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
    const devices = await this.buildDeviceBreakdown(where, totalViews);

    return {
      summary: {
        totalViews,
        uniqueVisitors,
        landingViews,
        systemViews,
        viewsPerVisitor,
      },
      timeSeries,
      topPages,
      devices,
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

    const where = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
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

    // We collect counts in a Map: locationName -> { count, uniqueHashes }
    const locationMap = new Map<string, { count: number; hashes: Set<string> }>();

    // 1. Landing Visits (if scope is landing or all)
    if (scope === 'landing' || scope === 'all') {
      const landingWhere = {
        createdAt: { gte: startDate, lte: endDate },
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
        const key = groupBy === 'country' ? lv.country || 'مصر' : lv.city || 'غير محدد';
        if (!locationMap.has(key)) {
          locationMap.set(key, { count: 0, hashes: new Set<string>() });
        }
        const entry = locationMap.get(key)!;
        entry.count++;
        entry.hashes.add(lv.visitorHash);
      }
    }

    // 2. User Sessions (if scope is platform or all)
    if (scope === 'platform' || scope === 'all') {
      const sessionWhere: any = {
        startedAt: { gte: startDate, lte: endDate },
        ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      };

      const userSessions = await this.prisma.userSession.findMany({
        where: sessionWhere,
        select: {
          country: true,
          city: true,
          userId: true,
        },
      });

      for (const us of userSessions) {
        const key = groupBy === 'country' ? us.country || 'مصر' : us.city || 'غير محدد';
        if (!locationMap.has(key)) {
          locationMap.set(key, { count: 0, hashes: new Set<string>() });
        }
        const entry = locationMap.get(key)!;
        entry.count++;
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

    const sorted = Array.from(locationMap.entries())
      .map(([name, stat]) => ({
        name,
        visitCount: stat.count,
        uniqueVisitors: stat.hashes.size,
        percentage: totalVisits > 0 ? Math.round((stat.count / totalVisits) * 100) : 0,
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
    const bucketsMap = new Map<
      string,
      { label: string; date: string; views: number; visitors: Set<string>; landing: number; system: number }
    >();

    if (isToday) {
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
    } else {
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
   * Infers device category from User-Agent patterns.
   */
  private async buildDeviceBreakdown(where: any, totalViews: number) {
    if (totalViews === 0) {
      return [
        { device: 'Desktop' as const, labelAr: 'أجهزة الكمبيوتر', count: 0, percentage: 0 },
        { device: 'Mobile' as const, labelAr: 'الهواتف الذكية', count: 0, percentage: 0 },
        { device: 'Tablet' as const, labelAr: 'الأجهزة اللوحية', count: 0, percentage: 0 },
      ];
    }

    const sampleViews = await this.prisma.pageView.findMany({
      where,
      select: { userAgent: true },
      take: 1000,
    });

    let mobileCount = 0;
    let tabletCount = 0;
    let desktopCount = 0;

    for (const v of sampleViews) {
      const ua = (v.userAgent || '').toLowerCase();
      if (/tablet|ipad|playbook|silk/i.test(ua)) {
        tabletCount++;
      } else if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
        mobileCount++;
      } else {
        desktopCount++;
      }
    }

    const sampleTotal = sampleViews.length || 1;
    const desktopRatio = desktopCount / sampleTotal;
    const mobileRatio = mobileCount / sampleTotal;
    const tabletRatio = tabletCount / sampleTotal;

    const scaledDesktop = Math.round(desktopRatio * totalViews);
    const scaledMobile = Math.round(mobileRatio * totalViews);
    const scaledTablet = totalViews - (scaledDesktop + scaledMobile);

    return [
      {
        device: 'Desktop' as const,
        labelAr: 'أجهزة الكمبيوتر',
        count: Math.max(0, scaledDesktop),
        percentage: Math.round(desktopRatio * 100),
      },
      {
        device: 'Mobile' as const,
        labelAr: 'الهواتف الذكية',
        count: Math.max(0, scaledMobile),
        percentage: Math.round(mobileRatio * 100),
      },
      {
        device: 'Tablet' as const,
        labelAr: 'الأجهزة اللوحية',
        count: Math.max(0, scaledTablet),
        percentage: Math.round(tabletRatio * 100),
      },
    ];
  }
}
