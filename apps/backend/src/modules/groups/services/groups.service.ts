import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { GroupEnrollmentStatus, AttendanceStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Validates that a teacher owns the target group (Secretariat/Admin bypasses).
   */
  private async checkTeacherOwnership(group: { teacherId: string }, user?: AuthenticatedUser) {
    if (!user) return;
    if (user.role === UserRole.TEACHER) {
      const teacherId = user.teacherProfileId || user.id;
      if (group.teacherId === teacherId || group.teacherId === user.id) {
        return;
      }
      if (typeof this.prisma.teacherProfile?.findFirst === 'function') {
        const teacherProfile = await this.prisma.teacherProfile.findFirst({
          where: { OR: [{ id: user.teacherProfileId }, { user: { id: user.id } }, { id: user.id }] },
        });
        if (teacherProfile && group.teacherId === teacherProfile.id) {
          return;
        }
      }
      throw new ForbiddenException(
        'You do not have permission to view or manage this academic group',
      );
    }
  }

  /**
   * Creates a new physical academic group assigned to the authenticated teacher.
   */
  async createGroup(teacherId: string, dto: CreateGroupDto) {
    if (dto.id) {
      const existing = await this.prisma.academicGroup.findUnique({
        where: { id: dto.id },
        include: { schedules: true },
      });
      if (existing) {
        return existing;
      }
    }

    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });

    let effectiveTeacherId = teacherId;
    if (!teacherProfile) {
      const primaryTeacher = await this.prisma.teacherProfile.findFirst();
      if (primaryTeacher) {
        effectiveTeacherId = primaryTeacher.id;
      }
    }

    return this.prisma.academicGroup.create({
      data: {
        id: dto.id || undefined,
        name: dto.name,
        gradeLevel: dto.gradeLevel,
        academicYear: dto.academicYear || '2026-2027',
        academicTerm: dto.academicTerm || 'FIRST_TERM',
        description: dto.description,
        maxCapacity: dto.maxCapacity || 50,
        monthlyFee: dto.monthlyFee || 0.0,
        teacherId: effectiveTeacherId,
        schedules: dto.schedules?.length ? {
          create: dto.schedules.map(s => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location || null,
          })),
        } : undefined,
      },
      include: { schedules: true },
    });
  }

  /**
   * Lists all active groups managed by a specific teacher.
   */
  async getTeacherGroups(teacherId: string, academicYear?: string, academicTerm?: string) {
    let effectiveTeacherId = teacherId;
    if (typeof this.prisma.teacherProfile?.findFirst === 'function') {
      const teacherProfile = await this.prisma.teacherProfile.findFirst({
        where: {
          OR: [
            { id: teacherId },
            { user: { id: teacherId } },
            { id: teacherId },
          ],
        },
      });
      if (teacherProfile) {
        effectiveTeacherId = teacherProfile.id;
      } else {
        const primaryTeacher = await this.prisma.teacherProfile.findFirst();
        if (primaryTeacher) {
          effectiveTeacherId = primaryTeacher.id;
        }
      }
    }

    const where: any = {
      OR: [
        { teacherId: effectiveTeacherId },
        { teacher: { id: effectiveTeacherId } },
      ],
      isActive: true,
    };
    if (academicYear) where.academicYear = academicYear;
    if (academicTerm) where.academicTerm = academicTerm;

    return this.prisma.academicGroup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        _count: {
          select: {
            enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
            sessions: true,
          },
        },
      },
    });
  }

  /**
   * Retrieves single group metadata, schedules, and active student count.
   */
  async getGroupById(groupId: string, user?: AuthenticatedUser) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
      include: {
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        _count: {
          select: {
            enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
            sessions: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    await this.checkTeacherOwnership(group, user);

    return group;
  }

  /**
   * Updates an academic group and its schedules
   */
  async updateGroup(groupId: string, dto: UpdateGroupDto, user?: AuthenticatedUser) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    await this.checkTeacherOwnership(group, user);

    const { schedules, ...updateData } = dto;

    return this.prisma.$transaction(async (tx) => {
      // update main group
      const updatedGroup = await tx.academicGroup.update({
        where: { id: groupId },
        data: updateData,
      });

      // if schedules are provided, replace them
      if (schedules !== undefined) {
        await tx.lessonSchedule.deleteMany({ where: { groupId } });
        if (schedules.length > 0) {
          await tx.lessonSchedule.createMany({
            data: schedules.map((s) => ({
              groupId,
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              location: s.location || null,
            })),
          });
        }
      }

      return updatedGroup;
    });
  }

  /**
   * Deletes a group permanently (cascading schedules and enrollments).
   */
  async deleteGroup(groupId: string, user?: AuthenticatedUser) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    await this.checkTeacherOwnership(group, user);

    await this.prisma.academicGroup.delete({
      where: { id: groupId },
    });

    return { success: true, message: 'Group successfully deleted' };
  }

  /**
   * Enrolls a student into a physical group, enforcing max capacity limits.
   */
  async enrollStudent(groupId: string, studentId: string, user?: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.academicGroup.findUnique({
        where: { id: groupId },
        include: {
          _count: {
            select: { enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } } },
          },
        },
      });

      if (!group || !group.isActive) {
        throw new NotFoundException(`Academic group [${groupId}] not found or inactive`);
      }

      await this.checkTeacherOwnership(group, user);

      if (group._count.enrollments >= group.maxCapacity) {
        throw new ConflictException(
          `Group [${group.name}] capacity has been reached (${group.maxCapacity} students)`,
        );
      }

      const student = await tx.studentProfile.findUnique({
        where: { id: studentId },
        include: { user: { select: { isActive: true } } },
      });

      if (!student || !student.user.isActive) {
        throw new NotFoundException(`Student [${studentId}] not found or account is deactivated`);
      }

      const enrollment = await tx.groupEnrollment.upsert({
        where: {
          groupId_studentId: {
            groupId,
            studentId,
          },
        },
        create: {
          groupId,
          studentId,
          status: GroupEnrollmentStatus.ACTIVE,
          enrolledAt: new Date(),
        },
        update: {
          status: GroupEnrollmentStatus.ACTIVE,
          enrolledAt: new Date(),
        },
      });

      this.logger.log(`Student [${studentId}] enrolled in group [${groupId}]`);
      return enrollment;
    });
  }

  /**
   * Drops a student from the active group roster.
   */
  async dropStudent(groupId: string, studentId: string, user?: AuthenticatedUser) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    await this.checkTeacherOwnership(group, user);

    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Student [${studentId}] is not enrolled in group [${groupId}]`);
    }

    return this.prisma.groupEnrollment.update({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
      data: {
        status: GroupEnrollmentStatus.DROPPED,
      },
    });
  }

  /**
   * Retrieves full roster of actively enrolled students in a group with attendance rate summary.
   */
  async getGroupRoster(groupId: string, user?: AuthenticatedUser) {
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
      include: {
        enrollments: {
          where: { status: GroupEnrollmentStatus.ACTIVE },
          orderBy: { student: { user: { fullName: 'asc' } } },
          include: {
            student: {
              include: {
                user: { select: { id: true, fullName: true, phone: true, email: true } },
                parentLinks: {
                  include: {
                    parent: {
                      include: { user: { select: { fullName: true, phone: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Academic group [${groupId}] not found`);
    }

    await this.checkTeacherOwnership(group, user);

    // Compute total sessions for this group
    const totalSessions = await this.prisma.lessonSession.count({
      where: { groupId },
    });

    const roster = await Promise.all(
      group.enrollments.map(async (e) => {
        const presentCount = await this.prisma.attendanceRecord.count({
          where: {
            studentId: e.studentId,
            session: { groupId },
            status: AttendanceStatus.PRESENT,
          },
        });

        const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

        return {
          enrollmentId: e.id,
          studentId: e.studentId,
          studentCode: e.student.studentCode,
          fullName: e.student.user.fullName,
          phone: e.student.user.phone,
          gradeLevel: e.student.gradeLevel,
          enrolledAt: e.enrolledAt,
          parent: e.student.parentLinks[0]?.parent.user || null,
          attendanceRate,
          totalPresent: presentCount,
          totalSessions,
        };
      }),
    );

    return {
      groupId: group.id,
      groupName: group.name,
      totalEnrolled: roster.length,
      maxCapacity: group.maxCapacity,
      roster,
    };
  }

  /**
   * Retrieves all pending group reservations.
   * If teacherId is provided, filters for that teacher's groups only.
   */
  async getPendingReservations(user: AuthenticatedUser) {
    let teacherId = undefined;
    if (user.role === UserRole.TEACHER) {
      teacherId = user.teacherProfileId || user.id;
    }

    return this.prisma.groupEnrollment.findMany({
      where: {
        status: 'PENDING' as GroupEnrollmentStatus,
        ...(teacherId ? {
          group: {
            OR: [
              { teacherId: teacherId },
              { teacher: { id: teacherId } },
              { teacher: { user: { id: teacherId } } }
            ]
          }
        } : {})
      },
      orderBy: { enrolledAt: 'desc' },
      include: {
        group: { select: { id: true, name: true, maxCapacity: true, gradeLevel: true, _count: { select: { enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } } } } } },
        student: {
          include: {
            user: { select: { fullName: true, phone: true } }
          }
        }
      }
    });
  }

  /**
   * Accepts a pending group reservation
   */
  async acceptReservation(enrollmentId: string, user: AuthenticatedUser, paymentStatus: 'PAID' | 'LATER' = 'LATER') {
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { group: { include: { _count: { select: { enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } } } } } } }
    });

    if (!enrollment || enrollment.status !== 'PENDING' as GroupEnrollmentStatus) {
      throw new NotFoundException('Pending reservation not found');
    }

    await this.checkTeacherOwnership(enrollment.group, user);

    if (enrollment.group._count.enrollments >= enrollment.group.maxCapacity) {
      throw new BadRequestException('هذه المجموعة مكتملة العدد');
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    return this.prisma.$transaction(async (tx) => {
      const updatedEnrollment = await tx.groupEnrollment.update({
        where: { id: enrollmentId },
        data: { status: GroupEnrollmentStatus.ACTIVE }
      });

      const amount = enrollment.group.monthlyFee || 0;

      await tx.studentPaymentRecord.create({
        data: {
          studentId: enrollment.studentId,
          groupId: enrollment.groupId,
          periodYear: currentYear,
          periodMonth: currentMonth,
          amountExpected: amount,
          amountPaid: paymentStatus === 'PAID' ? amount : 0,
          paymentStatus: paymentStatus === 'PAID' ? 'PAID' as any : 'PENDING' as any,
          paymentType: 'TUITION' as any,
          paymentMethod: 'CASH',
          recordedById: user.id,
          notes: paymentStatus === 'PAID' ? 'تم الدفع وقت تأكيد الانضمام عبر QR' : 'تم تأكيد الانضمام وسيتم الدفع لاحقاً',
        }
      });

      return updatedEnrollment;
    });
  }

  /**
   * Rejects a pending group reservation
   */
  async rejectReservation(enrollmentId: string, user: AuthenticatedUser) {
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { group: true }
    });

    if (!enrollment || enrollment.status !== 'PENDING' as GroupEnrollmentStatus) {
      throw new NotFoundException('Pending reservation not found');
    }

    await this.checkTeacherOwnership(enrollment.group, user);

    return this.prisma.groupEnrollment.delete({
      where: { id: enrollmentId }
    });
  }
}
