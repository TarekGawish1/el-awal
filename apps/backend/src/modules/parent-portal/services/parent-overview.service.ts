import { Injectable, NotFoundException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  AttendanceStatus,
  GroupEnrollmentStatus,
  CourseEnrollmentStatus,
  SubmissionStatus,
  PaymentStatus,
  HomeworkSubmissionStatus,
  AssessmentType,
} from '@prisma/client';
import {
  resolveOfficialSubmission,
  groupSubmissionsByAssessment,
} from '../../assessments/utils/submission-grade.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { ParentChildrenService } from './parent-children.service';
import {
  isSessionHomeworkApplicable,
  calculateNextSession,
  mapAttendanceHistory,
  mapPaymentHistory,
  mapAssignments,
  mapExams,
} from './parent-overview.util';

@Injectable()
export class ParentOverviewService {
  private readonly logger = new Logger(ParentOverviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parentChildrenService: ParentChildrenService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Real-time KPI Card Dashboard Overview for a linked child.
   */
  async getStudentOverview(parentId: string, studentId: string, userRole?: string) {
    await this.parentChildrenService.verifyGuardianLink(parentId, studentId, userRole);

    const cacheKey = `parent:overview:${studentId}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { fullName: true, phone: true } },
        groupEnrollments: {
          where: { status: { in: [GroupEnrollmentStatus.ACTIVE, 'PENDING'] } },
          include: {
            group: {
              select: {
                id: true,
                name: true,
                gradeLevel: true,
                monthlyFee: true,
                schedules: {
                  orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
                  select: { id: true, dayOfWeek: true, startTime: true, endTime: true, location: true },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student [${studentId}] not found`);
    }

