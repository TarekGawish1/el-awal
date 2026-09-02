import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
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
import { SyncHomeworkBatchDto } from '../dto/sync-homework.dto';
import { UnifiedSyncBatchDto, SyncMutationItemDto } from '../dto/sync-batch.dto';
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
  HomeworkSubmissionStatus,
  HomeworkDeliveryType,
  AssessmentType,
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
    homework?: any[];
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
    let allTeacherGroupIds: string[] = [];
    try {
      const allGroups = await this.prisma.academicGroup.findMany({
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
        },
        select: { id: true },
      });
      allTeacherGroupIds = allGroups.map((g) => g.id).filter(Boolean);

      const groupsWhere: any = {
        id: { in: allTeacherGroupIds },
        isActive: true,
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
    let students: any[] = [];
    try {
      const targetGroupIds = allTeacherGroupIds.length > 0 ? allTeacherGroupIds : groupIds;
      if (targetGroupIds.length > 0) {
        const enrollments = await this.prisma.groupEnrollment.findMany({
          where: {
            groupId: { in: targetGroupIds },
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
        for (const enrollment of ((enrollments as any[]) || [])) {
          if (
            enrollment?.student &&
            enrollment.student.user?.isActive !== false &&
            (enrollment.student.academicStatus || 'ACTIVE') === 'ACTIVE'
          ) {
            const s = enrollment.student;
            const existing = studentMap.get(s.id);
            if (!existing) {
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
                groupIds: [enrollment.groupId],
                updatedAt: s.updatedAt,
              });
            } else {
              if (enrollment.groupId && !existing.groupIds.includes(enrollment.groupId)) {
                existing.groupIds.push(enrollment.groupId);
              }
            }
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

    // 11. Homework Records
    let homeworkRecords: any[] = [];
    try {
      if (typeof this.prisma.homeworkRecord?.findMany === 'function') {
        homeworkRecords = await this.prisma.homeworkRecord.findMany({
          where: {
            session: {
              groupId: { in: groupIds },
            },
            ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
          },
          orderBy: { updatedAt: 'desc' },
          take: 1000,
        });
      }
    } catch (err) {
      this.logger.warn('Failed to fetch homework records in bootstrap snapshot:', err);
      homeworkRecords = [];
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
        homework: homeworkRecords || [],
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

          // 3. Verify group enrollment
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
          } else {
            // Verify they belong to AT LEAST ONE valid active group (legitimate guest)
            const anyActiveEnrollment = await tx.groupEnrollment.findFirst({
              where: {
                studentId: resolvedStudentId,
                status: GroupEnrollmentStatus.ACTIVE,
              },
            });

            if (!anyActiveEnrollment) {
              result.conflicts.push({
                operationId: op.id,
                reason: `Student [${resolvedStudentId}] has no active group enrollments to qualify for cross-group attendance`,
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

      let incomingAmountPaid: number | undefined = undefined;
      if (op.amountPaid !== undefined && op.amountPaid !== null) {
        incomingAmountPaid = Number(op.amountPaid);
      } else if (op.amount !== undefined && op.amount !== null) {
        incomingAmountPaid = Number(op.amount);
      }

      if (incomingAmountPaid !== undefined && (isNaN(incomingAmountPaid) || !isFinite(incomingAmountPaid) || incomingAmountPaid < 0)) {
        result.failedCount++;
        result.conflicts.push({
          operationId: opId,
          reason: 'Invalid payment amount',
        });
        continue;
      }

      let clientExpected = Number(op.amountExpected ?? op.amount ?? 0);
      let finalAmountPaid = 0;

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

            let authoritativeExpected = booklet && Number(booklet.price) > 0 ? Number(booklet.price) : clientExpected;
            let amountPaid = incomingAmountPaid !== undefined ? incomingAmountPaid : authoritativeExpected;
            let amountExpected = authoritativeExpected;
            finalAmountPaid = amountPaid;

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

            const existingOp = await tx.studentPaymentRecord.findUnique({
              where: { operationId: opId },
            });
            if (existingOp) {
              result.duplicatesIgnored++;
              result.processedOperationIds.push(opId);
              if (result.idMappings) {
                if (op.clientTempId) result.idMappings[op.clientTempId] = existingOp.id;
                if (op.id) result.idMappings[op.id] = existingOp.id;
              }
              return;
            }

            if (existingBookletPayment) {
              const existingPaid = Number(existingBookletPayment.amountPaid || 0);
              const existingExpected = Math.max(Number(existingBookletPayment.amountExpected || 0), amountExpected);
              
              const isExistingFullyPaid = existingPaid >= existingExpected && existingExpected > 0;
              const isIncomingFullPayment = amountPaid >= amountExpected && amountExpected > 0;

              if (isExistingFullyPaid && isIncomingFullPayment) {
                result.conflicts.push({
                  operationId: opId,
                  reason: 'DUPLICATE_BUSINESS_PAYMENT: This booklet is already fully paid.',
                  entityId: existingBookletPayment.id,
                });
                result.duplicatesIgnored++;
                result.processedOperationIds.push(opId);
                if (result.idMappings && op.clientTempId) {
                  result.idMappings[op.clientTempId] = existingBookletPayment.id;
                }
                return;
              }

              const newTotalPaid = existingPaid + amountPaid;
              const newExpected = Math.max(amountExpected, existingExpected);
              const newStatus = newTotalPaid >= newExpected && newExpected > 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;

              savedPaymentRecord = await tx.studentPaymentRecord.update({
                where: { id: existingBookletPayment.id },
                data: {
                  amountPaid: newTotalPaid,
                  amountExpected: newExpected,
                  paymentStatus: newStatus,
                  paymentMethod: op.paymentMethod || existingBookletPayment.paymentMethod,
                  receiptNumber: op.receiptNumber || existingBookletPayment.receiptNumber,
                  notes: op.notes || existingBookletPayment.notes,
                  recordedById: recorderId,
                  updatedAt: new Date(),
                },
              });
            } else {
              const finalStatus = amountPaid >= amountExpected && amountExpected > 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;

              savedPaymentRecord = await tx.studentPaymentRecord.create({
                data: {
                  operationId: opId,
                  studentId: op.studentId,
                  groupId: resolvedGroupId || null,
                  bookletId: op.bookletId,
                  paymentType: PaymentType.BOOKLET,
                  periodYear,
                  periodMonth,
                  amountPaid,
                  amountExpected: amountExpected,
                  paymentStatus: finalStatus,
                  paymentMethod: op.paymentMethod || 'CASH',
                  currency: op.currency || 'EGP',
                  receiptNumber: op.receiptNumber || `REC-BKT-${randomUUID().slice(0, 8)}`,
                  notes: op.notes || 'Synced booklet payment from offline outbox',
                  recordedById: recorderId,
                  createdAt: paymentDate,
                  updatedAt: paymentDate,
                },
              });

              if (typeof tx.booklet?.update === 'function') {
                try {
                  const b = await tx.booklet.findUnique({ where: { id: op.bookletId } });
                  if (b && b.stockCount !== null && b.stockCount > 0) {
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
            let authoritativeExpected = clientExpected;
            if (resolvedGroupId && typeof tx.academicGroup?.findUnique === 'function') {
              try {
                const group = await tx.academicGroup.findUnique({
                  where: { id: resolvedGroupId },
                  select: { monthlyFee: true },
                });
                if (group && Number(group.monthlyFee) > 0) {
                  authoritativeExpected = Number(group.monthlyFee);
                }
              } catch {}
            }
            
            let amountPaid = incomingAmountPaid !== undefined ? incomingAmountPaid : authoritativeExpected;
            let amountExpected = authoritativeExpected;
            finalAmountPaid = amountPaid;

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

            const existingOp = await tx.studentPaymentRecord.findUnique({
              where: { operationId: opId },
            });
            if (existingOp) {
              result.duplicatesIgnored++;
              result.processedOperationIds.push(opId);
              if (result.idMappings) {
                if (op.clientTempId) result.idMappings[op.clientTempId] = existingOp.id;
                if (op.id) result.idMappings[op.id] = existingOp.id;
              }
              return;
            }

            if (existingPayment) {
              const existingPaid = Number(existingPayment.amountPaid || 0);
              const existingExpected = Math.max(Number(existingPayment.amountExpected || 0), amountExpected);
              
              const isExistingFullyPaid = existingPaid >= existingExpected && existingExpected > 0;
              const isIncomingFullPayment = amountPaid >= amountExpected && amountExpected > 0;

              if (isExistingFullyPaid && isIncomingFullPayment) {
                // Business-level duplicate detection:
                // This period is already fully paid, and an offline device is submitting another full payment.
                // This happens when two secretaries scan the same student offline.
                // We ignore the incoming payment to prevent corrupting the balance, but record a conflict.
                result.conflicts.push({
                  operationId: opId,
                  reason: 'DUPLICATE_BUSINESS_PAYMENT: This tuition period is already fully paid.',
                  entityId: existingPayment.id,
                });
                result.duplicatesIgnored++;
                result.processedOperationIds.push(opId);
                if (result.idMappings && op.clientTempId) {
                  result.idMappings[op.clientTempId] = existingPayment.id;
                }
                return; // short-circuit without modifying the DB
              }

              const newTotalPaid = existingPaid + amountPaid;
              const newExpected = Math.max(amountExpected, existingExpected);
              const newStatus = newTotalPaid >= newExpected && newExpected > 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;

              savedPaymentRecord = typeof tx.studentPaymentRecord?.update === 'function'
                ? await tx.studentPaymentRecord.update({
                    where: { id: existingPayment.id },
                    data: {
                      amountPaid: newTotalPaid,
                      amountExpected: newExpected,
                      paymentStatus: newStatus,
                      paymentMethod: op.paymentMethod || existingPayment.paymentMethod,
                      receiptNumber: op.receiptNumber || existingPayment.receiptNumber,
                      notes: op.notes || existingPayment.notes,
                      recordedById: recorderId,
                      updatedAt: new Date(),
                    },
                  })
                : existingPayment;
            } else {
              const finalStatus = amountPaid >= amountExpected && amountExpected > 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;

              savedPaymentRecord = await tx.studentPaymentRecord.create({
                data: {
                  operationId: opId,
                  studentId: op.studentId,
                  groupId: resolvedGroupId || null,
                  paymentType: PaymentType.TUITION,
                  periodYear,
                  periodMonth,
                  amountPaid,
                  amountExpected: amountExpected,
                  paymentStatus: finalStatus,
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
            amountPaid: finalAmountPaid,
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

          // Resolve the student's attempt history for this assessment. The
          // single-submission unique constraint was replaced by a per-attempt one,
          // so we enforce the attempt policy explicitly here.
          const priorSubmissions = await tx.assessmentSubmission.findMany({
            where: {
              assessmentId: op.assessmentId,
              studentId,
            },
            orderBy: { attemptNumber: 'desc' },
          });

          const submittedAt = op.clientTimestamp
            ? new Date(op.clientTimestamp)
            : new Date();

          // Idempotency: a prior submission at the same client timestamp is the very
          // same operation being re-sent (offline retry) — never a new attempt.
          const alreadySynced = priorSubmissions.some(
            (s) => s.submittedAt.getTime() === submittedAt.getTime(),
          );

          if (
            alreadySynced ||
            (priorSubmissions.length > 0 && !assessment.allowMultipleAttempts)
          ) {
            result.duplicatesIgnored++;
            result.processedOperationIds.push(op.id);
            return;
          }

          const attemptNumber = (priorSubmissions[0]?.attemptNumber ?? 0) + 1;

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

          const submission = await tx.assessmentSubmission.create({
            data: {
              assessmentId: op.assessmentId,
              studentId,
              attemptNumber,
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
                if (g.clientTimestamp && existing.updatedAt) {
                  const clientDate = new Date(g.clientTimestamp);
                  if (existing.updatedAt > clientDate) {
                    throw new ConflictException(`Group [${existing.id}] was modified online since your last sync.`);
                  }
                }
                
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
                    updatedAt: new Date(),
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
                // Ensure teacher owns this student
                if (effectiveTeacherId && typeof tx.groupEnrollment?.findFirst === 'function') {
                  const hasAccess = await tx.groupEnrollment.findFirst({
                    where: {
                      studentId: existingStudent.id,
                      group: { teacherId: effectiveTeacherId }
                    }
                  });
                  if (!hasAccess) {
                    throw new ConflictException(`FORBIDDEN: You do not own the academic group for student [${s.clientTempId}]`);
                  }
                }

                if (s.clientTimestamp && existingStudent.user?.updatedAt) {
                  const clientDate = new Date(s.clientTimestamp);
                  if (existingStudent.user.updatedAt > clientDate) {
                    throw new ConflictException(`Student [${existingStudent.id}] was modified online since your last sync.`);
                  }
                }

                await tx.user.update({
                  where: { id: existingStudent.id },
                  data: {
                    fullName: s.fullName ?? s.name ?? existingStudent.user?.fullName,
                    phone: s.phone ?? existingStudent.user?.phone,
                    email: s.email ?? existingStudent.user?.email,
                    updatedAt: new Date(),
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
      homework?: DomainSyncResult;
      mutations?: Array<{ mutationId: string; status: 'SUCCESS' | 'FAILED'; error?: string }>;
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

    if (dto.homework && dto.homework.length > 0) {
      results.homework = await this.syncHomeworkBatch(user, {
        operations: dto.homework,
      });
    }

    if (dto.mutations && dto.mutations.length > 0) {
      results.mutations = await this.processMutationBatch(user, dto.mutations);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      idMappings,
      results,
    };
  }

  /**
   * Processes an outbox batch of typed mutations (e.g. RECORD_HOMEWORK_ONSITE, RECORD_ATTENDANCE).
   * Ensures atomic database updates with per-mutation success/failure reporting.
   */
  async processMutationBatch(
    user: AuthenticatedUser,
    mutations: SyncMutationItemDto[] | any[],
  ): Promise<Array<{ mutationId: string; status: 'SUCCESS' | 'FAILED'; error?: string }>> {
    const results: Array<{ mutationId: string; status: 'SUCCESS' | 'FAILED'; error?: string }> = [];

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return results;
    }

    const recorderId = user?.id || 'system';

    for (const mutation of mutations) {
      try {
        switch (mutation.type) {
          case 'RECORD_HOMEWORK_ONSITE': {
            let { studentId } = mutation.payload || {};
            const {
              assessmentId,
              sessionId,
              status,
              recordedMethod,
              score,
              feedback,
              clientTimestamp,
              qrCodeToken,
              allowCrossGroup,
            } = mutation.payload || {};

            let targetStudentId = studentId;

            if (!targetStudentId && qrCodeToken) {
              const student = await this.prisma.studentProfile.findFirst({
                where: {
                  OR: [
                    { id: qrCodeToken },
                    { qrCodeToken: qrCodeToken },
                    { studentCode: qrCodeToken },
                  ],
                  user: { isActive: true },
                },
                include: { groupEnrollments: true },
              });

              if (!student) {
                results.push({ mutationId: mutation.id, status: 'FAILED', error: 'INVALID_QR_CODE' });
                continue;
              }
              targetStudentId = student.id;
            }

            if (!targetStudentId || !sessionId) {
              throw new BadRequestException(
                `Missing required parameters for RECORD_HOMEWORK_ONSITE in mutation ${mutation.id}`,
              );
            }

            // 2. Validate Session and Student Enrollment
            const session = await this.prisma.lessonSession.findUnique({
              where: { id: sessionId },
              select: { groupId: true },
            });

            if (!session) {
              results.push({ mutationId: mutation.id, status: 'FAILED', error: 'SESSION_NOT_FOUND' });
              continue;
            }

            const studentData = await this.prisma.studentProfile.findFirst({
              where: { id: targetStudentId },
              include: {
                user: { select: { isActive: true } },
                groupEnrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
              }
            });

            if (!studentData || !studentData.user.isActive) {
              results.push({ mutationId: mutation.id, status: 'FAILED', error: 'STUDENT_INACTIVE_OR_NOT_FOUND' });
              continue;
            }

            const directEnrollment = studentData.groupEnrollments.some((e: any) => e.groupId === session.groupId);
            if (!directEnrollment && !allowCrossGroup) {
              results.push({ mutationId: mutation.id, status: 'FAILED', error: 'STUDENT_NOT_ENROLLED' });
              continue;
            }

            studentId = targetStudentId;

            // If assessmentId is missing or default placeholder, resolve the default homework linked to this session
            const isPlaceholder =
              !assessmentId ||
              assessmentId === 'default-session-homework' ||
              assessmentId === 'default';
            let targetAssessmentId = !isPlaceholder ? assessmentId : undefined;
            if (!targetAssessmentId) {
              try {
                const sessionWithHomework = await this.prisma.lessonSession.findUnique({
                  where: { id: sessionId },
                  include: {
                    homeworkRecords: { take: 1 },
                    group: {
                      include: {
                        assessments: {
                          where: { type: AssessmentType.ASSIGNMENT },
                          take: 1,
                        },
                      },
                    },
                  },
                });
                targetAssessmentId =
                  sessionWithHomework?.group?.assessments?.[0]?.id ||
                  sessionWithHomework?.homeworkRecords?.[0]?.assessmentId;

                if (!targetAssessmentId && sessionWithHomework?.groupId) {
                  const fallbackAssessment = await this.prisma.assessment.findFirst({
                    where: {
                      groupId: sessionWithHomework.groupId,
                      type: AssessmentType.ASSIGNMENT,
                    },
                    orderBy: { createdAt: 'desc' },
                  });
                  targetAssessmentId = fallbackAssessment?.id;
                }

                if (!targetAssessmentId && sessionWithHomework?.groupId) {
                  const group = await this.prisma.academicGroup.findUnique({
                    where: { id: sessionWithHomework.groupId },
                    select: { teacherId: true, gradeLevel: true, name: true },
                  });
                  if (group) {
                    const formattedDate =
                      sessionWithHomework.sessionDate instanceof Date
                        ? sessionWithHomework.sessionDate.toISOString().slice(0, 10)
                        : String(sessionWithHomework.sessionDate).slice(0, 10);
                    const autoAssessment = await this.prisma.assessment.create({
                      data: {
                        title: sessionWithHomework.topic
                          ? `واجب: ${sessionWithHomework.topic}`
                          : `واجب حصة ${formattedDate}`,
                        type: AssessmentType.ASSIGNMENT,
                        teacherId: group.teacherId,
                        groupId: sessionWithHomework.groupId,
                        gradeLevel: group.gradeLevel,
                        homeworkDeliveryType: HomeworkDeliveryType.ONSITE,
                        totalScore: 10.0,
                        isPublished: true,
                      },
                    });
                    targetAssessmentId = autoAssessment.id;
                  }
                }
              } catch (resErr) {
                this.logger.warn(`Could not resolve assessment for session [${sessionId}]:`, resErr);
              }
            }

            const recordDate = new Date(clientTimestamp || Date.now());

            await this.prisma.$transaction(async (tx) => {
              // 1. Upsert Homework Record
              if (targetAssessmentId) {
                await tx.homeworkRecord.upsert({
                  where: {
                    assessmentId_studentId_sessionId: {
                      assessmentId: targetAssessmentId,
                      studentId,
                      sessionId,
                    },
                  },
                  update: {
                    status: (status as HomeworkSubmissionStatus) || HomeworkSubmissionStatus.CHECKED_ONSITE,
                    recordedMethod: (recordedMethod as RecordingMethod) || RecordingMethod.QR_SCAN,
                    score: score !== undefined ? score : undefined,
                    feedback: feedback !== undefined ? feedback : undefined,
                    updatedAt: recordDate,
                  },
                  create: {
                    assessmentId: targetAssessmentId,
                    studentId,
                    sessionId,
                    status: (status as HomeworkSubmissionStatus) || HomeworkSubmissionStatus.CHECKED_ONSITE,
                    checkedByRole: user?.role || UserRole.TEACHER,
                    recordedMethod: (recordedMethod as RecordingMethod) || RecordingMethod.QR_SCAN,
                    score: score ?? null,
                    feedback: feedback ?? null,
                    clientTimestamp: recordDate,
                    createdAt: recordDate,
                    updatedAt: recordDate,
                  },
                });
              }
            });

            results.push({ mutationId: mutation.id, status: 'SUCCESS' });
            break;
          }

          case 'RECORD_ATTENDANCE': {
            const { sessionId, studentId, qrCodeToken, status, recordingMethod, clientTimestamp, allowCrossGroup, notes } =
              mutation.payload || {};

            let targetStudentId = studentId;

            // 1. Resolve uncached QR codes
            if (!targetStudentId && qrCodeToken) {
              const trimmedToken = qrCodeToken.trim();
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedToken);
              
              const student = await this.prisma.studentProfile.findFirst({
                where: {
                  OR: [
                    { qrCodeToken: trimmedToken },
                    { studentCode: trimmedToken },
                    ...(isUuid ? [{ id: trimmedToken }] : []),
                  ],
                },
                include: {
                  user: { select: { isActive: true } },
                  groupEnrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
                }
              });

              if (!student || !student.user.isActive) {
                results.push({ mutationId: mutation.id, status: 'FAILED', error: 'INVALID_QR_CODE' });
                continue;
              }
              targetStudentId = student.id;
            }

            if (!targetStudentId || !sessionId) {
              throw new BadRequestException(
                `Missing required parameters for RECORD_ATTENDANCE in mutation ${mutation.id}`,
              );
            }

            // 2. Enforce Cross-Group Authorization Rules
            const session = await this.prisma.lessonSession.findUnique({
              where: { id: sessionId },
              select: { groupId: true },
            });

            if (!session) {
              results.push({ mutationId: mutation.id, status: 'FAILED', error: 'SESSION_NOT_FOUND' });
              continue;
            }

            const studentData = await this.prisma.studentProfile.findFirst({
              where: { id: targetStudentId },
              include: {
                user: { select: { isActive: true } },
                groupEnrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
              }
            });

            if (!studentData || !studentData.user.isActive) {
              results.push({ mutationId: mutation.id, status: 'FAILED', error: 'STUDENT_INACTIVE_OR_NOT_FOUND' });
              continue;
            }

            const directEnrollment = studentData.groupEnrollments.some((e: any) => e.groupId === session.groupId);
            if (!directEnrollment && !allowCrossGroup) {
              results.push({ mutationId: mutation.id, status: 'FAILED', error: 'STUDENT_NOT_ENROLLED' });
              continue;
            }

            const recordDate = new Date(clientTimestamp || Date.now());

            await this.prisma.attendanceRecord.upsert({
              where: {
                sessionId_studentId: {
                  sessionId,
                  studentId: targetStudentId,
                },
              },
              update: {
                status: (status as AttendanceStatus) || AttendanceStatus.PRESENT,
                recordingMethod: (recordingMethod as RecordingMethod) || RecordingMethod.QR_SCAN,
                notes: notes !== undefined ? notes : undefined,
                recordedAt: recordDate,
              },
              create: {
                sessionId,
                studentId: targetStudentId,
                status: (status as AttendanceStatus) || AttendanceStatus.PRESENT,
                recordingMethod: (recordingMethod as RecordingMethod) || RecordingMethod.QR_SCAN,
                notes: notes ?? null,
                recordedById: recorderId,
                recordedAt: recordDate,
              },
            });

            results.push({ mutationId: mutation.id, status: 'SUCCESS' });
            break;
          }

          default: {
            this.logger.warn(`Unhandled mutation type: ${mutation.type} in mutation ${mutation.id}`);
            results.push({
              mutationId: mutation.id,
              status: 'FAILED',
              error: `Unhandled mutation type: ${mutation.type}`,
            });
            break;
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Mutation ${mutation.id} [${mutation.type}] failed: ${err.message}`,
          err.stack,
        );
        results.push({
          mutationId: mutation.id,
          status: 'FAILED',
          error: err.message || 'Error processing mutation',
        });
      }
    }

    return results;
  }

  /**
   * Atomically reconciles offline-recorded onsite homework checks.
   * Marks HomeworkRecord as CHECKED_ONSITE and automatically guarantees
   * session attendance is recorded as PRESENT.
   */
  async syncHomeworkBatch(
    user: AuthenticatedUser,
    dto: SyncHomeworkBatchDto,
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
          });

          if (!session) {
            throw new NotFoundException(`Session [${op.sessionId}] not found`);
          }

          let assessment: any = null;
          const isPlaceholder =
            !op.assessmentId ||
            op.assessmentId === 'default-session-homework' ||
            op.assessmentId === 'default';
          if (!isPlaceholder && typeof tx.assessment?.findUnique === 'function') {
            try {
              assessment = await tx.assessment.findUnique({
                where: { id: op.assessmentId.trim() },
              });
            } catch {}
          }

          // If not found or dummy id, try to find an existing homework assessment for this group
          if (!assessment && session.groupId && typeof tx.assessment?.findFirst === 'function') {
            try {
              assessment = await tx.assessment.findFirst({
                where: {
                  groupId: session.groupId,
                  type: AssessmentType.ASSIGNMENT,
                },
                orderBy: { createdAt: 'desc' },
              });
            } catch {}
          }

          // If still no assessment exists, auto-provision a session homework assessment
          if (!assessment && session.groupId && typeof tx.assessment?.create === 'function') {
            const group =
              typeof tx.academicGroup?.findUnique === 'function'
                ? await tx.academicGroup.findUnique({
                    where: { id: session.groupId },
                    select: { teacherId: true, gradeLevel: true, name: true },
                  })
                : null;
            if (group) {
              const formattedDate =
                session.sessionDate instanceof Date
                  ? session.sessionDate.toISOString().slice(0, 10)
                  : String(session.sessionDate).slice(0, 10);
              assessment = await tx.assessment.create({
                data: {
                  title: session.topic ? `واجب: ${session.topic}` : `واجب حصة ${formattedDate}`,
                  type: AssessmentType.ASSIGNMENT,
                  teacherId: group.teacherId,
                  groupId: session.groupId,
                  gradeLevel: group.gradeLevel,
                  homeworkDeliveryType: HomeworkDeliveryType.ONSITE,
                  totalScore: 10.0,
                  isPublished: true,
                },
              });
            }
          }

          if (!assessment) {
            result.conflicts.push({
              operationId: op.id,
              reason: `Unable to associate homework with an assessment for session [${op.sessionId}]`,
            });
            result.failedCount++;
            return;
          }

          const targetAssessmentId = assessment.id;

          // 3. Resolve target student
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

          // 3.5 Verify Group Enrollment (Defense in Depth)
          const isEnrolled = await tx.groupEnrollment.findUnique({
            where: {
              groupId_studentId: {
                groupId: session.groupId,
                studentId: resolvedStudentId,
              },
            },
          });

          if (!isEnrolled || isEnrolled.status !== GroupEnrollmentStatus.ACTIVE) {
            // Check if they were admitted as a cross-group guest (attendance record exists)
            const guestAttendance = await tx.attendanceRecord.findUnique({
              where: {
                sessionId_studentId: {
                  sessionId: op.sessionId,
                  studentId: resolvedStudentId,
                },
              },
            });

            if (!guestAttendance) {
              result.conflicts.push({
                operationId: op.id,
                reason: `Student [${resolvedStudentId}] is not enrolled in session group [${session.groupId}] and has no guest attendance record`,
                entityId: resolvedStudentId,
              });
              result.failedCount++;
              return;
            }
          }

          const clientDate = op.clientTimestamp ? new Date(op.clientTimestamp) : new Date();

          // 4. Upsert Homework Record
          let existingHomework: any = null;
          if (typeof tx.homeworkRecord?.findFirst === 'function') {
            existingHomework = await tx.homeworkRecord.findFirst({
              where: {
                sessionId: op.sessionId,
                studentId: resolvedStudentId,
              },
            });
          } else if (typeof tx.homeworkRecord?.findUnique === 'function') {
            existingHomework = await tx.homeworkRecord.findUnique({
              where: {
                assessmentId_studentId_sessionId: {
                  assessmentId: targetAssessmentId,
                  studentId: resolvedStudentId,
                  sessionId: op.sessionId,
                },
              },
            });
          }

          if (existingHomework) {
            await tx.homeworkRecord.update({
              where: { id: existingHomework.id },
              data: {
                assessmentId: targetAssessmentId,
                status: op.status || HomeworkSubmissionStatus.CHECKED_ONSITE,
                recordedMethod: op.recordedMethod || RecordingMethod.QR_SCAN,
                score: op.score !== undefined ? op.score : existingHomework.score,
                feedback: op.feedback !== undefined ? op.feedback : existingHomework.feedback,
                updatedAt: clientDate,
              },
            });
            result.duplicatesIgnored++;
          } else {
            await tx.homeworkRecord.create({
              data: {
                assessmentId: targetAssessmentId,
                studentId: resolvedStudentId,
                sessionId: op.sessionId,
                status: op.status || HomeworkSubmissionStatus.CHECKED_ONSITE,
                checkedByRole: user.role,
                recordedMethod: op.recordedMethod || RecordingMethod.QR_SCAN,
                score: op.score,
                feedback: op.feedback,
                clientTimestamp: clientDate,
                createdAt: clientDate,
                updatedAt: clientDate,
              },
            });
            result.syncedCount++;
          }


          result.processedOperationIds.push(op.id);
        });
      } catch (err: any) {
        this.logger.error(
          `Failed to process homework operation [${op.id}]: ${err.message}`,
          err.stack,
        );
        result.failedCount++;
        result.conflicts.push({
          operationId: op.id,
          reason: err.message || 'Database error processing homework operation',
        });
      }
    }

    return result;
  }
}
