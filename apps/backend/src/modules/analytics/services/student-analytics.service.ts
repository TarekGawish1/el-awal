import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/database/prisma.service";
import { StudentRankingQueryDto } from "../dto/analytics.dto";
import { StudentLeaderboardItem } from "../types/analytics.types";
import { resolveDateRange } from "../helpers/analytics-date.helper";
import { UserRole } from "@prisma/client";

@Injectable()
export class StudentAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getStudentEngagementLeaderboard(
    query: StudentRankingQueryDto,
    userTenantId?: string,
  ): Promise<{
    students: StudentLeaderboardItem[];
    sortBy: "duration" | "visits";
  }> {
    const sortBy = query.sortBy || "duration";
    const limit = query.limit || 20;
    const { startDate, endDate } = resolveDateRange(
      query.range,
      query.from,
      query.to,
    );
    const effectiveTenantId = query.tenantId || userTenantId;

    const targetRole = query.role === "PARENT" ? UserRole.PARENT : UserRole.STUDENT;

    const where: any = {
      startedAt: { gte: startDate, lte: endDate },
      user: {
        role: targetRole,
      },
    };

    if (effectiveTenantId) {
      where.OR = [
        { tenantId: effectiveTenantId },
        {
          user: {
            role: targetRole,
            ...(targetRole === UserRole.STUDENT
              ? {
                  studentProfile: {
                    OR: [
                      { groupEnrollments: { some: { group: { teacherId: effectiveTenantId } } } },
                      { courseEnrollments: { some: { course: { teacherId: effectiveTenantId } } } },
                    ],
                  },
                }
              : {
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
                }),
          },
        },
      ];
    }

    // Aggregate sessions for students or parents (order chronologically to cluster distinct visits)
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
      orderBy: { startedAt: "asc" },
    });

    const studentMap = new Map<
      string,
      {
        totalDuration: number;
        sessionsCount: number;
        lastClusterEndTime: number;
        lastActive: Date;
        city: string;
        country: string;
      }
    >();

    const SESSION_INACTIVITY_GAP_MS = 30 * 60 * 1000;

    for (const s of sessions) {
      if (!studentMap.has(s.userId)) {
        studentMap.set(s.userId, {
          totalDuration: 0,
          sessionsCount: 0,
          lastClusterEndTime: 0,
          lastActive: s.lastActiveAt || s.startedAt,
          city: s.city || "غير محدد",
          country: s.country || "مصر",
        });
      }
      const agg = studentMap.get(s.userId)!;
      agg.totalDuration += s.durationSeconds;

      const startTime = s.startedAt.getTime();
      const endTime = (s.lastActiveAt || s.startedAt).getTime();

      // If gap since last activity exceeds 30 minutes, this starts a new genuine visit/session
      if (startTime - agg.lastClusterEndTime > SESSION_INACTIVITY_GAP_MS) {
        agg.sessionsCount += 1;
      }
      agg.lastClusterEndTime = Math.max(agg.lastClusterEndTime, endTime);

      if (s.lastActiveAt && s.lastActiveAt > agg.lastActive) {
        agg.lastActive = s.lastActiveAt;
        if (s.city) agg.city = s.city;
        if (s.country) agg.country = s.country;
      }
    }

    const userIds = Array.from(studentMap.keys());
    if (userIds.length === 0) {
      return { students: [], sortBy };
    }

    // Fetch user details with student or parent profiles
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        fullName: true,
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
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const userDetailsMap = new Map(users.map((u) => [u.id, u]));

    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) {
        return `${hours} ساعة ${minutes > 0 ? `و ${minutes} د` : ""}`;
      }
      return `${Math.max(1, minutes)} دقيقة`;
    };

    const leaderboard: StudentLeaderboardItem[] = userIds
      .map((uid) => {
        const agg = studentMap.get(uid)!;
        const details = userDetailsMap.get(uid);

        let linkedStudentName: string | undefined;
        let relationshipType: string | undefined;
        if (details?.parentProfile) {
          relationshipType = details.parentProfile.relationshipType || "ولي أمر";
          const firstChild = details.parentProfile.studentLinks?.[0]?.student;
          if (firstChild) {
            linkedStudentName = firstChild.user?.fullName
              ? `${firstChild.user.fullName}${firstChild.gradeLevel ? ` (${firstChild.gradeLevel})` : ""}`
              : undefined;
          }
        }

        return {
          rank: 0,
          userId: uid,
          studentName: details?.fullName || (targetRole === UserRole.PARENT ? "ولي أمر" : "طالب"),
          studentCode: details?.studentProfile?.studentCode || (targetRole === UserRole.PARENT ? "PAR-000" : "STU-000"),
          phone: details?.phone || undefined,
          gradeLevel: details?.studentProfile?.gradeLevel || undefined,
          role: details?.role as any,
          relationshipType,
          linkedStudentName,
          city: agg.city,
          country: agg.country,
          totalSessions: agg.sessionsCount,
          totalDurationSeconds: agg.totalDuration,
          totalDurationFormatted: formatDuration(agg.totalDuration),
          lastActiveAt: agg.lastActive.toISOString(),
        };
      })
      .sort((a, b) => {
        if (sortBy === "duration") {
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
}
