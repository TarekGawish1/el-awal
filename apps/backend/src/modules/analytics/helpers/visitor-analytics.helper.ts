import { PrismaService } from "../../../core/database/prisma.service";
import { UserRole } from "@prisma/client";
import {
  VisitorListItem,
  IndividualVisitItem,
} from "../types/analytics.types";

/**
 * Helper to parse device category, OS, and browser from User-Agent string.
 */
export function parseUserAgentString(ua: string = ""): {
  device: "Desktop" | "Mobile" | "Tablet";
  os: string;
  browser: string;
} {
  const ual = ua.toLowerCase();
  let device: "Desktop" | "Mobile" | "Tablet" = "Desktop";
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device = "Tablet";
  } else if (
    /mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)
  ) {
    device = "Mobile";
  }

  let os = "Other";
  if (/android/i.test(ua)) {
    os = "Android";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = "iOS";
  } else if (/windows nt|windows phone/i.test(ua)) {
    os = "Windows";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "macOS";
  } else if (/linux/i.test(ual)) {
    os = "Linux";
  }

  let browser = "Other";
  if (/edg\//i.test(ua) || /edghtml/i.test(ua)) {
    browser = "Edge";
  } else if (/opr\//i.test(ua) || /opera/i.test(ua)) {
    browser = "Opera";
  } else if (/chrome|chromium/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua)) {
    browser = "Safari";
  }

  return { device, os, browser };
}

/**
 * Calculates realistic browsing/engagement duration in seconds for a visitor based on visits timestamps
 * or authenticated user session pings.
 */
export function calculateVisitorDuration(
  views: { createdAt: Date | string; metadata?: any }[],
  sessionsDuration: number = 0,
): number {
  if (sessionsDuration > 0) {
    return sessionsDuration;
  }
  if (!views || views.length === 0) return 0;

  const sorted = [...views].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  let totalSeconds = 0;
  for (let i = 0; i < sorted.length; i++) {
    const currentView = sorted[i];
    const currentMeta = (currentView as any).metadata as Record<string, any> | undefined;
    const currentActive = Number(currentMeta?.activeDurationSeconds);

    let dur = 45;
    if (currentActive && currentActive > 0) {
      dur = currentActive;
    } else if (i < sorted.length - 1) {
      const nextView = sorted[i + 1];
      const diffSec = Math.round(
        (new Date(nextView.createdAt).getTime() - new Date(currentView.createdAt).getTime()) / 1000,
      );
      if (diffSec > 0 && diffSec <= 1800) {
        dur = Math.max(diffSec, 15);
      }
    }
    totalSeconds += dur;
  }

  return totalSeconds;
}

/**
 * Formats duration in seconds to a human-readable Arabic string.
 */
export function formatDurationArabic(seconds: number = 0): string {
  if (seconds <= 0) return "أقل من دقيقة";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSecs = seconds % 60;

  if (hours > 0) {
    return `${hours} ساعة ${minutes > 0 ? `و ${minutes} دقيقة` : ""}`;
  }
  if (minutes > 0) {
    return `${minutes} دقيقة ${remainingSecs > 10 ? `و ${remainingSecs} ثانية` : ""}`;
  }
  return `${remainingSecs} ثانية`;
}

/**
 * Aggregates active platform browsing duration across all visitors in a time window.
 */
