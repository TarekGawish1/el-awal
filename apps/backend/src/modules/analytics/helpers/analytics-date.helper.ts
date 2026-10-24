import { PrismaService } from "../../../core/database/prisma.service";
import { UserRole } from "@prisma/client";

/**
 * Calculates the exact start and end of a given calendar day in Africa/Cairo timezone.
 */
export function getCairoMidnight(date: Date = new Date()): {
  startOfToday: Date;
  endOfToday: Date;
} {
  const cairoDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
  }).format(date);
  const [year, month, day] = cairoDateStr.split("-").map(Number);
  const sample = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    hour: "numeric",
    hour12: false,
  }).formatToParts(sample);
  const cairoHourAtNoon = parseInt(
    parts.find((p) => p.type === "hour")?.value || "15",
    10,
  );
  const offsetHours = cairoHourAtNoon - 12;

  const startOfToday = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0) - offsetHours * 3600 * 1000,
  );
  const endOfToday = new Date(startOfToday.getTime() + 24 * 3600 * 1000 - 1);
  return { startOfToday, endOfToday };
}

/**
 * Resolves the start and end Date objects based on the requested filter range
 * normalized to Africa/Cairo local time.
 */
export function resolveDateRange(
  range: string = "week",
  from?: string,
  to?: string,
): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date();

  if (range === "custom" && from && to) {
    startDate = new Date(from);
    endDate = new Date(to);
    if (isNaN(startDate.getTime()))
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (isNaN(endDate.getTime())) endDate = new Date();
    if (to.length <= 10) {
      endDate.setHours(23, 59, 59, 999);
    }
    return { startDate, endDate };
  }

  switch (range) {
    case "today": {
      const { startOfToday, endOfToday } = getCairoMidnight(now);
      startDate = startOfToday;
      endDate = endOfToday;
      break;
    }
    case "week": {
      const { endOfToday } = getCairoMidnight(now);
      endDate = endOfToday;
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
      break;
    }
    case "month": {
      const cairoDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
      }).format(now);
      const [year, month] = cairoDateStr.split("-").map(Number);
      const { startOfToday } = getCairoMidnight(
        new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)),
      );
      const { endOfToday } = getCairoMidnight(now);
      startDate = startOfToday;
      endDate = endOfToday;
      break;
    }
    case "year": {
      const cairoDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
      }).format(now);
      const [year] = cairoDateStr.split("-").map(Number);
      const { startOfToday } = getCairoMidnight(
        new Date(Date.UTC(year, 0, 1, 12, 0, 0)),
      );
      const { endOfToday } = getCairoMidnight(now);
      startDate = startOfToday;
      endDate = endOfToday;
      break;
    }
    case "all": {
      startDate = new Date(2024, 0, 1, 0, 0, 0, 0);
      break;
    }
    default: {
      const { endOfToday } = getCairoMidnight(now);
      endDate = endOfToday;
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
    }
  }

  return { startDate, endDate };
}

/**
 * Identifies all visitor hashes associated with teachers or secretariat staff.
 */
export async function getExcludedTeacherHashes(prisma: PrismaService): Promise<string[]> {
  const teacherUsers = await prisma.user.findMany({
    where: { role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] } },
    select: { id: true },
  });
  const teacherUserIds = teacherUsers.map((u) => u.id);

  const teacherPageViews = await prisma.pageView.findMany({
    where: {
      OR: [
        { userId: { in: teacherUserIds } },
        { path: { startsWith: "/teacher" } },
        { path: { startsWith: "/secretariat" } },
        { path: { startsWith: "/assistant" } },
      ],
    },
    select: { visitorHash: true },
    distinct: ["visitorHash"],
  });

  return teacherPageViews.map((pv) => pv.visitorHash);
}

/**
 * Builds Prisma where condition to match telemetry records belonging to a teacher tenant.
 * Matches records explicitly tagged with tenantId, OR records belonging to enrolled students/parents.
 */
export function buildTenantTelemetryCondition(effectiveTenantId?: string): any {
  if (!effectiveTenantId) return {};

  return {
    OR: [
      { tenantId: effectiveTenantId },
      {
        user: {
          OR: [
            {
              studentProfile: {
                OR: [
                  { groupEnrollments: { some: { group: { teacherId: effectiveTenantId } } } },
                  { courseEnrollments: { some: { course: { teacherId: effectiveTenantId } } } },
                ],
              },
            },
            {
              parentProfile: {
                studentLinks: {
                  some: {
                    student: {
                      OR: [
                        { groupEnrollments: { some: { group: { teacherId: effectiveTenantId } } } },
                        { courseEnrollments: { some: { course: { teacherId: effectiveTenantId } } } },
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
      },
    ],
  };
}

