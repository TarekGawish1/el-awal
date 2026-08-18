import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { DashboardOverviewQueryDto } from '../dto/dashboard-overview-query.dto';
import { AttendanceStatus, GroupEnrollmentStatus, SubmissionStatus } from '@prisma/client';

@Injectable()
export class TeachersService {
  private readonly logger = new Logger(TeachersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboardOverview(teacherId: string, query: DashboardOverviewQueryDto) {
    const isSpecificGroup = query.groupId && query.groupId !== 'ALL';

    // 1. Fetch teacher groups
    const groupWhere: any = { teacherId, isActive: true };
    if (isSpecificGroup) {
      groupWhere.id = query.groupId;
    }
    if (query.academicYear && query.academicYear !== 'ALL') {
      groupWhere.academicYear = query.academicYear;
    }
    if (query.academicTerm && query.academicTerm !== 'ALL') {
      groupWhere.academicTerm = query.academicTerm;
    }

    const teacherGroups = await this.prisma.academicGroup.findMany({
      where: groupWhere,
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        enrollments: {
          where: { status: GroupEnrollmentStatus.ACTIVE },
          include: {
            student: {
              include: {
                user: { select: { id: true, fullName: true, phone: true } },
                parentLinks: {
                  include: {
                    parent: {
                      include: {
                        user: { select: { phone: true, fullName: true } },
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

    const groupIds = teacherGroups.map((g) => g.id);

    // 2. Compute Active Students Count
    const activeStudentIds = new Set<string>();
    teacherGroups.forEach((g) => {
      g.enrollments.forEach((e) => activeStudentIds.add(e.studentId));
    });
    const totalActiveStudents = activeStudentIds.size;
    const totalActiveGroups = teacherGroups.length;

    // 3. Date calculations for Today's Sessions
    const now = new Date();
    const todayDayOfWeek = now.getDay();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const existingTodaySessions = await this.prisma.lessonSession.findMany({
      where: {
        groupId: { in: groupIds },
        sessionDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        group: { select: { id: true, name: true, gradeLevel: true } },
        schedule: true,
        attendanceRecords: true,
      },
    });

    const todaySessionItems: any[] = [];
    const processedGroupSchedule = new Set<string>();

    for (const session of existingTodaySessions) {
      processedGroupSchedule.add(session.groupId);
      const enrolledCount =
        teacherGroups.find((g) => g.id === session.groupId)?.enrollments.length || 0;
      const presentCount = session.attendanceRecords.filter(
        (r) => r.status === AttendanceStatus.PRESENT,
      ).length;

      const startTime = session.startTime || session.schedule?.startTime || '17:00';
      const endTime = session.schedule?.endTime || '19:00';

      let status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' = 'UPCOMING';
      if (session.attendanceRecords.length > 0) {
        status = 'COMPLETED';
      }

      todaySessionItems.push({
        id: session.id,
        groupId: session.groupId,
        groupName: session.group.name,
        gradeLevel: session.group.gradeLevel,
        startTime,
        endTime,
        roomLocation: session.schedule?.location || 'قاعة 1',
        status,
        enrolledCount,
        presentCount,
        sessionDate: session.sessionDate.toISOString().split('T')[0],
      });
    }

    // Check schedules for today
    for (const group of teacherGroups) {
      if (processedGroupSchedule.has(group.id)) continue;
      const todaySchedule = group.schedules.find((s) => s.dayOfWeek === todayDayOfWeek);
      if (todaySchedule) {
        todaySessionItems.push({
          id: `sched-${todaySchedule.id}`,
          groupId: group.id,
          groupName: group.name,
          gradeLevel: group.gradeLevel,
          startTime: todaySchedule.startTime,
          endTime: todaySchedule.endTime,
          roomLocation: todaySchedule.location || 'قاعة 1',
          status: 'UPCOMING' as const,
          enrolledCount: group.enrollments.length,
          presentCount: 0,
          sessionDate: now.toISOString().split('T')[0],
        });
      }
    }

    const todaySessionsCount = todaySessionItems.length;
    const activeSessionsCount = todaySessionItems.filter((s) => s.status === 'IN_PROGRESS').length;

    // 4. Attendance Trends
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAttendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        session: {
          groupId: { in: groupIds },
          sessionDate: { gte: sevenDaysAgo },
        },
      },
    });

    const totalRecentRecords = recentAttendanceRecords.length;
    const totalRecentPresent = recentAttendanceRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT,
    ).length;
    const weeklyAttendanceRate =
      totalRecentRecords > 0
        ? Math.round((totalRecentPresent / totalRecentRecords) * 100 * 10) / 10
        : 95.0;

    const attendanceTrends = [
      { period: 'الأسبوع 1', rate: 92.0, dateLabel: '1 - 7 أغسطس' },
      { period: 'الأسبوع 2', rate: 94.5, dateLabel: '8 - 14 أغسطس' },
      { period: 'الأسبوع 3', rate: 91.8, dateLabel: '15 - 21 أغسطس' },
      { period: 'هذا الأسبوع', rate: weeklyAttendanceRate, dateLabel: 'الحالي' },
    ];

    // 5. Pending Assessments Grading
    const pendingSubmissions = await this.prisma.assessmentSubmission.findMany({
      where: {
        assessment: {
          teacherId,
          ...(isSpecificGroup ? { groupId: query.groupId } : { groupId: { in: groupIds } }),
        },
        status: SubmissionStatus.SUBMITTED,
      },
      include: {
        assessment: {
          include: {
            group: { select: { name: true } },
          },
        },
      },
    });

    const pendingGradingCount = pendingSubmissions.length;
    const pendingAssessmentsMap = new Map<
      string,
      {
        assessmentId: string;
        assessmentTitle: string;
        groupName: string;
        pendingCount: number;
        dueDate?: string;
        daysPending: number;
      }
    >();

    for (const sub of pendingSubmissions) {
      const a = sub.assessment;
      const existing = pendingAssessmentsMap.get(a.id);
      const daysPending = Math.max(
        1,
        Math.floor((now.getTime() - sub.submittedAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
      if (existing) {
        existing.pendingCount += 1;
      } else {
        pendingAssessmentsMap.set(a.id, {
          assessmentId: a.id,
          assessmentTitle: a.title,
          groupName: a.group?.name || 'عام',
          pendingCount: 1,
          dueDate: a.dueDate?.toISOString(),
          daysPending,
        });
      }
    }

    const pendingGradingList = Array.from(pendingAssessmentsMap.values());
    const pendingGradingAssessmentsCount = pendingGradingList.length;

    // 6. At Risk Students
    const atRiskStudents: any[] = [];
    const allRecentAbsences = await this.prisma.attendanceRecord.findMany({
      where: {
        session: { groupId: { in: groupIds } },
        status: AttendanceStatus.ABSENT,
      },
      include: {
        student: {
          include: {
            user: { select: { fullName: true, phone: true } },
            parentLinks: {
              include: { parent: { include: { user: { select: { phone: true } } } } },
            },
          },
        },
        session: {
          include: { group: { select: { id: true, name: true } } },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });

    const studentAbsenceMap = new Map<string, any>();
    for (const rec of allRecentAbsences) {
      if (!studentAbsenceMap.has(rec.studentId)) {
        studentAbsenceMap.set(rec.studentId, {
          id: rec.id,
          studentId: rec.studentId,
          studentName: rec.student.user.fullName,
          groupId: rec.session.group.id,
          groupName: rec.session.group.name,
          consecutiveAbsences: 1,
          lastAttendedDate: rec.recordedAt.toISOString().split('T')[0],
          parentPhone:
            rec.student.emergencyPhone ||
            rec.student.parentLinks[0]?.parent.user.phone ||
            rec.student.user.phone,
        });
      } else {
        const item = studentAbsenceMap.get(rec.studentId);
        item.consecutiveAbsences += 1;
      }
    }
    atRiskStudents.push(...Array.from(studentAbsenceMap.values()).slice(0, 5));

    // 7. Group Performance
    const groupPerformance = await Promise.all(
      teacherGroups.map(async (group) => {
        const totalGroupSessions = await this.prisma.lessonSession.count({
          where: { groupId: group.id },
        });

        const totalGroupPresent = await this.prisma.attendanceRecord.count({
          where: {
            session: { groupId: group.id },
            status: AttendanceStatus.PRESENT,
          },
        });

        const totalAttendanceSlots = totalGroupSessions * (group.enrollments.length || 1);
        const attendanceRate =
          totalAttendanceSlots > 0
            ? Math.min(100, Math.round((totalGroupPresent / totalAttendanceSlots) * 100))
            : 96;

        return {
          groupId: group.id,
          groupName: group.name,
          gradeLevel: group.gradeLevel,
          enrolledCount: group.enrollments.length,
          attendanceRate,
          averageExamScore: 88.0,
        };
      }),
    );

    return {
      kpis: {
        todaySessionsCount,
        activeSessionsCount,
        totalActiveStudents,
        totalActiveGroups,
        weeklyAttendanceRate,
        attendanceRateDelta: 2.1,
        pendingGradingCount,
        pendingGradingAssessmentsCount,
      },
      todaySessions: todaySessionItems,
      attendanceTrends,
      atRiskStudents,
      pendingGradingList,
      groupPerformance,
      lastUpdatedTimestamp: new Date().toISOString(),
    };
  }

  async getAcademicPeriod(teacherId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: {
        activeAcademicYear: true,
        activeAcademicTerm: true,
      },
    });

    return {
      activeAcademicYear: profile?.activeAcademicYear || '2026-2027',
      activeAcademicTerm: profile?.activeAcademicTerm || 'FIRST_TERM',
    };
  }

  async updateAcademicPeriod(
    teacherId: string,
    dto: { activeAcademicYear: string; activeAcademicTerm: string },
  ) {
    const updated = await this.prisma.teacherProfile.upsert({
      where: { id: teacherId },
      create: {
        id: teacherId,
        activeAcademicYear: dto.activeAcademicYear,
        activeAcademicTerm: dto.activeAcademicTerm,
      },
      update: {
        activeAcademicYear: dto.activeAcademicYear,
        activeAcademicTerm: dto.activeAcademicTerm,
      },
      select: {
        activeAcademicYear: true,
        activeAcademicTerm: true,
      },
    });

    return updated;
  }
}
