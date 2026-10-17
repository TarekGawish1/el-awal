import { PrismaService } from "../../../core/database/prisma.service";

/**
 * Builds time series buckets for the specified range.
 */
export async function buildTimeSeries(
  prisma: PrismaService,
  where: any,
  range: string,
  startDate: Date,
  endDate: Date,
) {
  const views = await prisma.pageView.findMany({
    where,
    select: {
      createdAt: true,
      visitorHash: true,
      isLandingPage: true,
    },
    orderBy: { createdAt: "asc" },
    take: 20000,
  });

  const isToday = range === "today";
  const isMonthly = range === "year";
  const isYearly = range === "all";
  const bucketsMap = new Map<
    string,
    {
      label: string;
      date: string;
      views: number;
      visitors: Set<string>;
      landing: number;
      system: number;
    }
  >();

  if (isToday) {
    // Hourly buckets for today
    for (let hour = 0; hour < 24; hour++) {
      const key = `${hour.toString().padStart(2, "0")}:00`;
      const hourLabel = `${hour % 12 || 12} ${hour < 12 ? "ص" : "م"}`;
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
      const cairoHourStr = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Cairo",
        hour: "numeric",
        hour12: false,
      }).format(new Date(v.createdAt));
      const cairoHour = parseInt(cairoHourStr, 10);
      const key = `${(cairoHour % 24).toString().padStart(2, "0")}:00`;
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
      const cairoStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
      }).format(current);
      const [yr] = cairoStr.split("-").map(Number);
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

      current.setFullYear(current.getFullYear() + 1);
    }

    for (const v of views) {
      const cairoStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
      }).format(new Date(v.createdAt));
      const [yr] = cairoStr.split("-").map(Number);
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
    current.setDate(1);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      const cairoStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
      }).format(current);
      const [yr, mo] = cairoStr.split("-").map(Number);
      const monthKey = `${yr}-${mo.toString().padStart(2, "0")}`;

      if (!bucketsMap.has(monthKey)) {
        const monthLabel = current.toLocaleDateString("ar-EG-u-nu-latn", {
          timeZone: "Africa/Cairo",
          month: "long",
          year: "numeric",
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

      current.setMonth(current.getMonth() + 1);
    }

    for (const v of views) {
      const cairoStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
      }).format(new Date(v.createdAt));
      const [yr, mo] = cairoStr.split("-").map(Number);
      const monthKey = `${yr}-${mo.toString().padStart(2, "0")}`;
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
      const cairoDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
      }).format(current);
      const dayLabel = current.toLocaleDateString("ar-EG-u-nu-latn", {
        timeZone: "Africa/Cairo",
        weekday: "short",
        month: "short",
        day: "numeric",
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
      const cairoDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
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
export async function buildEnhancedDeviceBreakdown(prisma: PrismaService, where: any, totalViews: number) {
  const empty = {
    devices: [
      {
        device: "Desktop" as const,
        labelAr: "أجهزة الكمبيوتر",
        count: 0,
        percentage: 0,
      },
      {
        device: "Mobile" as const,
        labelAr: "الهواتف الذكية",
        count: 0,
        percentage: 0,
      },
      {
        device: "Tablet" as const,
        labelAr: "الأجهزة اللوحية",
        count: 0,
        percentage: 0,
      },
    ],
    osBreakdown: [] as {
      os: string;
      labelAr: string;
      count: number;
      percentage: number;
    }[],
    browserBreakdown: [] as {
      browser: string;
      labelAr: string;
      count: number;
      percentage: number;
    }[],
  };

  if (totalViews === 0) return empty;

  const sampleViews = await prisma.pageView.findMany({
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
    Android: 0,
    iOS: 0,
    Windows: 0,
    macOS: 0,
    Linux: 0,
    Other: 0,
  };

  // Browser counters
  const browserCounts: Record<string, number> = {
    Chrome: 0,
    Safari: 0,
    Firefox: 0,
    Edge: 0,
    Opera: 0,
    Other: 0,
  };

  for (const v of sampleViews) {
    const ua = v.userAgent || "";
    const ual = ua.toLowerCase();

    // --- Device ---
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      tabletCount++;
    } else if (
      /mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)
    ) {
      mobileCount++;
    } else {
      desktopCount++;
    }

    // --- OS ---
    if (/android/i.test(ua)) {
      osCounts["Android"]++;
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      osCounts["iOS"]++;
    } else if (/windows nt|windows phone/i.test(ua)) {
      osCounts["Windows"]++;
    } else if (/macintosh|mac os x/i.test(ua)) {
      osCounts["macOS"]++;
    } else if (/linux/i.test(ual)) {
      osCounts["Linux"]++;
    } else {
      osCounts["Other"]++;
    }

    // --- Browser (order matters: Edge before Chrome, Opera before Chrome) ---
    if (/edg\//i.test(ua) || /edghtml/i.test(ua)) {
      browserCounts["Edge"]++;
    } else if (/opr\//i.test(ua) || /opera/i.test(ua)) {
      browserCounts["Opera"]++;
    } else if (/chrome|chromium/i.test(ua)) {
      browserCounts["Chrome"]++;
    } else if (/firefox|fxios/i.test(ua)) {
      browserCounts["Firefox"]++;
    } else if (/safari/i.test(ua)) {
      browserCounts["Safari"]++;
    } else {
      browserCounts["Other"]++;
    }
  }

  const sample = sampleViews.length || 1;

  // Scale device counts to totalViews
  const desktopRatio = desktopCount / sample;
  const mobileRatio = mobileCount / sample;
  const tabletRatio = tabletCount / sample;
  const scaledDesktop = Math.round(desktopRatio * totalViews);
  const scaledMobile = Math.round(mobileRatio * totalViews);
  const scaledTablet = totalViews - scaledDesktop - scaledMobile;

  const devices = [
    {
      device: "Desktop" as const,
      labelAr: "أجهزة الكمبيوتر",
      count: Math.max(0, scaledDesktop),
      percentage: Math.round(desktopRatio * 100),
    },
    {
      device: "Mobile" as const,
      labelAr: "الهواتف الذكية",
      count: Math.max(0, scaledMobile),
      percentage: Math.round(mobileRatio * 100),
    },
    {
      device: "Tablet" as const,
      labelAr: "الأجهزة اللوحية",
      count: Math.max(0, scaledTablet),
      percentage: Math.round(tabletRatio * 100),
    },
  ];

  // OS breakdown — filter zeros, sort descending
  const OS_LABELS: Record<string, string> = {
    Android: "أندرويد",
    iOS: "آيفون / iOS",
    Windows: "ويندوز",
    macOS: "ماك (macOS)",
    Linux: "لينكس",
    Other: "أخرى",
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
    Chrome: "جوجل كروم",
    Safari: "سافاري",
    Firefox: "فايرفوكس",
    Edge: "مايكروسوفت إيج",
    Opera: "أوبرا",
    Other: "أخرى",
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