    const enrollments = student.groupEnrollments || [];
    const activeEnrollment = enrollments.find((ge) => ge.status === GroupEnrollmentStatus.ACTIVE);
    const primaryGroup = activeEnrollment?.group || null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const [
      totalSessions,
      presentSessions,
      absentSessions,
      gradedSubmissions,
      enrolledGroupsCount,
      enrolledCoursesCount,
      currentMonthPayment,
      attendanceHistory,
      paymentHistory,
      assignments,
      exams,
    ] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { studentId } }),
      this.prisma.attendanceRecord.count({
        where: { studentId, status: AttendanceStatus.PRESENT },
      }),
      this.prisma.attendanceRecord.count({
        where: { studentId, status: AttendanceStatus.ABSENT },
      }),
      this.prisma.assessmentSubmission.findMany({
        where: { studentId, status: SubmissionStatus.GRADED },
        include: { assessment: { select: { totalScore: true } } },
      }),
      this.prisma.groupEnrollment.count({
        where: { studentId, status: GroupEnrollmentStatus.ACTIVE },
      }),
      this.prisma.courseEnrollment.count({
        where: { studentId, status: CourseEnrollmentStatus.ACTIVE },
      }),
      this.prisma.studentPaymentRecord.findFirst({
        where: {
          studentId,
          periodYear: currentYear,
          periodMonth: currentMonth,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { studentId },
        orderBy: { recordedAt: 'desc' },
        take: 10,
        include: {
          session: {
            select: {
              sessionDate: true,
              topic: true,
              group: {
                select: {
                  name: true,
                  _count: {
                    select: {
                      assessments: {
                        where: {
                          type: AssessmentType.ASSIGNMENT,
                          isPublished: true,
                        },
                      },
                    },
                  },
                },
              },
              _count: { select: { homeworkRecords: true } },
              homeworkRecords: {
                where: { studentId },
                select: { status: true },
              },
            },
          },
        },
      }),
      this.prisma.studentPaymentRecord.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          paymentType: true,
          periodMonth: true,
          periodYear: true,
          amountPaid: true,
          amountExpected: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      primaryGroup
        ? this.prisma.assessment.findMany({
            where: {
              isPublished: true,
              type: 'ASSIGNMENT',
              courseId: null,
              lessonId: null,
              OR: [
                { groupId: primaryGroup.id },
                { targetGroups: { some: { id: primaryGroup.id } } },
              ],
            },
            include: {
              group: { select: { id: true, name: true } },
              targetGroups: { select: { id: true, name: true } },
              submissions: {
                where: { studentId },
                select: { id: true, status: true, scoreObtained: true },
              },
              _count: { select: { questions: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : [],
      primaryGroup
        ? this.prisma.assessment.findMany({
            where: {
              isPublished: true,
              type: 'EXAM',
              courseId: null,
              lessonId: null,
              OR: [
                { groupId: primaryGroup.id },
                { targetGroups: { some: { id: primaryGroup.id } } },
              ],
            },
            include: {
              group: { select: { id: true, name: true } },
              targetGroups: { select: { id: true, name: true } },
              submissions: {
                where: { studentId },
                select: { id: true, status: true, scoreObtained: true },
              },
              _count: { select: { questions: true } },
            },
            orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
            take: 5,
          })
        : [],
    ]);

    const safeAttendanceHistory = attendanceHistory || [];
    const safePaymentHistory = paymentHistory || [];
    const safeAssignments = assignments || [];
    const safeExams = exams || [];
    const safeGradedSubmissions = gradedSubmissions || [];

    const attendanceRate =
      totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 100;

    let totalScoreObtained = 0;
    let totalMaxScore = 0;
    const gradedByAssessment = groupSubmissionsByAssessment(safeGradedSubmissions);
    for (const [, attempts] of gradedByAssessment) {
      const official = resolveOfficialSubmission(attempts);
      if (!official) continue;
      totalScoreObtained += Number(official.scoreObtained || 0);
      totalMaxScore += Number(official.assessment.totalScore || 0);
    }
    const academicAverage =
      totalMaxScore > 0 ? Math.round((totalScoreObtained / totalMaxScore) * 100) : 0;

    const isTuitionPaid = currentMonthPayment?.paymentStatus === PaymentStatus.PAID;

    const totalPaid = safePaymentHistory
      .filter((p) => p.paymentStatus === PaymentStatus.PAID)
      .reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
    const totalUnpaid = safePaymentHistory
      .filter((p) => p.paymentStatus !== PaymentStatus.PAID)
      .reduce((acc, p) => acc + (Number(p.amountExpected) || 0), 0);

    const sessionsWithHw = safeAttendanceHistory.filter(
      (r: any) => r.status === AttendanceStatus.PRESENT && isSessionHomeworkApplicable(r),
    );

    const hwCompleted = sessionsWithHw.filter((r: any) => {
      const hw = r.session?.homeworkRecords?.[0]?.status;
      return (
        hw === HomeworkSubmissionStatus.CHECKED_ONSITE ||
        hw === HomeworkSubmissionStatus.SUBMITTED_ONLINE ||
        hw === HomeworkSubmissionStatus.EXCUSED
      );
    }).length;

    const hwMissing = sessionsWithHw.filter((r: any) => {
      const hw = r.session?.homeworkRecords?.[0]?.status;
      return !hw || hw === HomeworkSubmissionStatus.NOT_SUBMITTED;
    }).length;

    const hwIncomplete = sessionsWithHw.filter((r: any) => {
      const hw = r.session?.homeworkRecords?.[0]?.status;
      return (hw as string) === 'INCOMPLETE';
    }).length;

    const nextSession = calculateNextSession(primaryGroup);

    const payload = {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.user?.fullName || '',
        phone: student.user?.phone || null,
        gradeLevel: student.gradeLevel,
        academicStage: student.academicStage,
        attendanceMode: student.attendanceMode,
        groupEnrollments: enrollments.map((ge) => ({
          id: ge.id,
          status: ge.status,
          group: {
            id: ge.group.id,
            name: ge.group.name,
            gradeLevel: ge.group.gradeLevel,
            academicStage: student.academicStage,
            monthlyFee: Number(ge.group.monthlyFee || 0),
            schedules: ge.group.schedules,
          },
        })),
      },
      primaryGroup: primaryGroup
        ? {
            id: primaryGroup.id,
            name: primaryGroup.name,
            gradeLevel: primaryGroup.gradeLevel,
            academicStage: student.academicStage,
            monthlyFee: Number(primaryGroup.monthlyFee || 0),
            schedules: primaryGroup.schedules,
          }
        : null,
      kpis: {
        attendanceRatePercentage: attendanceRate,
        totalSessionsAttended: presentSessions,
        totalSessionsMissed: absentSessions,
        academicAveragePercentage: academicAverage,
        totalGradedAssessments: gradedByAssessment.size,
        enrolledPhysicalGroups: enrolledGroupsCount,
        enrolledOnlineCourses: enrolledCoursesCount,
        totalPaid,
        totalUnpaid,
        hwStats: {
          totalAttended: presentSessions,
          totalAssigned: sessionsWithHw.length,
          hwCompleted,
          hwMissing,
          hwIncomplete,
        },
        currentMonthBilling: {
          periodYear: currentYear,
          periodMonth: currentMonth,
          isPaid: isTuitionPaid,
          amountPaid: Number(currentMonthPayment?.amountPaid || 0),
          status: currentMonthPayment?.paymentStatus || PaymentStatus.PENDING,
        },
      },
      nextSession,
      attendanceHistory: mapAttendanceHistory(safeAttendanceHistory, primaryGroup),
      paymentHistory: mapPaymentHistory(safePaymentHistory),
      assignments: mapAssignments(safeAssignments),
      exams: mapExams(safeExams),
      recentAttendance: safeAttendanceHistory.slice(0, 3).map((a: any) => ({
        sessionId: a.sessionId,
        groupName: a.session?.group?.name || primaryGroup?.name || 'المجموعة الدراسية',
        sessionDate: a.session?.sessionDate || a.recordedAt,
        status: a.status,
        recordedAt: a.recordedAt,
      })),
      recentAssessments: safeGradedSubmissions.slice(0, 3).map((sub) => ({
        submissionId: sub.id,
        assessmentTitle: sub.assessment?.totalScore ? 'تقييم دراسي' : 'اختبار',
        status: sub.status,
        scoreObtained: sub.scoreObtained != null ? Number(sub.scoreObtained) : null,
        totalScore: Number(sub.assessment?.totalScore || 0),
        submittedAt: sub.submittedAt,
      })),
    };

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, payload, 300);
    }

    return payload;
  }

  /**
   * Unified Single Endpoint for Parent Portal Dashboard.
   */
  async getParentDashboard(parentId: string, studentIdQuery?: string, userRole?: string) {
    const cacheKey = `parent:dashboard:${parentId}:${studentIdQuery || 'default'}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const linkedStudents = await this.parentChildrenService.getLinkedStudents(parentId);
    if (!linkedStudents || linkedStudents.length === 0) {
      const emptyResult = {
        linkedStudents: [],
        activeChildOverview: null,
        selectedStudentId: null,
      };
      if (this.redisCache) {
        await this.redisCache.set(cacheKey, emptyResult, 300);
      }
      return emptyResult;
    }

    const targetStudentId =
      studentIdQuery && linkedStudents.some((l) => l.student.id === studentIdQuery)
        ? studentIdQuery
        : linkedStudents[0].student.id;

    let activeChildOverview = null;
    try {
      activeChildOverview = await this.getStudentOverview(parentId, targetStudentId, userRole);
    } catch (err) {
      this.logger.warn(`Could not load child overview [${targetStudentId}] in parent dashboard: ${err}`);
    }

    const payload = {
      linkedStudents,
      activeChildOverview,
      selectedStudentId: targetStudentId,
    };

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, payload, 300);
    }

    return payload;
  }
}
