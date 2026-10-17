import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/database/prisma.service";
import { GeoLocationService } from "./geo-location.service";
import { VisitorListQueryDto } from "../dto/analytics.dto";
import { VisitorListResponse } from "../types/analytics.types";
import { resolveDateRange, getExcludedTeacherHashes } from "../helpers/analytics-date.helper";
import {
  formatDurationArabic,
  calculateTotalActiveDuration,
  mapVisitorsToResponseItems,
} from "../helpers/visitor-analytics.helper";
import { UserRole } from "@prisma/client";

@Injectable()
export class VisitorAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geoLocationService: GeoLocationService,
  ) {}

  public async getVisitorsList(
    query: VisitorListQueryDto,
    userTenantId?: string,
  ): Promise<VisitorListResponse> {
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

    if (scope === "landing") {
      scopeCondition = { isLandingPage: true };
    } else if (scope === "system") {
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
            { fullName: { contains: searchTerm, mode: "insensitive" } },
            { phone: { contains: searchTerm } },
            { email: { contains: searchTerm, mode: "insensitive" } },
            {
              studentProfile: {
                studentCode: { contains: searchTerm, mode: "insensitive" },
              },
            },
            {
              parentProfile: {
                studentLinks: {
                  some: {
                    student: {
                      user: {
                        fullName: { contains: searchTerm, mode: "insensitive" },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        select: { id: true },
        take: 100,
      });
      searchUserIds = matchedUsers.map((u) => u.id);
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

    const requestedRole = (query.role || "ALL").toUpperCase();
    let roleWhere: any = {};
    if (requestedRole === "STUDENT" || requestedRole === "STUDENTS") {
      roleWhere = { user: { role: UserRole.STUDENT } };
    } else if (requestedRole === "PARENT" || requestedRole === "PARENTS") {
      roleWhere = { user: { role: UserRole.PARENT } };
    } else if (requestedRole === "GUEST" || requestedRole === "GUESTS") {
      roleWhere = { userId: null };
    } else if (requestedRole === "REGISTERED") {
      roleWhere = { userId: { not: null } };
    }

    const where: any = {
      ...baseDateCondition,
      ...scopeCondition,
      ...teacherExclusion,
      ...roleWhere,
      ...(searchUserIds !== undefined ? { userId: { in: searchUserIds } } : {}),
    };

    const groups = await this.prisma.pageView.groupBy({
      by: ["visitorHash"],
      where,
      _count: { visitorHash: true },
      _max: { createdAt: true },
      _min: { createdAt: true },
    });

    if (query.sortBy === "visits") {
      groups.sort(
        (a, b) => (b._count?.visitorHash || 0) - (a._count?.visitorHash || 0),
      );
    } else {
      groups.sort((a, b) => {
        const timeA = a._max?.createdAt
          ? new Date(a._max.createdAt).getTime()
          : 0;
        const timeB = b._max?.createdAt
          ? new Date(b._max.createdAt).getTime()
          : 0;
        return timeB - timeA;
      });
    }

    const totalVisitors = groups.length;
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 30));
    const totalPages = Math.ceil(totalVisitors / limit) || 1;
    const pagedGroups = groups.slice((page - 1) * limit, page * limit);
    const pagedHashes = pagedGroups.map((g) => g.visitorHash);

    const baseFilterWithoutRole = {
      ...baseDateCondition,
      ...scopeCondition,
      ...teacherExclusion,
    };

    const roleGroups = await this.prisma.pageView.findMany({
      where: {
        ...baseFilterWithoutRole,
        userId: { not: null },
      },
      select: {
        userId: true,
        user: { select: { role: true } },
      },
      distinct: ["userId"],
    });

    let overallStudentsCount = 0;
    let overallParentsCount = 0;
    for (const rg of roleGroups) {
      if (rg.user?.role === UserRole.STUDENT) overallStudentsCount++;
      else if (rg.user?.role === UserRole.PARENT) overallParentsCount++;
    }

    const allGroupsCount =
      requestedRole === "ALL"
        ? totalVisitors
        : (
            await this.prisma.pageView.groupBy({
              by: ["visitorHash"],
              where: baseFilterWithoutRole,
            })
          ).length;

    const overallGuestsCount = Math.max(
      0,
      allGroupsCount - (overallStudentsCount + overallParentsCount),
    );

    if (pagedHashes.length === 0) {
      return {
        visitors: [],
        totalVisitors,
        studentsCount: overallStudentsCount,
        parentsCount: overallParentsCount,
        guestsCount: overallGuestsCount,
        page,
        limit,
        totalPages,
        totalDurationSeconds: 0,
        totalDurationFormatted: "0 دقيقة",
        avgDurationFormatted: "0 دقيقة",
      };
    }

    const views = await this.prisma.pageView.findMany({
      where: {
        visitorHash: { in: pagedHashes },
        ...baseDateCondition,
        ...scopeCondition,
        ...teacherExclusion,
      },
      orderBy: { createdAt: "desc" },
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
            parentProfile: {
              select: {
                relationshipType: true,
                studentLinks: {
                  select: {
                    student: {
                      select: {
                        studentCode: true,
                        gradeLevel: true,
                        user: {
                          select: {
                            id: true,
                            fullName: true,
                            phone: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      take: 2000,
    });

    const landingVisits = await this.prisma.landingVisit.findMany({
      where: {
        visitorHash: { in: pagedHashes },
        ...(excludedTeacherHashes.length > 0
          ? { visitorHash: { notIn: excludedTeacherHashes } }
          : {}),
      },
      select: { visitorHash: true, city: true, country: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const landingGeoMap = new Map<
      string,
      { city?: string; country?: string }
    >();
    for (const lv of landingVisits) {
      if (!landingGeoMap.has(lv.visitorHash)) {
        landingGeoMap.set(lv.visitorHash, {
          city: lv.city || undefined,
          country: lv.country || undefined,
        });
      }
    }

    const viewsMap = new Map<string, typeof views>();
    for (const v of views) {
      const list = viewsMap.get(v.visitorHash) || [];
      list.push(v);
      viewsMap.set(v.visitorHash, list);
    }

    const userIds = views
      .filter(
        (v) =>
          v.user?.id &&
          v.user.role !== UserRole.TEACHER &&
          v.user.role !== UserRole.SECRETARIAT,
      )
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

    const visitors = mapVisitorsToResponseItems(
      pagedGroups,
      viewsMap,
      landingGeoMap,
      sessionDurationsByUserId,
    );

    const {
      totalDurationSeconds: totalAllVisitorsDurationSeconds,
      avgDurationSeconds,
    } = await calculateTotalActiveDuration(this.prisma, where, startDate, endDate);
    const totalDurationFormatted = formatDurationArabic(
      totalAllVisitorsDurationSeconds,
    );
    const avgDurationFormatted = formatDurationArabic(avgDurationSeconds);

    return {
      visitors,
      totalVisitors,
      studentsCount: overallStudentsCount,
      parentsCount: overallParentsCount,
      guestsCount: overallGuestsCount,
      totalDurationSeconds: totalAllVisitorsDurationSeconds,
      totalDurationFormatted,
      avgDurationFormatted,
      page,
      limit,
      totalPages,
    };
  }
}
