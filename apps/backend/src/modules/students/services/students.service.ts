import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { StudentQueryDto } from '../dto/student-query.dto';
import { StudentQrCodeResponseDto } from '../dto/qr-code-response.dto';
import { UserRole, GroupEnrollmentStatus, PaymentStatus, PaymentType, StudentAcademicStatus, NotificationChannel, NotificationType, NotificationStatus } from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';
import { StudentGroupQueryDto } from '../dto/student-group-query.dto';
import { StorageService } from '../../../integrations/storage/storage.service';
import { computeEffectiveDueDate, SessionForDeadline } from '../../assessments/utils/effective-due-date.util';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { ResetStudentPasswordDto } from '../dto/reset-student-password.dto';
import { generateSecurePassword } from '../../../common/utils/password.util';
import { WhatsAppService } from '../../../services/whatsapp/whatsapp.service';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
    @Optional() private readonly storageService?: StorageService,
    @Optional() private readonly whatsAppService?: WhatsAppService,
  ) {}

  /**
   * Atomic Registration Workflow for Student + Parent + Initial Group Enrollment.
   * Executed inside a Prisma $transaction. This is the administration/secretariat
   * path; students can also self-register via the auth student-registration flow.
   */
  async createStudent(dto: CreateStudentDto) {
    return this.prisma.$transaction(async (tx) => {
      // 0. Check if student already exists (Idempotent for offline sync retries)
      if (dto.id) {
        const existingStudent = await tx.studentProfile.findUnique({
          where: { id: dto.id },
          include: { user: true, parentLinks: true, groupEnrollments: true },
        });
        if (existingStudent) {
          return {
            id: existingStudent.id,
            studentCode: existingStudent.studentCode,
            fullName: existingStudent.user.fullName,
            phone: existingStudent.user.phone,
            email: existingStudent.user.email,
            gradeLevel: existingStudent.gradeLevel,
            academicStage: existingStudent.academicStage,
            academicStatus: existingStudent.academicStatus,
            qrCodeToken: existingStudent.qrCodeToken,
            createdAt: existingStudent.createdAt,
            hasParentLinked: existingStudent.parentLinks.length > 0,
            enrolledGroupId: existingStudent.groupEnrollments[0]?.groupId || null,
          };
        }
      }

      // 1. Check for phone or email collisions on user
      if (dto.phone) {
        const existingPhone = await tx.user.findUnique({ where: { phone: dto.phone } });
        if (existingPhone) {
          throw new ConflictException(`Phone number [${dto.phone}] is already registered`);
        }
      }

      if (dto.email) {
        const existingEmail = await tx.user.findUnique({ where: { email: dto.email } });
        if (existingEmail) {
          throw new ConflictException(`Email [${dto.email}] is already registered`);
        }
      }

      // 2. Hash student password
      const passwordHash = await bcrypt.hash(dto.password, 10);

      // 3. Create Student User Record
      const user = await tx.user.create({
        data: {
          id: dto.id || undefined,
          fullName: dto.fullName,
          phone: dto.phone,
          email: dto.email,
          passwordHash,
          role: UserRole.STUDENT,
          isActive: true,
        },
      });

      // 4. Generate unique studentCode and cryptographic QR token
      const studentCode = await generateUniqueStudentCode(tx);
      const qrCodeToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

      // 5. Create StudentProfile
      const studentProfile = await tx.studentProfile.create({
        data: {
          id: user.id,
          studentCode,
          qrCodeToken,
          gradeLevel: dto.gradeLevel,
          academicStage: dto.academicStage,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          emergencyPhone: dto.emergencyPhone,
          tempAccessPin: dto.password,
          pinExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 6. Parent Profile & Linkage (if provided)
      let parentLink = null;
      if (dto.parentPhone) {
        let parentUser = await tx.user.findUnique({
          where: { phone: dto.parentPhone },
          include: { parentProfile: true },
        });

        if (!parentUser) {
          const parentPasswordHash = await bcrypt.hash('Parent123!', 10);
          parentUser = await tx.user.create({
            data: {
              fullName: dto.parentName || `ولي أمر ${dto.fullName}`,
              phone: dto.parentPhone,
              passwordHash: parentPasswordHash,
              role: UserRole.PARENT,
              isActive: true,
              parentProfile: {
                create: {
                  relationshipType: dto.parentRelationship || 'Guardian',
                },
              },
            },
            include: { parentProfile: true },
          });
        } else if (!parentUser.parentProfile) {
          await tx.parentProfile.create({
            data: {
              id: parentUser.id,
              relationshipType: dto.parentRelationship || 'Guardian',
            },
          });
        }

        parentLink = await tx.parentStudentLink.create({
          data: {
            parentId: parentUser.id,
            studentId: studentProfile.id,
          },
        });
      }

      // 7. Initial Group Enrollment (if specified)
      let initialEnrollment = null;
      if (dto.initialGroupId) {
        const group = await tx.academicGroup.findUnique({
          where: { id: dto.initialGroupId },
          include: { _count: { select: { enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } } } } },
        });

        if (!group) {
          throw new NotFoundException(`Target group [${dto.initialGroupId}] not found`);
        }

        if (group._count.enrollments >= group.maxCapacity) {
          throw new BadRequestException(`Group [${group.name}] has reached its max capacity (${group.maxCapacity})`);
        }

        initialEnrollment = await tx.groupEnrollment.create({
          data: {
            groupId: dto.initialGroupId,
            studentId: studentProfile.id,
            status: GroupEnrollmentStatus.ACTIVE,
          },
        });
      }

      this.logger.log(`Student created successfully: [${studentCode}] ${dto.fullName}`);

      return {
        id: studentProfile.id,
        studentCode: studentProfile.studentCode,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        gradeLevel: studentProfile.gradeLevel,
        academicStage: studentProfile.academicStage,
        academicStatus: studentProfile.academicStatus,
        qrCodeToken: studentProfile.qrCodeToken,
        createdAt: studentProfile.createdAt,
        hasParentLinked: !!parentLink,
        enrolledGroupId: initialEnrollment?.groupId || null,
      };
    });
  }

  private async assertStudentAccess(
    studentId: string,
    user: AuthenticatedUser,
    allowStudent = true,
    allowParent = true,
  ) {
    if (user.role === UserRole.SECRETARIAT) {
      return;
    }

    if (user.role === UserRole.STUDENT) {
      if (!allowStudent) {
        throw new ForbiddenException('Operation not permitted for student role');
      }
      const myStudentId = user.studentProfileId || user.id;
      if (myStudentId !== studentId) {
        throw new ForbiddenException('Students can only access their own student profile');
      }
      return;
    }

    if (user.role === UserRole.PARENT) {
      if (!allowParent) {
        throw new ForbiddenException('Operation not permitted for parent role');
      }
      const parentId = user.parentProfileId || user.id;
      const link = await this.prisma.parentStudentLink.findUnique({
        where: {
          parentId_studentId: {
            parentId,
            studentId,
          },
        },
      });
      if (!link) {
        throw new ForbiddenException('Guardians can only access linked children records');
      }
      return;
    }

    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      const enrolledInTeacherGroup = await this.prisma.groupEnrollment.findFirst({
        where: {
          studentId,
          status: GroupEnrollmentStatus.ACTIVE,
          group: {
            OR: [
              { teacherId },
              { teacher: { id: teacherId } },
            ],
          },
        },
      });

      if (!enrolledInTeacherGroup) {
        throw new ForbiddenException('Student is not enrolled in any of your academic groups');
      }
      return;
    }

    throw new ForbiddenException('Unauthorized access');
  }

  /**
   * Retrieves single student by ID with user, parent links, and group enrollments.
   * Omit raw qrCodeToken from general profile responses to prevent credential exposure.
   */
  async getStudentById(studentId: string, user: AuthenticatedUser) {
    await this.assertStudentAccess(studentId, user, true, true);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        gradeLevel: true,
        academicStage: true,
        academicStatus: true,
        dateOfBirth: true,
        emergencyPhone: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } },
        parentLinks: {
          include: {
            parent: {
              include: { user: { select: { id: true, fullName: true, phone: true, isActive: true } } },
            },
          },
        },
        groupEnrollments: {
          where: { status: { in: [GroupEnrollmentStatus.ACTIVE, 'PENDING'] } },
          include: {
            group: { select: { id: true, name: true, gradeLevel: true } },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student [${studentId}] not found`);
    }

    return student;
  }

  /**
   * Generates QR display payload for digital badge rendering.
   */
  async getStudentQrCode(studentId: string, user: AuthenticatedUser): Promise<StudentQrCodeResponseDto> {
    await this.assertStudentAccess(studentId, user, true, true);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { fullName: true } } },
    });

    if (!student) {
      throw new NotFoundException(`Student [${studentId}] not found`);
    }

    return {
      studentId: student.id,
      studentCode: student.studentCode || 'N/A',
      fullName: student.user.fullName,
      gradeLevel: student.gradeLevel,
      qrCodeToken: student.qrCodeToken,
    };
  }

  private resolveStudentId(user: AuthenticatedUser): string {
    return user.studentProfileId || user.id;
  }

  private resolveCalendarPeriod(query?: StudentGroupQueryDto) {
    const now = new Date();
    return {
      month: query?.month || now.getUTCMonth() + 1,
      year: query?.year || now.getUTCFullYear(),
    };
  }

  private async getActiveStudentGroup(user: AuthenticatedUser) {
    const studentId = this.resolveStudentId(user);
    const enrollment = await this.prisma.groupEnrollment.findFirst({
      where: { studentId, status: GroupEnrollmentStatus.ACTIVE, group: { isActive: true } },
      orderBy: { enrolledAt: 'asc' },
      include: {
        group: {
          include: {
            schedules: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
            teacher: {
              include: { user: { select: { id: true, fullName: true } } },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('The student is not enrolled in an active academic group');
    }

    return enrollment;
  }

  /**
   * Returns the student's primary active physical group and the selected month's
   * tuition state. The group is resolved from the authenticated identity only.
   */
  async getMyGroup(user: AuthenticatedUser, query?: StudentGroupQueryDto) {
    const enrollment = await this.getActiveStudentGroup(user);
    const { month, year } = this.resolveCalendarPeriod(query);
    const group = enrollment.group;
    const payment = await this.prisma.studentPaymentRecord.findFirst({
      where: {
        studentId: enrollment.studentId,
        groupId: group.id,
        periodMonth: month,
        periodYear: year,
        paymentType: PaymentType.TUITION,
      },
      orderBy: { createdAt: 'desc' },
    });

    const amountExpected = Number(payment?.amountExpected ?? group.monthlyFee);
    const amountPaid = Number(payment?.amountPaid ?? 0);
    const isPaid = payment?.paymentStatus === PaymentStatus.PAID && amountPaid >= amountExpected;

    return {
      group: {
        id: group.id,
        name: group.name,
        gradeLevel: group.gradeLevel,
        academicYear: group.academicYear,
        academicTerm: group.academicTerm,
        description: group.description,
        monthlyFee: Number(group.monthlyFee),
        schedules: group.schedules,
      },
      teacher: {
        id: group.teacher.id,
        fullName: group.teacher.user.fullName,
        specialty: group.teacher.specialty,
        bio: group.teacher.bio,
      },
      subscription: {
        year,
        month,
        amountExpected,
        amountPaid,
        paymentStatus: payment?.paymentStatus || PaymentStatus.PENDING,
        isPaid,
      },
    };
  }

  /**
   * Returns only sessions belonging to the student's active group. Attendance
   * and submissions are filtered to this student before leaving the service.
   */
  async getMyGroupSessions(user: AuthenticatedUser, query?: StudentGroupQueryDto) {
    const enrollment = await this.getActiveStudentGroup(user);
    const studentId = enrollment.studentId;
    const { month, year } = this.resolveCalendarPeriod(query);
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));
    const groupId = enrollment.groupId;

    const [sessions, assessments] = await Promise.all([
      this.prisma.lessonSession.findMany({
        where: { groupId, sessionDate: { gte: startDate, lte: endDate } },
        orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
        include: {
          schedule: { select: { id: true, location: true } },
          attendanceRecords: {
            where: { studentId },
            select: {
              status: true,
              recordingMethod: true,
              recordedAt: true,
              notes: true,
            },
            take: 1,
          },
          educationalContents: {
            select: {
              id: true,
              title: true,
              description: true,
              contentType: true,
              fileUrl: true,
              fileKey: true,
              fileSize: true,
              mimeType: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.assessment.findMany({
        where: {
          isPublished: true,
          OR: [
            { groupId },
            { targetGroups: { some: { id: groupId } } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          totalScore: true,
          dueDate: true,
          createdAt: true,
          submissions: {
            where: { studentId },
            orderBy: { attemptNumber: 'desc' },
            select: {
              status: true,
              scoreObtained: true,
              attemptNumber: true,
              fileKey: true,
              attachmentUrl: true,
              studentNotes: true,
              submittedAt: true,
              teacherFeedback: true,
            },
          },
        },
      }),
    ]);

    const getDateKey = (value: Date | string | null | undefined) =>
      value ? new Date(value).toISOString().slice(0, 10) : null;

    const deadlineSessions: SessionForDeadline[] = sessions.map((s) => ({
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      isCancelled: s.isCancelled,
    }));

    return Promise.all(sessions.map(async (session) => {
      const sessionDateKey = getDateKey(session.sessionDate);
      let assessment = assessments.find((item) => {
        if (session.topic && item.title && item.title.includes(session.topic)) return true;
        if (sessionDateKey && item.title && item.title.includes(sessionDateKey)) return true;
        if (getDateKey(item.createdAt) === sessionDateKey) return true;
        if (getDateKey(item.dueDate) === sessionDateKey) return true;
        return false;
      });
      const submission = assessment?.submissions[0];
      // Session homework carries the next session start time as effective deadline.
      const effectiveDueDate = assessment
        ? computeEffectiveDueDate(assessment.type, assessment.dueDate as Date | null, deadlineSessions)
        : null;
      assessment = assessment ? { ...assessment, dueDate: effectiveDueDate } : assessment;
      const educationalContents = await Promise.all(session.educationalContents.map(async (content) => ({
        ...content,
        fileSize: content.fileSize === null ? null : Number(content.fileSize),
        downloadUrl:
          this.storageService && !content.fileUrl.startsWith('/uploads/')
            ? await this.storageService.generatePresignedDownloadUrl(content.fileKey)
            : content.fileUrl,
      })));

      return {
        id: session.id,
        groupId: session.groupId,
        scheduleId: session.scheduleId,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        topic: session.topic,
        isCancelled: session.isCancelled,
        cancellationReason: session.cancellationReason,
        location: session.schedule?.location || null,
        attendance: session.attendanceRecords[0] || null,
        assessment: assessment
          ? {
              id: assessment.id,
              title: assessment.title,
              description: assessment.description,
              type: (assessment as any).type,
              totalScore: Number(assessment.totalScore),
              dueDate: effectiveDueDate,
              submission: submission
                ? {
                    status: submission.status,
                    scoreObtained:
                      submission.scoreObtained === null ? null : Number(submission.scoreObtained),
                  }
                : null,
            }
          : null,
        educationalContents,
      };
    }));
  }

  /**
   * Cryptographically revokes old QR token and issues a new opaque random token.
   */
  async regenerateQrToken(studentId: string, user: AuthenticatedUser): Promise<StudentQrCodeResponseDto> {
    await this.assertStudentAccess(studentId, user, false, false);

    const newQrToken = `qr_tok_${randomUUID().replace(/-/g, '')}`;

    const updatedStudent = await this.prisma.studentProfile.update({
      where: { id: studentId },
      data: { qrCodeToken: newQrToken },
      include: { user: { select: { fullName: true } } },
    });

    this.logger.log(`Rotated QR code token for student [${studentId}]`);

    return {
      studentId: updatedStudent.id,
      studentCode: updatedStudent.studentCode || 'N/A',
      fullName: updatedStudent.user.fullName,
      gradeLevel: updatedStudent.gradeLevel,
      qrCodeToken: updatedStudent.qrCodeToken,
    };
  }

  /**
   * Keyset/Offset paginated listing with filters.
   */
  async getStudents(query: StudentQueryDto, user?: AuthenticatedUser) {
    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor ? CursorPaginationHelper.decodeCursor(query.cursor) : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');

    const where: any = {
      ...(query.gradeLevel ? { gradeLevel: query.gradeLevel } : {}),
      ...(query.academicStage ? { academicStage: query.academicStage } : {}),
      academicStatus: query.academicStatus || 'ACTIVE',
      user: { isActive: true },
      ...(query.groupId
        ? {
            groupEnrollments: {
              some: {
                groupId: query.groupId,
                status: GroupEnrollmentStatus.ACTIVE,
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { user: { phone: { contains: query.search } } },
              { studentCode: { contains: query.search, mode: 'insensitive' } },
              { qrCodeToken: query.search },
            ],
          }
        : {}),
      ...(cursorFilter || {}),
    };

    const students = await this.prisma.studentProfile.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true } },
        groupEnrollments: {
          where: { status: GroupEnrollmentStatus.ACTIVE },
          include: { group: { select: { id: true, name: true } } },
        },
        parentLinks: {
          include: {
            parent: {
              include: { user: { select: { id: true, fullName: true, phone: true, isActive: true } } },
            },
          },
        },
      },
    });

    return CursorPaginationHelper.formatResponse(students, limit);
  }

  /**
   * Fetches available active groups for the student's current grade level.
   */
  async getAvailableGroups(user: AuthenticatedUser) {
    const studentId = this.resolveStudentId(user);
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { gradeLevel: true, academicStage: true }
    });
    
    if (!student) throw new NotFoundException('Student profile not found');
    
    return this.prisma.academicGroup.findMany({
      where: {
        gradeLevel: student.gradeLevel,
        isActive: true,
      },
      include: {
        teacher: {
          include: { user: { select: { fullName: true } } }
        },
        schedules: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        },
        _count: {
          select: {
            enrollments: { where: { status: { in: [GroupEnrollmentStatus.ACTIVE, 'PENDING' as GroupEnrollmentStatus] } } }
          }
        }
      }
    });
  }

  /**
   * Allows a student to reserve a spot (PENDING enrollment) in a group.
   * Dispatches an in-app + web push notification to the group's teacher.
   */
  async reserveGroup(groupId: string, user: AuthenticatedUser) {
    const studentId = this.resolveStudentId(user);
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            enrollments: { where: { status: { in: [GroupEnrollmentStatus.ACTIVE, 'PENDING' as GroupEnrollmentStatus] } } }
          }
        },
        teacher: { include: { user: { select: { id: true, fullName: true } } } },
      }
    });

    if (!group) throw new NotFoundException('Group not found');
    if (group._count.enrollments >= group.maxCapacity) {
      throw new BadRequestException('هذه المجموعة مكتملة العدد');
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { id: true, fullName: true } } },
    });

    const existingEnrollment = await this.prisma.groupEnrollment.findUnique({
      where: { groupId_studentId: { groupId, studentId } }
    });

    let enrollment;
    if (existingEnrollment) {
      if (existingEnrollment.status === 'PENDING' as GroupEnrollmentStatus) {
        throw new BadRequestException('لديك حجز قيد الانتظار بالفعل في هذه المجموعة');
      }
      if (existingEnrollment.status === GroupEnrollmentStatus.ACTIVE) {
        throw new BadRequestException('أنت منضم بالفعل لهذه المجموعة');
      }

      // If DROPPED or TRANSFERRED, we can reactivate it as PENDING
      enrollment = await this.prisma.groupEnrollment.update({
        where: { id: existingEnrollment.id },
        data: { status: 'PENDING' as GroupEnrollmentStatus }
      });
    } else {
      enrollment = await this.prisma.groupEnrollment.create({
        data: {
          groupId,
          studentId,
          status: 'PENDING' as GroupEnrollmentStatus,
        },
      });
    }

    // ── Notify the group's teacher about the new join request ─────────────
    const teacherUserId = group?.teacher?.user?.id;
    // Push a realtime "reservations changed" signal so the teacher's open
    // tabs refresh the pending list & sidebar counter without polling.
    this.realtimeGateway.notifyReservationsChanged([teacherUserId]);

    if (teacherUserId) {
      const studentName = student?.user?.fullName || 'طالب';
      const groupName = group?.name || 'المجموعة';

      try {
        await this.notificationsService.sendNotification({
          recipientId: teacherUserId,
          type: 'TEACHER_JOIN_REQUEST',
          notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
          title: '🔔 طلب انضمام جديد',
          body: `طلب الطالب ${studentName} الانضمام إلى مجموعة ${groupName} بانتظار تأكيدك.`,
          channels: [NotificationChannel.WEB_PUSH, NotificationChannel.IN_APP],
          data: {
            url: '/teacher/reservations',
            enrollmentId: enrollment.id,
            studentName,
            groupName,
            groupId: group.id,
          },
          referenceEntityId: enrollment.id,
        });
        this.logger.log(
          `Dispatched join-request notification to teacher [${teacherUserId}] for student [${studentId}]`,
        );
      } catch (notifErr) {
        this.logger.error('Failed to notify teacher of join request', notifErr);
      }
    }

    // ── Send WhatsApp to parent immediately on group-link enrollment ────────
    // This runs fire-and-forget so it never blocks the enrollment response.
    this.sendGroupLinkWhatsApp(studentId, groupId, student).catch((err) =>
      this.logger.error(`Group-link WhatsApp failed for student [${studentId}]`, err),
    );

    return enrollment;
  }

  /**
   * Sends WhatsApp to the parent (or student as fallback) after a group-link enrollment.
   * Uses pendingCredentials stored during self-registration.
   */
  private async sendGroupLinkWhatsApp(
    studentId: string,
    groupId: string,
    partialStudent?: { user?: { fullName: string } | null } | null,
  ): Promise<void> {
    try {
      const [student, group] = await Promise.all([
        this.prisma.studentProfile.findUnique({
          where: { id: studentId },
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
            parentLinks: {
              take: 1,
              include: { parent: { include: { user: { select: { id: true, fullName: true, phone: true } } } } },
            },
          },
        }),
        this.prisma.academicGroup.findUnique({
          where: { id: groupId },
          select: { name: true, teacher: { include: { user: { select: { fullName: true } } } } },
        }),
      ]);

      if (!student) return;

      const parentUser = student.parentLinks[0]?.parent?.user;
      const whatsappPhone = parentUser?.phone || student.emergencyPhone || student.user?.phone || null;

      if (!whatsappPhone) {
        this.logger.warn(`[reserveGroup] No phone for WhatsApp to student ${student.user?.fullName} [${studentId}] — skipped`);
        return;
      }

      const pendingCreds = student.pendingCredentials as {
        studentPassword?: string;
        parentPassword?: string;
        studentPhone?: string;
      } | null;

      const teacherName = (group as any)?.teacher?.user?.fullName;
      const centerName = teacherName ? `مجموعة الأستاذ ${teacherName}` : 'منصة الأوّل التعليمية';
      const studentName = student.user?.fullName || 'الطالب';
      const recipientId = parentUser?.id || student.user?.id;

      if (!recipientId) return;

      // Queue via DB Notification record so WhatsAppWorker retries automatically
      // on reconnect — critical when dyno wakes from Heroku Eco 30-min sleep.
      await this.prisma.notification.create({
        data: {
          recipientId,
          type: 'STUDENT_GROUP_LINK_ENROLLMENT',
          notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
          title: `📋 تم تسجيل طلب انضمام ${studentName} إلى ${group?.name || 'المجموعة'}`,
          message: `مرحباً، تم تسجيل طلب انضمام الطالب ${studentName} بنجاح وبانتظار الموافقة.`,
          whatsappStatus: NotificationStatus.PENDING,
          scheduledFor: new Date(),
          data: {
            studentId,
            studentName,
            studentPhoneOrCode: pendingCreds?.studentPhone || student.user?.phone || student.studentCode,
            studentPassword: pendingCreds?.studentPassword,
            parentPhone: whatsappPhone,
            parentPassword: pendingCreds?.parentPassword,
            parentName: parentUser?.fullName || studentName,
            groupName: group?.name,
            centerName,
            platformUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online',
            // CRITICAL: `phone` is what WhatsAppWorker reads to send the message
            phone: whatsappPhone,
          },
        },
      });

      this.logger.log(
        `📥 Group-link WhatsApp queued for student ${studentName} → ${whatsappPhone} (worker retries on reconnect)`,
      );
    } catch (err) {
      this.logger.error(`sendGroupLinkWhatsApp error for student [${studentId}]`, err);
    }
  }

  /**
   * Updates student academic status (e.g. ACTIVE, LEFT, DROPPED_OUT, SUSPENDED, GRADUATED, ARCHIVED)
   */
  async updateStudentStatus(id: string, status: StudentAcademicStatus, user: AuthenticatedUser) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) throw new NotFoundException('Student profile not found');

    const updated = await this.prisma.studentProfile.update({
      where: { id },
      data: { academicStatus: status },
      include: {
        user: true,
        parentLinks: { include: { parent: { include: { user: true } } } },
        groupEnrollments: { include: { group: true } },
      },
    });

    this.logger.log(`Student [${id}] ${student.user.fullName} status updated to: ${status}`);
    return updated;
  }

  /**
   * Removes / deletes a student completely from the system with all child records.
   */
  async deleteStudent(id: string, user: AuthenticatedUser) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id },
      include: { user: true, parentLinks: true },
    });

    if (!student) {
      throw new NotFoundException('حساب الطالب غير موجود في النظام أو تم حذفه مسبقاً');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Parent linkages
      await tx.parentStudentLink.deleteMany({ where: { studentId: id } });

      // 2. Academic Group enrollments
      await tx.groupEnrollment.deleteMany({ where: { studentId: id } });

      // 3. Attendance records
      await tx.attendanceRecord.deleteMany({ where: { studentId: id } });

      // 4. Online Courses, progress & questions
      await tx.lessonQuestion.deleteMany({ where: { studentId: id } });
      await tx.contentProgress.deleteMany({ where: { studentId: id } });
      await tx.courseProgress.deleteMany({ where: { studentId: id } });
      await tx.courseEnrollment.deleteMany({ where: { studentId: id } });

      // 5. Assessments, Homework & Evaluations
      await tx.assessmentSubmission.deleteMany({ where: { studentId: id } });
      await tx.homeworkRecord.deleteMany({ where: { studentId: id } });
      await tx.studentEvaluation.deleteMany({ where: { studentId: id } });

      // 6. Payments & Billing
      await tx.studentPaymentRecord.deleteMany({ where: { studentId: id } });

      // 7. Notifications & Push Subscriptions
      await tx.notification.deleteMany({ where: { recipientId: id } });
      await tx.pushSubscription.deleteMany({ where: { userId: id } });
      await tx.refreshTokenSession.deleteMany({ where: { userId: id } });

      // 8. Delete Student Profile
      await tx.studentProfile.deleteMany({ where: { id } });

      // 9. Delete User Record
      await tx.user.delete({ where: { id } });
    });

    this.logger.log(`Student [${id}] ${student.user.fullName} successfully deleted from system by [${user.id}]`);
    return { success: true, message: 'تم حذف الطالب من النظام بنجاح' };
  }

  /**
   * Reset student password or issue temporary access PIN.
   * Authorized strictly for teachers (of the student's groups) and secretariat.
   * Can automatically dispatch the new credentials via WhatsApp.
   */
  async resetStudentPassword(
    studentId: string,
    dto: ResetStudentPasswordDto,
    user: AuthenticatedUser,
  ) {
    await this.assertStudentAccess(studentId, user, false, false);

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        parentLinks: {
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!studentProfile || !studentProfile.user) {
      throw new NotFoundException(`Student with ID [${studentId}] not found`);
    }

    const newPassword = dto.newPassword?.trim() || generateSecurePassword(6);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const pinExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 1. Update user password and profile tempAccessPin
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: studentProfile.user.id },
        data: { passwordHash },
      }),
      this.prisma.studentProfile.update({
        where: { id: studentProfile.id },
        data: {
          tempAccessPin: newPassword,
          pinExpiresAt,
        },
      }),
    ]);

    const studentName = studentProfile.user.fullName;
    const studentPhone = studentProfile.user.phone || '';
    const studentCode = studentProfile.studentCode || '';
    const parentPhone =
      studentProfile.emergencyPhone ||
      studentProfile.parentLinks?.[0]?.parent?.user?.phone ||
      '';
    const parentName =
      studentProfile.parentLinks?.[0]?.parent?.user?.fullName || 'ولي الأمر';

    let messageSent = false;
    if (dto.sendWhatsApp !== false && this.whatsAppService) {
      try {
        let teacherName = 'إدارة السنتر';
        if (user.role === UserRole.TEACHER) {
          const teacherUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { fullName: true },
          });
          if (teacherUser?.fullName) {
            teacherName = teacherUser.fullName;
          }
        }

        const message = `🔑 *إشعار تحديث بيانات الدخول - منصة الأوّل*

أهلاً بحضرتك أ/ ${parentName}،
تم تحديث كلمة المرور الخاصة بالطالب/ة: *${studentName}* (${studentCode}) مع *${teacherName}*.

━━━━━━━━━━━━━━━━━━━
📌 *بيانات الدخول المحدثة:*
▫️ *كود الطالب:* ${studentCode}
▫️ *رقم الدخول / الهاتف:* ${studentPhone}
▫️ *كلمة المرور الجديدة:* ${newPassword}
🔗 *رابط تسجيل الدخول:* https://al-awal.online/login
━━━━━━━━━━━━━━━━━━━
يمكنكم الدخول ومتابعة الحساب في أي وقت. بالتوفيق والنجاح! 🌟`.trim();

        if (parentPhone) {
          await this.whatsAppService.sendMessage(parentPhone, message);
          messageSent = true;
        }

        if (studentPhone && studentPhone !== parentPhone) {
          const studentMsg = `🔑 *إشعار تحديث كلمة المرور - منصة الأوّل*

أهلاً بك يا ${studentName} 🌸
تم تحديث كلمة المرور لحسابك على منصة الأوّل:
▫️ *كود الطالب:* ${studentCode}
▫️ *رقم الهاتف:* ${studentPhone}
▫️ *كلمة المرور الجديدة:* ${newPassword}
🔗 *رابط الدخول:* https://al-awal.online/login
نتمنى لك كل التوفيق! 🌟`.trim();

          await this.whatsAppService.sendMessage(studentPhone, studentMsg);
        }
      } catch (waErr) {
        this.logger.warn(`Failed to dispatch reset-password WhatsApp alert: ${waErr}`);
      }
    }

    return {
      success: true,
      studentId: studentProfile.id,
      studentCode,
      studentName,
      studentPhone,
      parentPhone,
      newPassword,
      messageSent,
    };
  }

  /**
   * Retrieve student credentials & active temporary PIN.
   */
  async getStudentCredentials(studentId: string, user: AuthenticatedUser) {
    await this.assertStudentAccess(studentId, user, false, false);

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
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
        parentLinks: {
          include: {
            parent: {
              include: {
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
    });

    if (!studentProfile || !studentProfile.user) {
      throw new NotFoundException(`Student with ID [${studentId}] not found`);
    }

    const parentUser = studentProfile.parentLinks?.[0]?.parent?.user;
    const isPinActive =
      !!studentProfile.tempAccessPin &&
      (!studentProfile.pinExpiresAt || new Date(studentProfile.pinExpiresAt) > new Date());

    return {
      studentId: studentProfile.id,
      studentName: studentProfile.user.fullName,
      studentCode: studentProfile.studentCode,
      studentPhone: studentProfile.user.phone,
      parentName: parentUser?.fullName || null,
      parentPhone: studentProfile.emergencyPhone || parentUser?.phone || null,
      tempAccessPin: isPinActive ? studentProfile.tempAccessPin : null,
      pinExpiresAt: studentProfile.pinExpiresAt,
      isPinActive,
    };
  }
}
