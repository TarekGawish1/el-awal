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
import { UserRole, GroupEnrollmentStatus, PaymentStatus, PaymentType, StudentAcademicStatus } from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';
import { StudentGroupQueryDto } from '../dto/student-group-query.dto';
import { StorageService } from '../../../integrations/storage/storage.service';
import { computeEffectiveDueDate, SessionForDeadline } from '../../assessments/utils/effective-due-date.util';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly storageService?: StorageService,
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
        }
      }
    });

    if (!group) throw new NotFoundException('Group not found');
    if (group._count.enrollments >= group.maxCapacity) {
      throw new BadRequestException('هذه المجموعة مكتملة العدد');
    }

    const existingEnrollment = await this.prisma.groupEnrollment.findUnique({
      where: { groupId_studentId: { groupId, studentId } }
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'PENDING' as GroupEnrollmentStatus) {
        throw new BadRequestException('لديك حجز قيد الانتظار بالفعل في هذه المجموعة');
      }
      if (existingEnrollment.status === GroupEnrollmentStatus.ACTIVE) {
        throw new BadRequestException('أنت منضم بالفعل لهذه المجموعة');
      }
      
      // If DROPPED or TRANSFERRED, we can reactivate it as PENDING
      return this.prisma.groupEnrollment.update({
        where: { id: existingEnrollment.id },
        data: { status: 'PENDING' as GroupEnrollmentStatus }
      });
    }

    return this.prisma.groupEnrollment.create({
      data: {
        groupId,
        studentId,
        status: 'PENDING' as GroupEnrollmentStatus,
      },
    });
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
}