export async function calculateTotalActiveDuration(
  prisma: PrismaService,
  where: any,
  startDate: Date,
  endDate: Date,
): Promise<{ totalDurationSeconds: number; avgDurationSeconds: number }> {
  const views = await prisma.pageView.findMany({
    where,
    select: {
      visitorHash: true,
      createdAt: true,
      userId: true,
      metadata: true,
    },
    orderBy: { createdAt: "asc" },
    take: 10000,
  });

  if (views.length === 0) {
    return { totalDurationSeconds: 0, avgDurationSeconds: 0 };
  }

  const viewsByVisitor = new Map<string, { createdAt: Date; metadata?: any }[]>();
  const userIds = new Set<string>();

  for (const v of views) {
    if (!viewsByVisitor.has(v.visitorHash)) {
      viewsByVisitor.set(v.visitorHash, []);
    }
    viewsByVisitor.get(v.visitorHash)!.push({ createdAt: v.createdAt, metadata: v.metadata });
    if (v.userId) userIds.add(v.userId);
  }

  const sessionDurationsByUserId = new Map<string, number>();
  if (userIds.size > 0) {
    const userSessions = await prisma.userSession.findMany({
      where: {
        userId: { in: Array.from(userIds) },
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

  let totalDurationSeconds = 0;
  for (const [visitorHash, vViews] of viewsByVisitor.entries()) {
    const firstViewWithUser = views.find(
      (v) => v.visitorHash === visitorHash && v.userId,
    );
    const userSessionSecs = firstViewWithUser?.userId
      ? sessionDurationsByUserId.get(firstViewWithUser.userId) || 0
      : 0;

    const visitorDuration = calculateVisitorDuration(
      vViews,
      userSessionSecs,
    );
    totalDurationSeconds += visitorDuration;
  }

  const uniqueCount = viewsByVisitor.size;
  const avgDurationSeconds =
    uniqueCount > 0 ? Math.round(totalDurationSeconds / uniqueCount) : 0;

  return { totalDurationSeconds, avgDurationSeconds };
}

/**
 * Maps raw visitor group rows into structured VisitorListItem models.
 */
export function mapVisitorsToResponseItems(
  pagedGroups: any[],
  viewsMap: Map<string, any[]>,
  landingGeoMap: Map<string, { city?: string; country?: string }>,
  sessionDurationsByUserId: Map<string, number>,
): VisitorListItem[] {
  return pagedGroups.map((g) => {
    const visitorViews = viewsMap.get(g.visitorHash) || [];
    const firstView = visitorViews[0];
    const userView = visitorViews.find((v) => v.user);

    const landingGeo = landingGeoMap.get(g.visitorHash);
    let city = "دمياط";
    let country = "مصر";

    for (const v of visitorViews) {
      const meta = v.metadata as any;
      if (meta?.city && String(meta.city).trim()) {
        city = String(meta.city).trim();
        if (meta?.country) country = String(meta.country).trim();
        break;
      }
    }
    if (city === "دمياط" && landingGeo?.city) {
      city = landingGeo.city;
      if (landingGeo.country) country = landingGeo.country;
    }

    const ua = firstView?.userAgent || "";
    const { device, os, browser } = parseUserAgentString(ua);

    const pageCounts = new Map<string, number>();
    for (const v of visitorViews) {
      pageCounts.set(v.path, (pageCounts.get(v.path) || 0) + 1);
    }
    const topPages = Array.from(pageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([p]) => p);

    const chronologicalViews = [...visitorViews].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const viewDurationMap = new Map<string, number>();
    for (let i = 0; i < chronologicalViews.length; i++) {
      const currentView = chronologicalViews[i];
      const currentMeta = currentView.metadata as any;
      const currentActive = Number(currentMeta?.activeDurationSeconds);

      let dur = 45;
      if (currentActive && currentActive > 0) {
        dur = currentActive;
      } else if (i < chronologicalViews.length - 1) {
        const nextView = chronologicalViews[i + 1];
        const diffSec = Math.round(
          (new Date(nextView.createdAt).getTime() - new Date(currentView.createdAt).getTime()) / 1000,
        );
        if (diffSec > 0 && diffSec <= 1800) {
          dur = Math.max(diffSec, 15);
        }
      }
      viewDurationMap.set(currentView.id, dur);
    }

    const individualVisits: IndividualVisitItem[] = visitorViews.map((v) => {
      const meta = v.metadata as any;
      const dur = viewDurationMap.get(v.id) || 45;
      return {
        id: v.id,
        path: v.path,
        isLandingPage: v.isLandingPage,
        createdAt: v.createdAt.toISOString(),
        referrer: v.referrer,
        userAgent: v.userAgent,
        city: meta?.city || city,
        country: meta?.country || country,
        durationSeconds: dur,
        durationFormatted: formatDurationArabic(dur),
      };
    });

    const userSessionSecs = userView?.user
      ? sessionDurationsByUserId.get(userView.user.id) || 0
      : 0;
    const durationSeconds = calculateVisitorDuration(
      visitorViews,
      userSessionSecs,
    );
    const totalDurationFormatted = formatDurationArabic(durationSeconds);

    return {
      visitorHash: g.visitorHash,
      shortHash: g.visitorHash.slice(0, 8),
      totalVisits: g._count?.visitorHash || visitorViews.length,
      totalDurationSeconds: durationSeconds,
      totalDurationFormatted,
      firstSeenAt: g._min?.createdAt
        ? new Date(g._min.createdAt).toISOString()
        : new Date().toISOString(),
      lastSeenAt: g._max?.createdAt
        ? new Date(g._max.createdAt).toISOString()
        : new Date().toISOString(),
      user: userView?.user
        ? {
            id: userView.user.id,
            name: userView.user.fullName,
            email: userView.user.email,
            phone: userView.user.phone || undefined,
            role: userView.user.role,
            studentCode:
              userView.user.studentProfile?.studentCode || undefined,
            gradeLevel: userView.user.studentProfile?.gradeLevel || undefined,
            parentInfo:
              userView.user.role === UserRole.PARENT && (userView.user as any).parentProfile
                ? {
                    relationshipType:
                      (userView.user as any).parentProfile.relationshipType || "ولي أمر",
                    children: (
                      (userView.user as any).parentProfile.studentLinks || []
                    ).map((link: any) => ({
                      studentName: link.student?.user?.fullName || "طالب مسجل",
                      studentCode: link.student?.studentCode || undefined,
                      gradeLevel: link.student?.gradeLevel || undefined,
                      phone: link.student?.user?.phone || undefined,
                    })),
                  }
                : null,
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
}
