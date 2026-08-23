import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { CoursesService } from '../../courses/services/courses.service';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';
import { BatchProgressSyncDto } from '../dto/batch-progress-sync.dto';
import { SyncAttendanceBatchDto } from '../dto/sync-attendance.dto';
import { SyncPaymentsBatchDto } from '../dto/sync-payments.dto';
import { SyncAssessmentsBatchDto } from '../dto/sync-assessments.dto';
import { UnifiedSyncBatchDto } from '../dto/sync-batch.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  AttendanceStatus,
  RecordingMethod,
  PaymentStatus,
  PaymentType,
  SubmissionStatus,
  QuestionType,
  GroupEnrollmentStatus,
  UserRole,
} from '@prisma/client';

export interface DomainSyncResult {
  syncedCount: number;
  duplicatesIgnored: number;
  failedCount: number;
  processedOperationIds: string[];
  conflicts: Array<{
    operationId: string;
    reason: string;
    entityId?: string;
    code?: string;
    details?: Record<string, string>;
  }>;
  idMappings?: Record<string, string>;
  processedPayments?: any[];
}

export interface BootstrapSnapshotResponse {
  snapshotVersion: string;
  timestamp: number;
  isDelta: boolean;
  role: string;
  data: {
    academicPeriod?: any;
    groups?: any[];
    students?: any[];
    schedules?: any[];
    sessions?: any[];
    payments?: any[];
    assessments?: any[];
    courses?: any[];
    booklets?: any[];
    attendance?: any[];
    attendanceHistory?: any[];
    children?: any[];
  };
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
  ) {}

  /**
   * Generates a comprehensive "Zero Cold-Start" bootstrap snapshot for the authenticated user.
   * Supports incremental delta sync via ?since=<epochMs>.
   */
  async getBootstrapSnapshot(
    user: AuthenticatedUser,
    since?: number,
  ): Promise<BootstrapSnapshotResponse> {
    const timestamp = Date.now();
    const isDelta = !!since && since > 0;
    const sinceDate = isDelta ? new Date(since!) : null;

    this.logger.log(
      `Generating bootstrap snapshot for user [${user.id}], role [${user.role}], isDelta [${isDelta}]`,
    );

    const snapshotVersion = 'v1-2026-bootstrap';

    if (user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT) {
      return this.getTeacherBootstrapSnapshot(user, timestamp, isDelta, sinceDate, snapshotVersion);
    }

    if (user.role === UserRole.STUDENT) {
      return this.getStudentBootstrapSnapshot(user, timestamp, isDelta, sinceDate, snapshotVersion);
    }

    if (user.role === UserRole.PARENT) {
      return this.getParentBootstrapSnapshot(user, timestamp, isDelta, sinceDate, snapshotVersion);
    }

    return {
      snapshotVersion,
      timestamp,
      isDelta,
      role: user.role,
      data: {},
    };
  }

  /**
   * Bi-directional sync diff summary returning counts and lightweight summary items
   * of remote server changes created/updated since a given timestamp.
   */
  async getSyncDiff(user: AuthenticatedUser, since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);
    let teacherProfile: any = null;
    try {
      if (user.teacherProfileId && typeof this.prisma.teacherProfile?.findUnique === 'function') {
        teacherProfile = await this.prisma.teacherProfile.findUnique({
          where: { id: user.teacherProfileId },
          select: { id: true, activeAcademicYear: true, activeAcademicTerm: true },
        });
      }
      if (!teacherProfile && typeof this.prisma.teacherProfile?.findFirst === 'function') {
        teacherProfile = await this.prisma.teacherProfile.findFirst({
          where: { id: user.id },
          select: { id: true, activeAcademicYear: true, activeAcademicTerm: true },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to resolve teacher profile in getSyncDiff:', err);
    }

    const effectiveTeacherId = teacherProfile?.id || user.teacherProfileId || user.id;

    // 1. Fetch updated groups
    let groups: any[] = [];
    try {
      if (typeof this.prisma.academicGroup?.findMany === 'function') {
        groups = await this.prisma.academicGroup.findMany({
          where: {
            ...(user.role === UserRole.TEACHER && effectiveTeacherId
              ? {
                  OR: [
                    { teacherId: effectiveTeacherId },
                    { teacher: { id: effectiveTeacherId } },
                  ],
                }
              : {}),
            isActive: true,
            updatedAt: { gte: sinceDate },
          },
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            monthlyFee: true,
            academicYear: true,
            academicTerm: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch groups diff:', err);
      groups = [];
    }

    // 2. Fetch updated students
    let students: any[] = [];
    try {
      if (typeof this.prisma.studentProfile?.findMany === 'function') {
        const studentProfiles = await this.prisma.studentProfile.findMany({
          where: {
            academicStatus: 'ACTIVE',
            user: { isActive: true },
            updatedAt: { gte: sinceDate },
          },
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
            groupEnrollments: {
              where: { status: GroupEnrollmentStatus.ACTIVE },
              include: { group: { select: { id: true, name: true } } },
            },
          },
          take: 50,
        });

        students = (studentProfiles || []).map((s) => ({
          id: s.id,
          fullName: s.user?.fullName || '',
          phone: s.user?.phone || '',
          studentCode: s.studentCode || '',
          groupName: s.groupEnrollments?.[0]?.group?.name || '',
          updatedAt: s.updatedAt,
        }));
      }
    } catch (err) {
      this.logger.warn('Failed to fetch students diff:', err);
      students = [];
    }

    // 3. Fetch updated attendance
    let attendance: any[] = [];
    try {
      if (typeof this.prisma.attendanceRecord?.findMany === 'function') {
        attendance = await this.prisma.attendanceRecord.findMany({
          where: {
            ...(user.role === UserRole.TEACHER && effectiveTeacherId
              ? {
                  session: {
                    group: {
                      OR: [
                        { teacherId: effectiveTeacherId },
                        { teacher: { id: effectiveTeacherId } },
                      ],
                    },
                  },
                }
              : {}),
            recordedAt: { gte: sinceDate },
          },
          select: {
            id: true,
            status: true,
            sessionId: true,
            studentId: true,
            recordedAt: true,
          },
          take: 50,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch attendance diff:', err);
      attendance = [];
    }

    // 4. Fetch updated payments
    let payments: any[] = [];
    try {
      if (typeof this.prisma.studentPaymentRecord?.findMany === 'function') {
        payments = await this.prisma.studentPaymentRecord.findMany({
          where: {
            ...(user.role === UserRole.TEACHER && effectiveTeacherId
              ? {
                  group: {
                    OR: [
                      { teacherId: effectiveTeacherId },
                      { teacher: { id: effectiveTeacherId } },
                    ],
                  },
                }
              : {}),
            updatedAt: { gte: sinceDate },
          },
          select: {
            id: true,
            amountPaid: true,
            paymentMethod: true,
            paymentStatus: true,
            studentId: true,
            groupId: true,
            updatedAt: true,
          },
          take: 50,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch payments diff:', err);
      payments = [];
    }

    return {
      groups: { count: groups.length, items: groups },
      students: { count: students.length, items: students },
      attendance: { count: attendance.length, items: attendance },
      payments: { count: payments.length, items: payments },
      serverTime: new Date().toISOString(),
    };
  }

  private async getTeacherBootstrapSnapshot(
    user: AuthenticatedUser,
    timestamp: number,
    isDelta: boolean,
    sinceDate: Date | null,
    snapshotVersion: string,
  ): Promise<BootstrapSnapshotResponse> {
    let teacherProfile: any = null;
    try {
      if (user.teacherProfileId && typeof this.prisma.teacherProfile?.findUnique === 'function') {
        teacherProfile = await this.prisma.teacherProfile.findUnique({
          where: { id: user.teacherProfileId },
          select: { id: true, activeAcademicYear: true, activeAcademicTerm: true },
        });
      }

      if (!teacherProfile && typeof this.prisma.teacherProfile?.findFirst === 'function') {
        teacherProfile = await this.prisma.teacherProfile.findFirst({
          where: { id: user.id },
          select: { id: true, activeAcademicYear: true, activeAcademicTerm: true },
        });
      }

      if (!teacherProfile && user.role === UserRole.TEACHER && typeof this.prisma.teacherProfile?.findFirst === 'function') {
        teacherProfile = await this.prisma.teacherProfile.findFirst({
          select: { id: true, activeAcademicYear: true, activeAcademicTerm: true },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to resolve teacher profile for bootstrap snapshot:', err);
    }

    const effectiveTeacherId = teacherProfile?.id || user.teacherProfileId || user.id;

    // 1. Academic Period
    const academicPeriod = {
      academicYear: teacherProfile?.activeAcademicYear || '2026-2027',
      academicTerm: teacherProfile?.activeAcademicTerm || 'FIRST_TERM',
      activeAcademicYear: teacherProfile?.activeAcademicYear || '2026-2027',
      activeAcademicTerm: teacherProfile?.activeAcademicTerm || 'FIRST_TERM',
    };

    // 2. Groups
    let groups: any[] = [];
    try {
      const groupsWhere: any = {
        ...(user.role === UserRole.TEACHER && effectiveTeacherId
          ? {
              OR: [
                { teacherId: effectiveTeacherId },
                { teacher: { id: effectiveTeacherId } },
              ],
            }
          : {}),
        isActive: true,
        academicYear: academicPeriod.activeAcademicYear,
        academicTerm: academicPeriod.activeAcademicTerm,
        ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
      };

      groups = await this.prisma.academicGroup.findMany({
        where: groupsWhere,
        include: {
          schedules: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { name: 'asc' },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch groups in bootstrap snapshot:', err);
      groups = [];
    }

    const groupIds = (groups || []).map((g) => g.id).filter(Boolean);

    // 3. Students
    // 3. Students
    let students: any[] = [];
    try {
      if (groupIds.length > 0) {
        const enrollments = await this.prisma.groupEnrollment.findMany({
          where: {
            groupId: { in: groupIds },
            status: GroupEnrollmentStatus.ACTIVE,
            student: {
              academicStatus: 'ACTIVE',
              user: { isActive: true },
            },
          },
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        });

        const studentMap = new Map<string, any>();
        for (const enrollment of (enrollments || [])) {
          if (
            enrollment?.student &&
            enrollment.student.user?.isActive !== false &&
            (enrollment.student.academicStatus || 'ACTIVE') === 'ACTIVE' &&
            !studentMap.has(enrollment.student.id)
          ) {
            const s = enrollment.student;
            studentMap.set(s.id, {
              id: s.id,
              fullName: s.user?.fullName || '',
              phone: s.user?.phone,
              email: s.user?.email,
              studentCode: s.studentCode || '',
              qrCodeToken: s.qrCodeToken,
              gradeLevel: s.gradeLevel,
              emergencyPhone: s.emergencyPhone,
              academicStatus: s.academicStatus || 'ACTIVE',
              groupId: enrollment.groupId,
              updatedAt: s.updatedAt,
            });
          }
        }
        students = Array.from(studentMap.values());
      }
    } catch (err) {
      this.logger.warn('Failed to fetch students in bootstrap snapshot:', err);
      students = [];
    }

    // 4. Schedules
    let schedules: any[] = [];
    try {
      if (groupIds.length > 0) {
        schedules = await this.prisma.lessonSchedule.findMany({
          where: {
            groupId: { in: groupIds },
          },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch schedules in bootstrap snapshot:', err);
      schedules = [];
    }

    // 5. Sessions
    let sessions: any[] = [];
    try {
      if (groupIds.length > 0) {
        sessions = await this.prisma.lessonSession.findMany({
          where: {
            groupId: { in: groupIds },
            ...(sinceDate ? { createdAt: { gte: sinceDate } } : {}),
          },
          include: {
            _count: { select: { attendanceRecords: true } },
          },
          orderBy: { sessionDate: 'asc' },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch sessions in bootstrap snapshot:', err);
      sessions = [];
    }

    // 6. Payments
    let payments: any[] = [];
    try {
      const studentIds = students.map((s) => s.id).filter(Boolean);
      const orConditions = [
        ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
        ...(studentIds.length > 0 ? [{ studentId: { in: studentIds } }] : []),
      ];

      if (orConditions.length > 0) {
        payments = await this.prisma.studentPaymentRecord.findMany({
          where: {
            OR: orConditions,
            ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
          },
          include: {
            student: {
              include: {
                user: { select: { fullName: true } },
              },
            },
            group: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch payments in bootstrap snapshot:', err);
      payments = [];
    }

    // 7. Assessments (with answer keys included for Teacher/Secretariat)
    let assessments: any[] = [];
    try {
      assessments = await this.prisma.assessment.findMany({
        where: {
          ...(user.role === UserRole.TEACHER && effectiveTeacherId ? { teacherId: effectiveTeacherId } : {}),
          ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
        },
        include: {
          questions: {
            orderBy: { questionNumber: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch assessments in bootstrap snapshot:', err);
      assessments = [];
    }

    // 8. Courses
    let courses: any[] = [];
    try {
      courses = await this.prisma.course.findMany({
        where: {
          ...(user.role === UserRole.TEACHER && effectiveTeacherId ? { teacherId: effectiveTeacherId } : {}),
          ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
        },
        include: {
          modules: {
            include: {
              lessons: {
                orderBy: { orderIndex: 'asc' },
              },
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch courses in bootstrap snapshot:', err);
      courses = [];
    }

    // 9. Attendance Records
    let attendanceRecords: any[] = [];
    try {
      if (groupIds.length > 0) {
        attendanceRecords = await this.prisma.attendanceRecord.findMany({
          where: {
            session: {
              groupId: { in: groupIds },
            },
            ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
          },
          include: {
            student: {
              include: {
                user: { select: { fullName: true, phone: true } },
              },
            },
            session: {
              select: { id: true, groupId: true, sessionDate: true, topic: true },
            },
          },
          orderBy: { recordedAt: 'desc' },
          take: 1000,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch attendance records in bootstrap snapshot:', err);
      attendanceRecords = [];
    }

    // 10. Booklets
    let booklets: any[] = [];
    try {
      if (typeof this.prisma.booklet?.findMany === 'function') {
        const rawBooklets = await this.prisma.booklet.findMany({
          where: {
            ...(user.role === UserRole.TEACHER && effectiveTeacherId
              ? { teacherProfileId: effectiveTeacherId }
              : {}),
            isActive: true,
            academicYear: academicPeriod.activeAcademicYear,
            academicTerm: academicPeriod.activeAcademicTerm,
            ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
          },
          include: {
            group: { select: { id: true, name: true, gradeLevel: true } },
            payments: {
              where: { paymentStatus: PaymentStatus.PAID },
              select: { id: true, amountPaid: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        booklets = (rawBooklets || []).map((b) => {
          const salesCount = b.payments?.length || 0;
          const totalRevenue = (b.payments || []).reduce((acc: number, p: any) => acc + Number(p.amountPaid || 0), 0);
          const { payments, ...rest } = b;
          return {
            ...rest,
            price: Number(b.price),
            salesCount,
            totalRevenue,
          };
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch booklets in bootstrap snapshot:', err);
      booklets = [];
    }

    return {
      snapshotVersion,
      timestamp,
      isDelta,
      role: user.role,
      data: {
        academicPeriod,
        groups: groups || [],
        students: students || [],
        schedules: schedules || [],
        sessions: sessions || [],
        payments: payments || [],
        attendance: attendanceRecords || [],
        assessments: assessments || [],
        courses: courses || [],
        booklets: booklets || [],
      },
    };
  }

  private async getStudentBootstrapSnapshot(
    user: AuthenticatedUser,
    timestamp: number,
    isDelta: boolean,
    sinceDate: Date | null,
    snapshotVersion: string,
  ): Promise<BootstrapSnapshotResponse> {
    const studentProfileId = user.studentProfileId || user.id;

    // 1. Enrolled Groups
    let groups: any[] = [];
    try {
      const enrollments = await this.prisma.groupEnrollment.findMany({
        where: {
          studentId: studentProfileId,
          status: GroupEnrollmentStatus.ACTIVE,
        },
        include: {
          group: {
            include: {
              schedules: true,
              teacher: {
                include: {
                  user: { select: { fullName: true } },
                },
              },
            },
          },
        },
      });
      groups = (enrollments || []).map((e) => e.group).filter(Boolean);
    } catch (err) {
      this.logger.warn('Failed to fetch student groups for bootstrap:', err);
      groups = [];
    }

    const groupIds = groups.map((g) => g.id).filter(Boolean);

    // 2. Upcoming Sessions
    let sessions: any[] = [];
    try {
      if (groupIds.length > 0) {
        sessions = await this.prisma.lessonSession.findMany({
          where: {
            groupId: { in: groupIds },
            ...(sinceDate ? { createdAt: { gte: sinceDate } } : {}),
          },
          orderBy: { sessionDate: 'asc' },
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch student sessions for bootstrap:', err);
      sessions = [];
    }

    // 3. Published Assessments (REDACTING correctAnswer for students!)
    let assessments: any[] = [];
    try {
      const rawAssessments = await this.prisma.assessment.findMany({
        where: {
          isPublished: true,
          ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
        },
        include: {
          questions: {
            orderBy: { questionNumber: 'asc' },
          },
          submissions: {
            where: { studentId: studentProfileId },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      // Redact answers for student security
      assessments = (rawAssessments || []).map((a) => ({
        ...a,
        questions: (a.questions || []).map((q) => {
          const { correctAnswer, ...safeQuestion } = q;
          return safeQuestion;
        }),
      }));
    } catch (err) {
      this.logger.warn('Failed to fetch student assessments for bootstrap:', err);
      assessments = [];
    }

    // 4. Enrolled Courses with student progress
    let courses: any[] = [];
    try {
      courses = await this.prisma.course.findMany({
        where: {
          enrollments: {
            some: { studentId: studentProfileId },
          },
        },
        include: {
          modules: {
            include: {
              lessons: {
                include: {
                  progresses: {
                    where: { studentId: studentProfileId },
                  },
                },
                orderBy: { orderIndex: 'asc' },
              },
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch student courses for bootstrap:', err);
      courses = [];
    }

    // 5. Personal Attendance History
    let attendanceHistory: any[] = [];
    try {
      attendanceHistory = await this.prisma.attendanceRecord.findMany({
        where: {
          studentId: studentProfileId,
          ...(sinceDate ? { recordedAt: { gte: sinceDate } } : {}),
        },
        include: {
          session: {
            include: { group: { select: { name: true } } },
          },
        },
        orderBy: { recordedAt: 'desc' },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch student attendance history for bootstrap:', err);
      attendanceHistory = [];
    }

    // 6. Personal Payment History
    let payments: any[] = [];
    try {
      payments = await this.prisma.studentPaymentRecord.findMany({
        where: {
          studentId: studentProfileId,
          ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
        },
        include: {
          group: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      this.logger.warn('Failed to fetch student payment history for bootstrap:', err);
      payments = [];
    }

    // 7. Available Booklets for Student
    let booklets: any[] = [];
    try {
      if (typeof this.prisma.booklet?.findMany === 'function') {
        const studentProfile = await this.prisma.studentProfile.findUnique({
          where: { id: studentProfileId },
          select: { gradeLevel: true },
        });

        const rawBooklets = await this.prisma.booklet.findMany({
          where: {
            isActive: true,
            ...(studentProfile?.gradeLevel ? { gradeLevel: studentProfile.gradeLevel } : {}),
            ...(groupIds.length > 0
              ? {
                  OR: [
                    { groupId: { in: groupIds } },
                    { groupId: null },
                  ],
                }
              : { groupId: null }),
            ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
          },
          include: {
            group: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        booklets = (rawBooklets || []).map((b) => ({
          ...b,
          price: Number(b.price),
        }));
      }
    } catch (err) {
      this.logger.warn('Failed to fetch student booklets for bootstrap:', err);
      booklets = [];
    }

    return {
      snapshotVersion,
      timestamp,
      isDelta,
      role: user.role,
      data: {
        groups: groups || [],
        sessions: sessions || [],
        assessments: assessments || [],
        courses: courses || [],
        attendanceHistory: attendanceHistory || [],
        payments: payments || [],
        booklets: booklets || [],
      },
    };
  }

  private async getParentBootstrapSnapshot(
    user: AuthenticatedUser,
    timestamp: number,
    isDelta: boolean,
    sinceDate: Date | null,
    snapshotVersion: string,
  ): Promise<BootstrapSnapshotResponse> {
    let children: any[] = [];
    try {
      const parent = await this.prisma.parentProfile.findUnique({
        where: { id: user.id },
        include: {
          studentLinks: {
            include: {
              student: {
                include: {
                  user: { select: { fullName: true, phone: true } },
                  groupEnrollments: {
                    where: { status: GroupEnrollmentStatus.ACTIVE },
                    include: { group: true },
                  },
                  attendanceRecords: {
                    orderBy: { recordedAt: 'desc' },
                    take: 50,
                  },
                  paymentRecords: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                  },
                  assessmentSubmissions: {
                    orderBy: { submittedAt: 'desc' },
                    take: 50,
                  },
                },
              },
            },
          },
        },
      });

      children = (parent?.studentLinks || []).map((link) => link.student).filter(Boolean);
    } catch (err) {
      this.logger.warn('Failed to fetch parent children for bootstrap:', err);
      children = [];
    }

    return {
      snapshotVersion,
      timestamp,
      isDelta,
      role: user.role,
      data: {
        children: children || [],
      },
    };
  }

  /**
   * Reconciles offline course progress heartbeats monotonically.
   */
  async processBatchProgress(studentId: string, dto: BatchProgressSyncDto) {
    this.logger.log(
      `Processing offline sync progress batch with ${dto.operations.length} operations for student [${studentId}]`,
    );
    return this.coursesService.applyMonotonicProgressBatch(studentId, dto.operations);
  }

  /**
   * Atomically ingests and reconciles batch offline attendance roll-call records.
   * Suppresses duplicate records gracefully via composite uniqueness checks.
   */
  async syncAttendanceBatch(
    user: AuthenticatedUser,
    dto: SyncAttendanceBatchDto,
  ): Promise<DomainSyncResult> {
    const result: DomainSyncResult = {
      syncedCount: 0,
      duplicatesIgnored: 0,
      failedCount: 0,
      processedOperationIds: [],
      conflicts: [],
    };

    if (!dto.operations || dto.operations.length === 0) {
      return result;
    }

    const recorderId = user.id;

    for (const op of dto.operations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 1. Verify session existence
          const session = await tx.lessonSession.findUnique({
            where: { id: op.sessionId },
            include: { group: true },
          });

          if (!session) {
            throw new NotFoundException(`Session [${op.sessionId}] not found`);
          }

          // 2. Resolve target student
          let resolvedStudentId = op.studentId;
          if (!resolvedStudentId && op.qrCodeToken) {
            const student = await tx.studentProfile.findFirst({
              where: {
                OR: [
                  { qrCodeToken: op.qrCodeToken.trim() },
                  { id: op.qrCodeToken.trim() },
                ],
              },
            });
            if (student) {
              resolvedStudentId = student.id;
            }
          }

          if (!resolvedStudentId) {
            result.conflicts.push({
              operationId: op.id,
              reason: 'Student could not be resolved from token or ID',
            });
            result.failedCount++;
            return;
          }

          // 3. Verify group enrollment if not cross-group allowed
          if (!op.allowCrossGroup) {
            const enrollment = await tx.groupEnrollment.findUnique({
              where: {
                groupId_studentId: {
                  groupId: session.groupId,
                  studentId: resolvedStudentId,
                },
              },
            });

            if (!enrollment || enrollment.status !== GroupEnrollmentStatus.ACTIVE) {
              result.conflicts.push({
                operationId: op.id,
                reason: `Student [${resolvedStudentId}] is not actively enrolled in group [${session.groupId}]`,
                entityId: resolvedStudentId,
              });
              result.failedCount++;
              return;
            }
          }

          // 4. Check for duplicate attendance record
          const existingRecord = await tx.attendanceRecord.findUnique({
            where: {
              sessionId_studentId: {
                sessionId: op.sessionId,
                studentId: resolvedStudentId,
              },
            },
          });

          if (existingRecord) {
            result.duplicatesIgnored++;
            result.processedOperationIds.push(op.id);
            return;
          }

          // 5. Insert attendance record
          const recordedAtDate = op.clientTimestamp
            ? new Date(op.clientTimestamp)
            : new Date();

          await tx.attendanceRecord.create({
            data: {
              sessionId: op.sessionId,
              studentId: resolvedStudentId,
              status: op.status || AttendanceStatus.PRESENT,
              recordingMethod: op.recordingMethod || RecordingMethod.QR_SCAN,
              recordedById: recorderId,
              recordedAt: recordedAtDate,
              notes: op.notes || 'Synced from offline outbox queue',
            },
          });

          result.syncedCount++;
          result.processedOperationIds.push(op.id);
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          // Prisma unique constraint violation (e.g. uq_session_student) -> Treat gracefully as duplicate ignored
          result.duplicatesIgnored++;
          result.processedOperationIds.push(op.id);
        } else {
          this.logger.error(`Failed to sync attendance op [${op.id}]:`, err);
          result.failedCount++;
          result.conflicts.push({
            operationId: op.id,
            reason: err?.message || 'Database transaction failure',
          });
        }
      }
    }

    return result;
  }

  /**
   * Atomically reconciles batch offline tuition payments.
   * Enforces billing period idempotency to prevent duplicate charges.
   */
  async syncPaymentsBatch(
    user: AuthenticatedUser,
    dto: SyncPaymentsBatchDto,
  ): Promise<DomainSyncResult> {
    const result: DomainSyncResult = {
      syncedCount: 0,
      duplicatesIgnored: 0,
      failedCount: 0,
      processedOperationIds: [],
      conflicts: [],
      idMappings: {},
      processedPayments: [],
    };

    if (!dto.operations || dto.operations.length === 0) {
      return result;
    }

    const recorderId = user.id;

    for (const op of dto.operations) {
      const opId = op.id || op.clientTempId || randomUUID();

      if (op.type === 'DELETE_PAYMENT') {
        const targetPaymentId = op.paymentId || op.id;
        try {
          await this.prisma.$transaction(async (tx) => {
            const payment = await tx.studentPaymentRecord.findUnique({
              where: { id: targetPaymentId },
              include: { group: true },
            });

            if (!payment) {
              // Already deleted (or never persisted) on the server: treat as an idempotent success.
              result.duplicatesIgnored++;
              result.processedOperationIds.push(opId);
              return;
            }

            if (user.role === UserRole.TEACHER) {
              const teacherId = user.teacherProfileId || user.id;
              if (payment.group && payment.group.teacherId !== teacherId && payment.group.teacherId !== user.id) {
                result.conflicts.push({
                  operationId: opId,
                  reason: 'FORBIDDEN: You do not own the academic group for this payment',
                  entityId: targetPaymentId,
                });
                result.failedCount++;
                return;
              }
            }

            await tx.studentPaymentRecord.delete({ where: { id: targetPaymentId } });

            result.syncedCount++;
            result.processedOperationIds.push(opId);
          });
        } catch (err: any) {
          this.logger.error(`Failed to sync DELETE_PAYMENT op [${opId}]:`, err);
          result.failedCount++;
          result.conflicts.push({
            operationId: opId,
            reason: err?.message || 'Payment deletion transaction error',
          });
        }
        continue;
      }

      const amountPaid = op.amountPaid ?? op.amount ?? 0;
      const amountExpected = op.amountExpected ?? op.amount ?? op.amountPaid ?? 0;
      const periodYear = op.periodYear || op.billingPeriodYear || new Date().getFullYear();
      const periodMonth = op.periodMonth || op.billingPeriodMonth || (new Date().getMonth() + 1);
      const paymentDate = op.collectedAt
        ? new Date(op.collectedAt)
        : op.clientTimestamp
        ? new Date(op.clientTimestamp)
        : new Date();

      try {
        await this.prisma.$transaction(async (tx) => {
          // Verify student existence
          const student = await tx.studentProfile.findUnique({
            where: { id: op.studentId },
            include: { groupEnrollments: true },
          });

          if (!student) {
            result.conflicts.push({
              operationId: opId,
              reason: `Student [${op.studentId}] not found in database`,
              entityId: op.studentId,
            });
            result.failedCount++;
            return;
          }

          const isBookletOp = op.paymentType === 'BOOKLET' || Boolean(op.bookletId);

          // Resolve group ID if not provided: pick student's first active enrollment
          let resolvedGroupId = op.groupId;
          if (!resolvedGroupId && student.groupEnrollments?.length > 0) {
            const activeEnrollment = student.groupEnrollments.find(
              (e: any) => e.status === GroupEnrollmentStatus.ACTIVE,
            );
            resolvedGroupId = activeEnrollment?.groupId || student.groupEnrollments[0].groupId;
          }

          let savedPaymentRecord: any = null;

          if (isBookletOp && op.bookletId) {
            // Flow A: Ingest Booklet Payment
            const booklet = await tx.booklet.findUnique({
              where: { id: op.bookletId },
            });

            if (booklet && student.gradeLevel && booklet.gradeLevel && student.gradeLevel !== booklet.gradeLevel) {
              result.conflicts.push({
                operationId: opId,
                reason: 'هذه المذكرة غير مخصصة للصف الدراسي لهذا الطالب',
                code: 'BOOKLET_GRADE_MISMATCH',
                entityId: op.bookletId,
                details: {
                  studentId: student.id,
                  studentGradeLevel: student.gradeLevel,
                  bookletId: booklet.id,
                  bookletGradeLevel: booklet.gradeLevel,
                },
              });
              result.failedCount++;
              return;
            }

            if (booklet?.groupId) {
              const studentGroupIds = student.groupEnrollments?.map((e: any) => e.groupId) || [];
              if (!studentGroupIds.includes(booklet.groupId)) {
                result.conflicts.push({
                  operationId: opId,
                  reason: 'INVALID_BOOKLET_FOR_STUDENT: هذه المذكرة غير مخصصة للصف الدراسي أو المجموعة الخاصة بهذا الطالب',
                  entityId: op.bookletId,
                });
                result.failedCount++;
                return;
              }
            }

            const existingBookletPayment = await tx.studentPaymentRecord.findFirst({
              where: {
                studentId: op.studentId,
                bookletId: op.bookletId,
                paymentType: PaymentType.BOOKLET,
              },
            });

            if (existingBookletPayment && existingBookletPayment.paymentStatus === PaymentStatus.PAID) {
              result.duplicatesIgnored++;
              result.processedOperationIds.push(opId);
              if (result.idMappings) {
                if (op.clientTempId) result.idMappings[op.clientTempId] = existingBookletPayment.id;
                if (op.id) result.idMappings[op.id] = existingBookletPayment.id;
              }
              result.processedPayments?.push({
                id: existingBookletPayment.id,
                studentId: op.studentId,
                bookletId: op.bookletId,
                paymentType: 'BOOKLET',
                amountPaid: existingBookletPayment.amountPaid,
                paymentStatus: PaymentStatus.PAID,
              });
              return;
            } else if (existingBookletPayment) {
              savedPaymentRecord = await tx.studentPaymentRecord.update({
                where: { id: existingBookletPayment.id },
                data: {
                  amountPaid,
                  amountExpected: Math.max(amountExpected, Number(existingBookletPayment.amountExpected || 0)),
                  paymentStatus: op.paymentStatus || PaymentStatus.PAID,
                  paymentMethod: op.paymentMethod || 'CASH',
                  receiptNumber: op.receiptNumber || existingBookletPayment.receiptNumber,
                  notes: op.notes || existingBookletPayment.notes,
                  recordedById: recorderId,
                  updatedAt: new Date(),
                },
              });
            } else {
              savedPaymentRecord = await tx.studentPaymentRecord.create({
                data: {
                  studentId: op.studentId,
                  groupId: resolvedGroupId || null,
                  bookletId: op.bookletId,
                  paymentType: PaymentType.BOOKLET,
                  periodYear,
                  periodMonth,
                  amountPaid,
                  amountExpected,
                  paymentStatus: op.paymentStatus || PaymentStatus.PAID,
                  paymentMethod: op.paymentMethod || 'CASH',
                  currency: op.currency || 'EGP',
                  receiptNumber: op.receiptNumber || `REC-BKT-${randomUUID().slice(0, 8)}`,
                  notes: op.notes || 'Synced booklet payment from offline outbox',
                  recordedById: recorderId,
                  createdAt: paymentDate,
                  updatedAt: paymentDate,
                },
              });

              // Decrement booklet stock if tracked
              if (typeof tx.booklet?.update === 'function') {
                try {
                  const booklet = await tx.booklet.findUnique({ where: { id: op.bookletId } });
                  if (booklet && booklet.stockCount !== null && booklet.stockCount > 0) {
                    await tx.booklet.update({
                      where: { id: op.bookletId },
                      data: { stockCount: { decrement: 1 } },
                    });
                  }
                } catch {
                  // non-blocking
                }
              }
            }
          } else {
            // Flow B: Ingest Monthly Tuition Payment
            let existingPayment: any = null;
            if (resolvedGroupId) {
              existingPayment = await tx.studentPaymentRecord.findFirst({
                where: {
                  studentId: op.studentId,
                  groupId: resolvedGroupId,
                  periodYear,
                  periodMonth,
                  paymentType: PaymentType.TUITION,
                },
              });
            } else {
              existingPayment = await tx.studentPaymentRecord.findFirst({
                where: {
                  studentId: op.studentId,
                  periodYear,
                  periodMonth,
                  paymentType: PaymentType.TUITION,
                },
              });
            }

            if (existingPayment && existingPayment.paymentStatus === PaymentStatus.PAID) {
              result.duplicatesIgnored++;
              result.processedOperationIds.push(opId);
              if (result.idMappings) {
                if (op.clientTempId) result.idMappings[op.clientTempId] = existingPayment.id;
                if (op.id) result.idMappings[op.id] = existingPayment.id;
              }
              result.processedPayments?.push({
                id: existingPayment.id,
                studentId: op.studentId,
                groupId: resolvedGroupId,
                periodYear,
                periodMonth,
                amountPaid: existingPayment.amountPaid,
                paymentStatus: PaymentStatus.PAID,
              });
              return;
            } else if (existingPayment) {
              savedPaymentRecord = typeof tx.studentPaymentRecord?.update === 'function'
                ? await tx.studentPaymentRecord.update({
                    where: { id: existingPayment.id },
                    data: {
                      amountPaid,
                      amountExpected: Math.max(amountExpected, Number(existingPayment.amountExpected || 0)),
                      paymentStatus: op.paymentStatus || PaymentStatus.PAID,
                      paymentMethod: op.paymentMethod || 'CASH',
                      receiptNumber: op.receiptNumber || existingPayment.receiptNumber,
                      notes: op.notes || existingPayment.notes,
                      recordedById: recorderId,
                      updatedAt: new Date(),
                    },
                  })
                : existingPayment;
            } else {
              savedPaymentRecord = await tx.studentPaymentRecord.create({
                data: {
                  studentId: op.studentId,
                  groupId: resolvedGroupId || null,
                  paymentType: PaymentType.TUITION,
                  periodYear,
                  periodMonth,
                  amountPaid,
                  amountExpected,
                  paymentStatus: op.paymentStatus || PaymentStatus.PAID,
                  paymentMethod: op.paymentMethod || 'CASH',
                  currency: op.currency || 'EGP',
                  receiptNumber: op.receiptNumber || `REC-${periodYear}-${String(periodMonth).padStart(2, '0')}-${randomUUID().slice(0, 8)}`,
                  notes: op.notes || 'Synced from offline outbox',
                  recordedById: recorderId,
                  createdAt: paymentDate,
                  updatedAt: paymentDate,
                },
              });
            }
          }

          // Ensure group enrollment status is ACTIVE
          if (resolvedGroupId && typeof tx.groupEnrollment?.updateMany === 'function') {
            await tx.groupEnrollment.updateMany({
              where: {
                studentId: op.studentId,
                groupId: resolvedGroupId,
              },
              data: {
                status: GroupEnrollmentStatus.ACTIVE,
              },
            });
          }

          if (result.idMappings && op.clientTempId) {
            result.idMappings[op.clientTempId] = savedPaymentRecord.id;
          } else if (result.idMappings && op.id) {
            result.idMappings[op.id] = savedPaymentRecord.id;
          }

          result.processedPayments?.push({
            id: savedPaymentRecord.id,
            studentId: op.studentId,
            groupId: resolvedGroupId,
            periodYear,
            periodMonth,
            amountPaid,
            paymentStatus: PaymentStatus.PAID,
          });

          result.syncedCount++;
          result.processedOperationIds.push(opId);
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          // Prisma unique constraint violation -> Treat gracefully as duplicate ignored
          result.duplicatesIgnored++;
          result.processedOperationIds.push(opId);
        } else {
          this.logger.error(`Failed to sync payment op [${opId}]:`, err);
          result.failedCount++;
          result.conflicts.push({
            operationId: opId,
            reason: err?.message || 'Payment sync transaction error',
          });
        }
      }
    }

    return result;
  }

  /**
   * Ingests and auto-grades offline assessment submissions.
   */
  async syncAssessmentsBatch(
    studentId: string,
    dto: SyncAssessmentsBatchDto,
  ): Promise<DomainSyncResult> {
    const result: DomainSyncResult = {
      syncedCount: 0,
      duplicatesIgnored: 0,
      failedCount: 0,
      processedOperationIds: [],
      conflicts: [],
    };

    if (!dto.operations || dto.operations.length === 0) {
      return result;
    }

    for (const op of dto.operations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const assessment = await tx.assessment.findUnique({
            where: { id: op.assessmentId },
            include: { questions: true },
          });

          if (!assessment) {
            result.conflicts.push({
              operationId: op.id,
              reason: `Assessment [${op.assessmentId}] not found`,
              entityId: op.assessmentId,
            });
            result.failedCount++;
            return;
          }

          // Check if submission already exists
          const existingSubmission = await tx.assessmentSubmission.findUnique({
            where: {
              assessmentId_studentId: {
                assessmentId: op.assessmentId,
                studentId,
              },
            },
          });

          if (existingSubmission) {
            result.duplicatesIgnored++;
            result.processedOperationIds.push(op.id);
            return;
          }

          // Auto-grading computation
          let calculatedScore = 0;
          let hasEssayQuestions = false;

          const questionMap = new Map(assessment.questions.map((q) => [q.id, q]));
          const answersToCreate: Array<{
            questionId: string;
            selectedAnswer: string;
            isCorrect: boolean | null;
            pointsEarned: number | null;
            maxPointsSnapshot: number;
          }> = [];

          for (const ans of op.answers) {
            const question = questionMap.get(ans.questionId);
            if (!question) continue;

            const maxPoints = Number(question.points);
            let isCorrect: boolean | null = null;
            let pointsEarned: number | null = null;

            if (
              question.questionType === QuestionType.MULTIPLE_CHOICE ||
              question.questionType === QuestionType.TRUE_FALSE
            ) {
              isCorrect =
                (ans.selectedAnswer || '').trim().toLowerCase() ===
                (question.correctAnswer || '').trim().toLowerCase();
              pointsEarned = isCorrect ? maxPoints : 0;
              calculatedScore += pointsEarned;
            } else if (question.questionType === QuestionType.ESSAY) {
              hasEssayQuestions = true;
              isCorrect = null;
              pointsEarned = null;
            }

            answersToCreate.push({
              questionId: ans.questionId,
              selectedAnswer: ans.selectedAnswer,
              isCorrect,
              pointsEarned,
              maxPointsSnapshot: maxPoints,
            });
          }

          const finalStatus = hasEssayQuestions
            ? SubmissionStatus.SUBMITTED
            : SubmissionStatus.GRADED;

          const submittedAt = op.clientTimestamp
            ? new Date(op.clientTimestamp)
            : new Date();

          const submission = await tx.assessmentSubmission.create({
            data: {
              assessmentId: op.assessmentId,
              studentId,
              status: finalStatus,
              scoreObtained: hasEssayQuestions ? null : calculatedScore,
              isAutoGraded: !hasEssayQuestions,
              gradedAt: hasEssayQuestions ? null : submittedAt,
              submittedAt,
              attachmentUrl: op.attachmentUrl,
            },
          });

          if (answersToCreate.length > 0) {
            await tx.studentAnswer.createMany({
              data: answersToCreate.map((a) => ({
                submissionId: submission.id,
                ...a,
              })),
            });
          }

          result.syncedCount++;
          result.processedOperationIds.push(op.id);
        });
      } catch (err: any) {
        this.logger.error(`Failed to sync assessment op [${op.id}]:`, err);
        result.failedCount++;
        result.conflicts.push({
          operationId: op.id,
          reason: err?.message || 'Assessment sync error',
        });
      }
    }

    return result;
  }

  /**
   * Unified multi-domain batch processor.
   */
  async syncUnifiedBatch(
    user: AuthenticatedUser,
    dto: UnifiedSyncBatchDto,
  ) {
    const idMappings: {
      groups: Record<string, string>;
      students: Record<string, { id: string; studentCode: string; qrCodeToken: string }>;
      payments: Record<string, string>;
    } = {
      groups: {},
      students: {},
      payments: {},
    };

    // 1. Transactional Groups & Students Batch Ingestion
    if ((dto.groups && dto.groups.length > 0) || (dto.students && dto.students.length > 0)) {
      await this.prisma.$transaction(async (tx) => {
        let effectiveTeacherId = user.teacherProfileId || user.id;
        if (typeof tx.teacherProfile?.findFirst === 'function') {
          const teacherProfile = await tx.teacherProfile.findFirst({
            where: {
              OR: [
                { id: user.teacherProfileId },
                { user: { id: user.id } },
                { id: user.id },
              ],
            },
          });
          if (teacherProfile) {
            effectiveTeacherId = teacherProfile.id;
          }
        }

        // Step A: Groups Ingestion
        if (dto.groups && dto.groups.length > 0) {
          for (const g of dto.groups) {
            const existing = await tx.academicGroup.findFirst({
              where: {
                OR: [
                  { id: g.clientTempId },
                  { name: g.name, teacherId: effectiveTeacherId },
                ],
              },
            });

            if (existing) {
              if (g.type === 'UPDATE_GROUP') {
                await tx.academicGroup.update({
                  where: { id: existing.id },
                  data: {
                    name: g.name,
                    gradeLevel: g.gradeLevel,
                    academicYear: g.academicYear ?? existing.academicYear,
                    academicTerm: g.academicTerm ?? existing.academicTerm,
                    description: g.description,
                    maxCapacity: g.maxCapacity ?? existing.maxCapacity,
                    monthlyFee: g.monthlyFee ?? existing.monthlyFee,
                  },
                });
              }
              idMappings.groups[g.clientTempId] = existing.id;
            } else {
              if (g.type === 'UPDATE_GROUP') {
                throw new NotFoundException(`Academic group [${g.clientTempId}] not found for update`);
              }
              const created = await tx.academicGroup.create({
                data: {
                  id: g.clientTempId,
                  name: g.name,
                  gradeLevel: g.gradeLevel,
                  academicYear: g.academicYear || '2026-2027',
                  academicTerm: g.academicTerm || 'FIRST_TERM',
                  description: g.description,
                  maxCapacity: g.maxCapacity || 50,
                  monthlyFee: g.monthlyFee || 0.0,
                  teacherId: effectiveTeacherId,
                  isActive: true,
                  schedules: g.schedules?.length
                    ? {
                        create: g.schedules.map((s: any) => ({
                          dayOfWeek: s.dayOfWeek,
                          startTime: s.startTime,
                          endTime: s.endTime,
                          location: s.location || null,
                        })),
                      }
                    : undefined,
                },
              });
              idMappings.groups[g.clientTempId] = created.id;
            }
          }
        }

        // Step B: Students Ingestion
        if (dto.students && dto.students.length > 0) {
          for (const s of dto.students) {
            const studentFullName = s.fullName || s.name || 'طالب';
            const isTempIdUuid =
              typeof s.clientTempId === 'string' &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                s.clientTempId,
              );
            const studentIdForDb = isTempIdUuid ? s.clientTempId : randomUUID();

            const existingStudent = await tx.studentProfile.findFirst({
              where: {
                OR: [
                  ...(isTempIdUuid ? [{ id: s.clientTempId }] : []),
                  ...(s.phone ? [{ user: { phone: s.phone } }] : []),
                ],
              },
              include: { user: true },
            });

            let finalStudentId = studentIdForDb;
            let finalStudentCode = '';
            let finalQrToken = '';

            if (existingStudent) {
              if (s.type === 'UPDATE_STUDENT') {
                await tx.user.update({
                  where: { id: existingStudent.id },
                  data: {
                    fullName: s.fullName ?? s.name ?? existingStudent.user?.fullName,
                    phone: s.phone ?? existingStudent.user?.phone,
                    email: s.email ?? existingStudent.user?.email,
                  },
                });
                await tx.studentProfile.update({
                  where: { id: existingStudent.id },
                  data: {
                    gradeLevel: s.gradeLevel ?? existingStudent.gradeLevel,
                    academicStage: s.academicStage ?? existingStudent.academicStage,
                    emergencyPhone: s.parentPhone ?? existingStudent.emergencyPhone,
                  },
                });
              }
              finalStudentId = existingStudent.id;
              finalStudentCode = existingStudent.studentCode || '';
              finalQrToken = existingStudent.qrCodeToken || '';
            } else {
              if (s.type === 'UPDATE_STUDENT') {
                throw new NotFoundException(`Student [${s.clientTempId}] not found for update`);
              }
              const passwordHash = await bcrypt.hash(s.password || 'Password123!', 10);
              const userRecord = await tx.user.create({
                data: {
                  id: studentIdForDb,
                  fullName: studentFullName,
                  phone: s.phone,
                  email: s.email,
                  passwordHash,
                  role: UserRole.STUDENT,
                  isActive: true,
                },
              });

              finalStudentCode = await generateUniqueStudentCode(tx);
              finalQrToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

              const studentProfile = await tx.studentProfile.create({
                data: {
                  id: userRecord.id,
                  studentCode: finalStudentCode,
                  qrCodeToken: finalQrToken,
                  gradeLevel: s.gradeLevel,
                  academicStage: s.academicStage,
                  academicStatus: 'ACTIVE',
                  emergencyPhone: s.parentPhone,
                },
              });

              finalStudentId = studentProfile.id;

              // Link Parent if provided
              if (s.parentPhone) {
                let parentUser = await tx.user.findUnique({
                  where: { phone: s.parentPhone },
                  include: { parentProfile: true },
                });

                if (!parentUser) {
                  const parentPasswordHash = await bcrypt.hash('Parent123!', 10);
                  parentUser = await tx.user.create({
                    data: {
                      fullName: s.parentName || `ولي أمر ${studentFullName}`,
                      phone: s.parentPhone,
                      passwordHash: parentPasswordHash,
                      role: UserRole.PARENT,
                      isActive: true,
                      parentProfile: {
                        create: {
                          relationshipType: s.parentRelationship || 'ولي أمر',
                        },
                      },
                    },
                    include: { parentProfile: true },
                  });
                }

                if (parentUser.parentProfile) {
                  await tx.parentStudentLink.create({
                    data: {
                      parentId: parentUser.parentProfile.id,
                      studentId: finalStudentId,
                    },
                  });
                }
              }
            }

            // Step C: Enroll in group if provided
            const targetGroupId = s.groupId || s.initialGroupId;
            if (targetGroupId) {
              const resolvedGroupId = idMappings.groups[targetGroupId] || targetGroupId;
              const isCreatedInThisBatch = Boolean(idMappings.groups[targetGroupId]);

              const groupExists =
                isCreatedInThisBatch ||
                (typeof tx.academicGroup?.findFirst === 'function'
                  ? await tx.academicGroup.findFirst({ where: { id: resolvedGroupId } })
                  : typeof tx.academicGroup?.findUnique === 'function'
                  ? await tx.academicGroup.findUnique({ where: { id: resolvedGroupId } })
                  : true);

              if (groupExists) {
                const existingEnrollment =
                  typeof tx.groupEnrollment?.findFirst === 'function'
                    ? await tx.groupEnrollment.findFirst({
                        where: {
                          groupId: resolvedGroupId,
                          studentId: finalStudentId,
                        },
                      })
                    : null;

                if (!existingEnrollment && typeof tx.groupEnrollment?.create === 'function') {
                  await tx.groupEnrollment.create({
                    data: {
                      groupId: resolvedGroupId,
                      studentId: finalStudentId,
                      status: GroupEnrollmentStatus.ACTIVE,
                    },
                  });
                }
              }
            }

            idMappings.students[s.clientTempId] = {
              id: finalStudentId,
              studentCode: finalStudentCode,
              qrCodeToken: finalQrToken,
            };
          }
        }
      });
    }

    const results: {
      attendance?: DomainSyncResult;
      payments?: DomainSyncResult;
      progress?: any;
      assessments?: DomainSyncResult;
    } = {};

    if (dto.attendance && dto.attendance.length > 0) {
      results.attendance = await this.syncAttendanceBatch(user, {
        operations: dto.attendance,
      });
    }

    if (dto.payments && dto.payments.length > 0) {
      results.payments = await this.syncPaymentsBatch(user, {
        operations: dto.payments,
      });
      if (results.payments.idMappings) {
        idMappings.payments = {
          ...(idMappings.payments || {}),
          ...results.payments.idMappings,
        };
      }
    }

    if (dto.progress && dto.progress.length > 0) {
      const studentId = user.studentProfileId || user.id;
      results.progress = await this.processBatchProgress(studentId, {
        operations: dto.progress,
      });
    }

    if (dto.assessments && dto.assessments.length > 0) {
      const studentId = user.studentProfileId || user.id;
      results.assessments = await this.syncAssessmentsBatch(studentId, {
        operations: dto.assessments,
      });
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      idMappings,
      results,
    };
  }
}
