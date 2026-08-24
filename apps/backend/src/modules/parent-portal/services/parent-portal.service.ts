import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CursorPaginationDto } from '../../../common/dto/cursor-pagination.dto';
import {
  AttendanceStatus,
  GroupEnrollmentStatus,
  CourseEnrollmentStatus,
  SubmissionStatus,
  PaymentStatus,
} from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import {
  resolveOfficialSubmission,
  groupSubmissionsByAssessment,
} from '../../assessments/utils/submission-grade.util';

@Injectable()
export class ParentPortalService {
  private readonly logger = new Logger(ParentPortalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Enforces that the authenticated parent is legally linked to the student.
   */
  async verifyGuardianLink(parentId: string, studentId: string) {
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
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
      where: { parentId },
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
  async getStudentOverview(parentId: string, studentId: string) {
    await this.verifyGuardianLink(parentId, studentId);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { fullName: true, phone: true } } },
    });

    if (!student) {
      throw new NotFoundException(`Student [${studentId}] not found`);
    }

    // 1. Attendance Metrics
    const [totalSessions, presentSessions, absentSessions] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { studentId } }),
      this.prisma.attendanceRecord.count({
        where: { studentId, status: AttendanceStatus.PRESENT },
      }),
      this.prisma.attendanceRecord.count({
        where: { studentId, status: AttendanceStatus.ABSENT },
      }),
    ]);

    const attendanceRate =
      totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 100;

    // 2. Academic Assessment Average — resolve the official (highest) attempt per
    // assessment so retakes are counted once at the student's best score.
    const gradedSubmissions = await this.prisma.assessmentSubmission.findMany({
      where: { studentId, status: SubmissionStatus.GRADED },
      include: { assessment: { select: { totalScore: true } } },
    });

    let totalScoreObtained = 0;
    let totalMaxScore = 0;

    const gradedByAssessment = groupSubmissionsByAssessment(gradedSubmissions);
    for (const [, attempts] of gradedByAssessment) {
      const official = resolveOfficialSubmission(attempts);
      if (!official) continue;
      totalScoreObtained += Number(official.scoreObtained || 0);
      totalMaxScore += Number(official.assessment.totalScore || 0);
    }

    const academicAverage =
      totalMaxScore > 0 ? Math.round((totalScoreObtained / totalMaxScore) * 100) : 0;

    // 3. Physical Groups & Online Courses Counts
    const [enrolledGroupsCount, enrolledCoursesCount] = await Promise.all([
      this.prisma.groupEnrollment.count({
        where: { studentId, status: GroupEnrollmentStatus.ACTIVE },
      }),
      this.prisma.courseEnrollment.count({
        where: { studentId, status: CourseEnrollmentStatus.ACTIVE },
      }),
    ]);

    // 4. Current Month Tuition Fee Status
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const currentMonthPayment = await this.prisma.studentPaymentRecord.findFirst({
      where: {
        studentId,
        periodYear: currentYear,
        periodMonth: currentMonth,
      },
    });

    const isTuitionPaid = currentMonthPayment?.paymentStatus === PaymentStatus.PAID;

    // 5. Recent Activity Snippets
    const [recentAttendance, recentAssessments] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { studentId },
        orderBy: { recordedAt: 'desc' },
        take: 3,
        include: {
          session: {
            include: { group: { select: { name: true } } },
          },
        },
      }),
      this.prisma.assessmentSubmission.findMany({
        where: { studentId },
        orderBy: { submittedAt: 'desc' },
        take: 3,
        include: {
          assessment: { select: { title: true, totalScore: true, type: true } },
        },
      }),
    ]);

    return {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.user.fullName,
        gradeLevel: student.gradeLevel,
      },
      kpis: {
        attendanceRatePercentage: attendanceRate,
        totalSessionsAttended: presentSessions,
        totalSessionsMissed: absentSessions,
        academicAveragePercentage: academicAverage,
        totalGradedAssessments: gradedByAssessment.size,
        enrolledPhysicalGroups: enrolledGroupsCount,
        enrolledOnlineCourses: enrolledCoursesCount,
        currentMonthBilling: {
          periodYear: currentYear,
          periodMonth: currentMonth,
          isPaid: isTuitionPaid,
          amountPaid: Number(currentMonthPayment?.amountPaid || 0),
          status: currentMonthPayment?.paymentStatus || PaymentStatus.PENDING,
        },
      },
      recentAttendance: recentAttendance.map((a) => ({
        sessionId: a.sessionId,
        groupName: a.session.group.name,
        sessionDate: a.session.sessionDate,
        status: a.status,
        recordedAt: a.recordedAt,
      })),
      recentAssessments: recentAssessments.map((sub) => ({
        submissionId: sub.id,
        assessmentTitle: sub.assessment.title,
        type: sub.assessment.type,
        status: sub.status,
        scoreObtained: sub.scoreObtained != null ? Number(sub.scoreObtained) : null,
        totalScore: Number(sub.assessment.totalScore),
        submittedAt: sub.submittedAt,
      })),
    };
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
