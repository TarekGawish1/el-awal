import { Injectable, ForbiddenException, NotFoundException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import {
  AttendanceStatus,
  GroupEnrollmentStatus,
  CourseEnrollmentStatus,
  SubmissionStatus,
  PaymentStatus,
  HomeworkSubmissionStatus,
  UserRole,
} from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import {
  resolveOfficialSubmission,
  groupSubmissionsByAssessment,
} from '../../assessments/utils/submission-grade.util';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class ParentPortalService {
  private readonly logger = new Logger(ParentPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Helper: Enforces that the authenticated parent is legally linked to the student.
   */
  async verifyGuardianLink(parentId: string, studentId: string, userRole?: string) {
    if (userRole === UserRole.TEACHER || userRole === UserRole.SECRETARIAT) {
      return;
    }

    const link = await this.prisma.parentStudentLink.findFirst({
      where: {
        parentId,
        studentId,
      },
    });

    if (!link) {
      throw new ForbiddenException(
        'Guardianship authorization failed: You are not linked to this student',
      );
    }
  }

  /**
   * Lists all children/students registered under the authenticated parent account.
   */
  async getLinkedStudents(parentId: string) {
    const links = await this.prisma.parentStudentLink.findMany({
      where: {
        OR: [
          { parentId },
          { parent: { id: parentId } },
        ],
      },
      include: {
        parent: true,
        student: {
          include: {
            user: { select: { id: true, fullName: true, phone: true, email: true } },
            groupEnrollments: {
              where: { status: GroupEnrollmentStatus.ACTIVE },
              include: { group: { select: { id: true, name: true, gradeLevel: true } } },
            },
          },
        },
      },
    });

    return links.map((l) => ({
      linkId: l.id,
      relationshipType: l.parent?.relationshipType || 'Guardian',
      student: {
        id: l.student.id,
        studentCode: l.student.studentCode,
        fullName: l.student.user.fullName,
        phone: l.student.user.phone,
        email: l.student.user.email,
        gradeLevel: l.student.gradeLevel,
        academicStage: l.student.academicStage,
        activeGroups: l.student.groupEnrollments.map((ge) => ge.group),
      },
    }));
  }

  /**
   * Real-time KPI Card Dashboard Overview for a linked child.
   */
  async getStudentOverview(parentId: string, studentId: string, userRole?: string) {
    await this.verifyGuardianLink(parentId, studentId, userRole);

    const cacheKey = `parent:overview:${studentId}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
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

    // 1. Parallel queries for metrics, history, payments, and assessments
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
              group: { select: { name: true } },
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

    // Financial summaries
    const totalPaid = safePaymentHistory
      .filter((p) => p.paymentStatus === PaymentStatus.PAID)
      .reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
    const totalUnpaid = safePaymentHistory
      .filter((p) => p.paymentStatus !== PaymentStatus.PAID)
      .reduce((acc, p) => acc + (Number(p.amountExpected) || 0), 0);

    // Homework performance stats from last attendance records
    const hwCompleted = safeAttendanceHistory.filter((r) => {
      const hw = r.session?.homeworkRecords?.[0]?.status;
      return (
        r.status === AttendanceStatus.PRESENT &&
        (hw === HomeworkSubmissionStatus.CHECKED_ONSITE ||
          hw === HomeworkSubmissionStatus.SUBMITTED_ONLINE ||
          hw === HomeworkSubmissionStatus.EXCUSED)
      );
    }).length;
    const hwMissing = safeAttendanceHistory.filter((r) => {
      const hw = r.session?.homeworkRecords?.[0]?.status;
      return (
        r.status === AttendanceStatus.PRESENT &&
        (!hw || hw === HomeworkSubmissionStatus.NOT_SUBMITTED)
      );
    }).length;
    const hwIncomplete = 0;

    // Next scheduled session calculation
    let nextSession: any = null;
    if (primaryGroup?.schedules?.length) {
      const today = new Date();
      const currentDayOfWeek = today.getDay();
      const currentHourMinute = today.getHours() * 60 + today.getMinutes();

      let nextSchedule: any = null;
      let daysUntilNext = 7;

      for (const schedule of primaryGroup.schedules) {
        const schDay = schedule.dayOfWeek;
        const [sh, sm] = (schedule.startTime || '00:00').split(':').map(Number);
        const schTime = sh * 60 + sm;

        let diff = schDay - currentDayOfWeek;
        if (diff < 0 || (diff === 0 && schTime <= currentHourMinute)) {
          diff += 7;
        }
        if (diff < daysUntilNext) {
          daysUntilNext = diff;
          nextSchedule = schedule;
        } else if (diff === daysUntilNext && nextSchedule) {
          const [nsh, nsm] = nextSchedule.startTime.split(':').map(Number);
          if (schTime < nsh * 60 + nsm) {
            nextSchedule = schedule;
          }
        }
      }

      if (nextSchedule) {
        const nextDate = new Date(today.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
        nextSession = {
          dayOfWeek: nextSchedule.dayOfWeek,
          startTime: nextSchedule.startTime,
          endTime: nextSchedule.endTime,
          location: nextSchedule.location || 'مقر السنتر',
          nextDate: nextDate.toISOString(),
          groupName: primaryGroup.name,
        };
      }
    }

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
      attendanceHistory: safeAttendanceHistory.map((a) => {
        const hwRecord = a.session?.homeworkRecords?.[0];
        const homeworkStatus = hwRecord?.status || 'NOT_SUBMITTED';
        return {
          id: a.id,
          sessionId: a.sessionId,
          groupName: a.session?.group?.name || primaryGroup?.name || 'المجموعة الدراسية',
          sessionDate: a.session?.sessionDate || a.recordedAt,
          status: a.status,
          homeworkStatus,
          recordedAt: a.recordedAt,
        };
      }),
      paymentHistory: safePaymentHistory.map((p) => ({
        id: p.id,
        paymentType: p.paymentType,
        periodMonth: p.periodMonth,
        periodYear: p.periodYear,
        amountPaid: Number(p.amountPaid || 0),
        amountExpected: Number(p.amountExpected || 0),
        paymentStatus: p.paymentStatus,
        createdAt: p.createdAt,
      })),
      assignments: safeAssignments.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        totalScore: Number(a.totalScore || 0),
        _count: a._count,
        submissions: (a.submissions || []).map((s) => ({
          id: s.id,
          status: s.status,
          scoreObtained: s.scoreObtained != null ? Number(s.scoreObtained) : null,
        })),
        group: a.group || a.targetGroups?.[0] || null,
        targetGroups: a.targetGroups,
      })),
      exams: safeExams.map((e) => ({
        id: e.id,
        title: e.title,
        dueDate: e.dueDate,
        totalScore: Number(e.totalScore || 0),
        group: e.group || e.targetGroups?.[0] || null,
        targetGroups: e.targetGroups,
        submissions: (e.submissions || []).map((s) => ({
          id: s.id,
          status: s.status,
          scoreObtained: s.scoreObtained != null ? Number(s.scoreObtained) : null,
        })),
      })),
      recentAttendance: safeAttendanceHistory.slice(0, 3).map((a) => ({
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
   * Fetches linked children and the first/selected child's consolidated overview in one single roundtrip.
   */
  async getParentDashboard(parentId: string, studentIdQuery?: string, userRole?: string) {
    const cacheKey = `parent:dashboard:${parentId}:${studentIdQuery || 'default'}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const linkedStudents = await this.getLinkedStudents(parentId);
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

  /**
   * Keyset cursor-paginated attendance records for a linked child.
   */
  async getStudentAttendance(
    parentId: string,
    studentId: string,
    query: CursorPaginationDto,
  ) {
    await this.verifyGuardianLink(parentId, studentId);

    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor
      ? CursorPaginationHelper.decodeCursor(query.cursor)
      : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(
      decodedCursor,
      'DESC',
    );

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        ...(cursorFilter || {}),
      },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        session: {
          include: {
            group: { select: { id: true, name: true, gradeLevel: true } },
          },
        },
      },
    });

    const formatted = records.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      sessionDate: r.session.sessionDate,
      topic: r.session.topic,
      groupName: r.session.group.name,
      status: r.status,
      recordingMethod: r.recordingMethod,
      recordedAt: r.recordedAt,
      createdAt: r.recordedAt,
      notes: r.notes,
    }));

    return CursorPaginationHelper.formatResponse(formatted, limit);
  }

  /**
   * Comprehensive list of assessments, scores, and instructor feedback for a child.
   */
  async getStudentAssessments(parentId: string, studentId: string) {
    await this.verifyGuardianLink(parentId, studentId);

    const submissions = await this.prisma.assessmentSubmission.findMany({
      where: { studentId },
      orderBy: { attemptNumber: 'asc' },
      include: {
        assessment: {
          include: {
            teacher: {
              include: { user: { select: { fullName: true } } },
            },
          },
        },
      },
    });

    // One row per assessment: the official (highest) attempt is the headline grade,
    // with every attempt retained under `attempts` for history.
    const byAssessment = groupSubmissionsByAssessment(submissions);
    const rows = [...byAssessment.values()].map((attempts) => {
      const official = resolveOfficialSubmission(attempts)!;
      const passingScore = official.assessment.passingScore
        ? Number(official.assessment.passingScore)
        : null;
      const officialScore =
        official.scoreObtained != null ? Number(official.scoreObtained) : null;

      return {
        submissionId: official.id,
        assessmentId: official.assessmentId,
        title: official.assessment.title,
        type: official.assessment.type,
        teacherName: official.assessment.teacher.user.fullName,
        status: official.status,
        scoreObtained: officialScore,
        totalScore: Number(official.assessment.totalScore),
        passingScore,
        isPassed:
          officialScore != null && passingScore != null
            ? officialScore >= passingScore
            : null,
        submittedAt: official.submittedAt,
        gradedAt: official.gradedAt,
        teacherFeedback: official.teacherFeedback,
        attemptCount: attempts.length,
        attempts: attempts.map((a) => ({
          attemptNumber: a.attemptNumber,
          status: a.status,
          scoreObtained: a.scoreObtained != null ? Number(a.scoreObtained) : null,
          submittedAt: a.submittedAt,
          gradedAt: a.gradedAt,
        })),
      };
    });

    // Most recently active assessment first.
    return rows.sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
    );
  }

  /**
   * Enrolled online course progress overview for a child.
   */
  async getStudentCourses(parentId: string, studentId: string) {
    await this.verifyGuardianLink(parentId, studentId);

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        studentId,
        status: CourseEnrollmentStatus.ACTIVE,
      },
      include: {
        course: {
          include: {
            teacher: {
              include: { user: { select: { fullName: true } } },
            },
            _count: { select: { modules: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return Promise.all(
      enrollments.map(async (e) => {
        const totalLessons = await this.prisma.courseLesson.count({
          where: { module: { courseId: e.courseId } },
        });

        const completedLessons = await this.prisma.courseProgress.count({
          where: {
            studentId,
            courseId: e.courseId,
            isCompleted: true,
          },
        });

        const progressPercentage =
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        return {
          courseId: e.course.id,
          title: e.course.title,
          subject: e.course.subject,
          gradeLevel: e.course.gradeLevel,
          teacherName: e.course.teacher.user.fullName,
          enrolledAt: e.enrolledAt,
          totalModules: e.course._count.modules,
          totalLessons,
          completedLessons,
          progressPercentage,
        };
      }),
    );
  }
}
