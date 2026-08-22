import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CoursesService } from '../../courses/services/courses.service';
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
  conflicts: Array<{ operationId: string; reason: string; entityId?: string }>;
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
          ? { teacherId: effectiveTeacherId }
          : {}),
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
    let students: any[] = [];
    try {
      if (groupIds.length > 0) {
        const enrollments = await this.prisma.groupEnrollment.findMany({
          where: {
            groupId: { in: groupIds },
            status: GroupEnrollmentStatus.ACTIVE,
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
        for (const enrollment of enrollments) {
          if (enrollment.student && !studentMap.has(enrollment.student.id)) {
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
              academicStatus: s.academicStatus,
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
        assessments: assessments || [],
        courses: courses || [],
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
    };

    if (!dto.operations || dto.operations.length === 0) {
      return result;
    }

    const recorderId = user.id;

    for (const op of dto.operations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Verify student existence
          const student = await tx.studentProfile.findUnique({
            where: { id: op.studentId },
          });

          if (!student) {
            result.conflicts.push({
              operationId: op.id,
              reason: `Student [${op.studentId}] not found in database`,
              entityId: op.studentId,
            });
            result.failedCount++;
            return;
          }

          // Check if payment already exists for student + group + billing period
          const existingPayment = await tx.studentPaymentRecord.findFirst({
            where: {
              studentId: op.studentId,
              groupId: op.groupId || null,
              periodYear: op.periodYear,
              periodMonth: op.periodMonth,
            },
          });

          if (existingPayment && existingPayment.paymentStatus === PaymentStatus.PAID) {
            result.duplicatesIgnored++;
            result.processedOperationIds.push(op.id);
            return;
          }

          const paymentDate = op.clientTimestamp
            ? new Date(op.clientTimestamp)
            : new Date();

          if (existingPayment) {
            // Update existing pending/partial record
            await tx.studentPaymentRecord.update({
              where: { id: existingPayment.id },
              data: {
                amountPaid: op.amountPaid,
                amountExpected: op.amountExpected ?? existingPayment.amountExpected,
                paymentStatus: op.paymentStatus || PaymentStatus.PAID,
                paymentMethod: op.paymentMethod || 'CASH',
                receiptNumber: op.receiptNumber || existingPayment.receiptNumber,
                notes: op.notes || existingPayment.notes,
                recordedById: recorderId,
                updatedAt: paymentDate,
              },
            });
          } else {
            // Create new record
            await tx.studentPaymentRecord.create({
              data: {
                studentId: op.studentId,
                groupId: op.groupId || null,
                periodYear: op.periodYear,
                periodMonth: op.periodMonth,
                amountPaid: op.amountPaid,
                amountExpected: op.amountExpected ?? op.amountPaid,
                paymentStatus: op.paymentStatus || PaymentStatus.PAID,
                paymentMethod: op.paymentMethod || 'CASH',
                currency: op.currency || 'EGP',
                receiptNumber: op.receiptNumber,
                notes: op.notes || 'Synced from offline outbox',
                recordedById: recorderId,
                createdAt: paymentDate,
              },
            });
          }

          result.syncedCount++;
          result.processedOperationIds.push(op.id);
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          // Prisma unique constraint violation (e.g. uq_student_group_billing_period) -> Treat gracefully as duplicate ignored
          result.duplicatesIgnored++;
          result.processedOperationIds.push(op.id);
        } else {
          this.logger.error(`Failed to sync payment op [${op.id}]:`, err);
          result.failedCount++;
          result.conflicts.push({
            operationId: op.id,
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
      results,
    };
  }
}
