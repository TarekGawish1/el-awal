import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/database/prisma.service";
import { GeoLocationService } from "./geo-location.service";
import { GeoRankingQueryDto } from "../dto/analytics.dto";
import { GeoRankingItem } from "../types/analytics.types";
import { resolveDateRange, getExcludedTeacherHashes } from "../helpers/analytics-date.helper";
import { UserRole } from "@prisma/client";

@Injectable()
export class GeoAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoLocationService: GeoLocationService,
  ) {}

  public async getGeoRanking(
    query: GeoRankingQueryDto,
    userTenantId?: string,
  ): Promise<{
    items: GeoRankingItem[];
    totalVisits: number;
    groupBy: "country" | "city";
  }> {
    const groupBy = query.groupBy || "city";
    const scope = query.scope || "all";
    const { startDate, endDate } = resolveDateRange(
      query.range,
      query.from,
      query.to,
    );
    const effectiveTenantId = query.tenantId || userTenantId;

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

    // We collect counts in a Map: locationName -> { count, uniqueHashes }
    const locationMap = new Map<
      string,
      { count: number; hashes: Set<string> }
    >();

    // 1. Landing Visits (if scope is landing or all)
    if (scope === "landing" || scope === "all") {
      const landingWhere = {
        createdAt: { gte: startDate, lte: endDate },
        ...(excludedTeacherHashes.length > 0
          ? { visitorHash: { notIn: excludedTeacherHashes } }
          : {}),
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
        let country = lv.country || "مصر";
        if (country === "SG" || country === "سنغافورة") {
          country = "سنغافورة";
          if (!city || city === "عام" || city === "خارج مصر") city = "سنغافورة";
        } else if (city === "عام" || city === "خارج مصر") {
          city = country;
        }

        const key = groupBy === "country" ? country : city || "غير محدد";
        if (!locationMap.has(key)) {
          locationMap.set(key, { count: 0, hashes: new Set<string>() });
        }
        const entry = locationMap.get(key)!;
        entry.count++;
        entry.hashes.add(lv.visitorHash);
      }
    }

    // 2. User Sessions & Platform Views (if scope is platform or all)
    if (scope === "platform" || scope === "all") {
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
          take: 10000,
        }),
      ]);

      // Aggregate platform pageviews with embedded geo
      for (const pv of platformPageViews || []) {
        const meta = pv.metadata as any;
        let city = meta?.city;
        let country = meta?.country;
        if (country === "SG" || country === "سنغافورة") {
          country = "سنغافورة";
          if (!city || city === "عام" || city === "خارج مصر") city = "سنغافورة";
        } else if (city === "عام" || city === "خارج مصر") {
          city = country || "خارج مصر";
        }

        if (city || country) {
          const key =
            groupBy === "country" ? country || "مصر" : city || "غير محدد";
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
        let country = us.country || "مصر";
        if (country === "SG" || country === "سنغافورة") {
          country = "سنغافورة";
          if (!city || city === "عام" || city === "خارج مصر") city = "سنغافورة";
        } else if (city === "عام" || city === "خارج مصر") {
          city = country;
        }

        const key = groupBy === "country" ? country : city || "غير محدد";
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

    const totalVisits = Array.from(locationMap.values()).reduce(
      (sum, val) => sum + val.count,
      0,
    );

    // Inline country code -> Arabic name map for normalizing any raw ISO codes stored in DB
    const LEGACY_COUNTRY_CODES: Record<string, string> = {
      EG: "مصر",
      SA: "المملكة العربية السعودية",
      AE: "الإمارات العربية المتحدة",
      KW: "الكويت",
      QA: "قطر",
      OM: "سلطنة عمان",
      BH: "البحرين",
      JO: "الأردن",
      IQ: "العراق",
      LB: "لبنان",
      PS: "فلسطين",
      SY: "سوريا",
      YE: "اليمن",
      LY: "ليبيا",
      SD: "السودان",
      DZ: "الجزائر",
      TN: "تونس",
      MA: "المغرب",
      US: "الولايات المتحدة",
      GB: "المملكة المتحدة",
      DE: "ألمانيا",
      FR: "فرنسا",
      TR: "تركيا",
      IT: "إيطاليا",
      CA: "كندا",
      AU: "أستراليا",
      NL: "هولندا",
      SE: "السويد",
      NO: "النرويج",
      DK: "الدنمارك",
      CH: "سويسرا",
      RU: "روسيا",
      SG: "سنغافورة",
      JP: "اليابان",
      CN: "الصين",
      IN: "الهند",
      KR: "كوريا الجنوبية",
      PK: "باكستان",
      ID: "إندونيسيا",
      MY: "ماليزيا",
      TH: "تايلاند",
      HK: "هونج كونج",
      BR: "البرازيل",
      MX: "المكسيك",
      NG: "نيجيريا",
      ZA: "جنوب أفريقيا",
    };

    const sorted = Array.from(locationMap.entries())
      .map(([name, stat]) => {
        // Normalize legacy entries and raw ISO codes (e.g. "SG") stored in DB
        let normalizedName = name;
        if (normalizedName === "عام" || normalizedName === "خارج مصر") {
          normalizedName = "سنغافورة";
        }
        // If the name looks like a raw 2-letter ISO code, translate it
        if (
          /^[A-Z]{2}$/.test(normalizedName) &&
          LEGACY_COUNTRY_CODES[normalizedName]
        ) {
          normalizedName = LEGACY_COUNTRY_CODES[normalizedName];
        }
        return {
          name: normalizedName,
          visitCount: stat.count,
          uniqueVisitors: stat.hashes.size,
          percentage:
            totalVisits > 0 ? Math.round((stat.count / totalVisits) * 100) : 0,
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
        [] as {
          name: string;
          visitCount: number;
          uniqueVisitors: number;
          percentage: number;
        }[],
      )
      .map((item) => ({
        ...item,
        percentage:
          totalVisits > 0
            ? Math.round((item.visitCount / totalVisits) * 100)
            : 0,
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
}
