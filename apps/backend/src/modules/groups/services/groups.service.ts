import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { GroupEnrollmentStatus, AttendanceStatus } from '@prisma/client';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new physical academic group assigned to the authenticated teacher.
   */
  async createGroup(teacherId: string, dto: CreateGroupDto) {
    return this.prisma.academicGroup.create({
      data: {
        name: dto.name,
        gradeLevel: dto.gradeLevel,
        description: dto.description,
        maxCapacity: dto.maxCapacity || 50,
        monthlyFee: dto.monthlyFee || 0.0,
        teacherId,
      },
    });
  }

  /**
   * Lists all active groups managed by a specific teacher.
   */
  async getTeacherGroups(teacherId: string) {
    return this.prisma.academicGroup.findMany({
      where: { teacherId, isActive: true },
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
  async getGroupById(groupId: string) {
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

    return group;
  }

  /**
   * Enrolls a student into a physical group, enforcing max capacity limits.
   */
  async enrollStudent(groupId: string, studentId: string) {
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
  async dropStudent(groupId: string, studentId: string) {
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
  async getGroupRoster(groupId: string) {
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
          studentId: e.student.id,
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
}
