import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { TrackPageViewDto, AnalyticsQueryDto } from '../dto/analytics.dto';
import * as crypto from 'crypto';

export interface RecordPageViewParams extends TrackPageViewDto {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
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

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly HASH_SALT = process.env.ANALYTICS_SALT || 'el-awal-analytics-salt-2026';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a privacy-compliant SHA-256 visitor hash using IP and User-Agent.
   * Neither raw IP nor personal identifying information is stored in plaintext.
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
   * Guarantees that analytics logging never delays HTTP response cycles.
   */
  public async recordPageView(params: RecordPageViewParams): Promise<void> {
    try {
      const visitorHash = this.generateVisitorHash(params.ipAddress, params.userAgent);
      const isLanding = params.isLandingPage ?? (params.path === '/' || params.path === '' || params.path.startsWith('/#'));

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

      this.logger.debug(`[Analytics] Tracked: ${params.path} (landing: ${isLanding}, hash: ${visitorHash.slice(0, 8)})`);
    } catch (err: any) {
      // Non-blocking catch to ensure telemetry never impacts core operations
      this.logger.warn(`Failed to record page view telemetry: ${err?.message}`);
    }
  }

  /**
   * Resolves the start and end Date objects based on the requested filter range.
   */
  private resolveDateRange(range: string = 'week', from?: string, to?: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    if (range === 'custom' && from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      if (isNaN(startDate.getTime())) startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (isNaN(endDate.getTime())) endDate = new Date();
      // Ensure endDate spans the end of the day if just a date string (YYYY-MM-DD)
      if (to.length <= 10) {
        endDate.setHours(23, 59, 59, 999);
      }
      return { startDate, endDate };
    }

    switch (range) {
      case 'today': {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      case 'week': {
        // Last 7 full days
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'month': {
        // Current month from the 1st
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      }
      case 'year': {
        // Current year from Jan 1st
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
      }
      case 'all': {
        // All time: set to system launch epoch
        startDate = new Date(2024, 0, 1, 0, 0, 0, 0);
        break;
      }
      default: {
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
      }
    }

    return { startDate, endDate };
  }

  /**
   * Retrieves aggregated analytics statistics with optimized query paths.
   */
  public async getStats(query: AnalyticsQueryDto, userTenantId?: string): Promise<AnalyticsStatsResponse> {
    const scope = query.scope || 'all';
    const range = query.range || 'week';
    const { startDate, endDate } = this.resolveDateRange(range, query.from, query.to);

    // Build base where clause
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
      // 'all' (combined)
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

    // 1. Total Page Views
    const totalViews = await this.prisma.pageView.count({ where });

    // 2. Unique Visitors (distinct count on visitorHash)
    const uniqueGroups = await this.prisma.pageView.groupBy({
      by: ['visitorHash'],
      where,
    });
    const uniqueVisitors = uniqueGroups.length;

    // 3. Landing vs System Views Breakdown
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

    // 4. Top Visited Pages
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

    // 5. Time Series Trend (Daily buckets or Hourly for today)
    const timeSeries = await this.buildTimeSeries(where, range, startDate, endDate);

    // 6. Device Breakdown (Desktop, Mobile, Tablet)
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
   * Builds time-series buckets with zero-filled continuous points for accurate charts.
   */
  private async buildTimeSeries(where: any, range: string, startDate: Date, endDate: Date) {
    // Fetch raw views for time grouping
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
      // 24 Hourly buckets: 00:00 to 23:00
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
        const d = new Date(v.createdAt);
        const key = `${d.getHours().toString().padStart(2, '0')}:00`;
        const bucket = bucketsMap.get(key);
        if (bucket) {
          bucket.views++;
          bucket.visitors.add(v.visitorHash);
          if (v.isLandingPage) bucket.landing++;
          else bucket.system++;
        }
      }
    } else {
      // Daily buckets: iterate each day from startDate to endDate
      const current = new Date(startDate);
      while (current <= endDate) {
        const yyyyMmDd = current.toISOString().split('T')[0];
        const dayLabel = current.toLocaleDateString('ar-EG', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        bucketsMap.set(yyyyMmDd, {
          label: dayLabel,
          date: yyyyMmDd,
          views: 0,
          visitors: new Set<string>(),
          landing: 0,
          system: 0,
        });
        current.setDate(current.getDate() + 1);
      }

      for (const v of views) {
        const yyyyMmDd = new Date(v.createdAt).toISOString().split('T')[0];
        const bucket = bucketsMap.get(yyyyMmDd);
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
      take: 1000, // Statistically significant sample to keep query extremely fast
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
