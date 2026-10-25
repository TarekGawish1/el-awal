import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { generateSecurePassword } from '../../../common/utils/password.util';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  UserRole,
  GroupEnrollmentStatus,
  StudentAcademicStatus,
} from '@prisma/client';
import { StudentDeletionService } from './student-deletion.service';
import { assertStudentAccess } from '../helpers/student-access.helper';

@Injectable()
export class StudentProfileService {
  private readonly logger = new Logger(StudentProfileService.name);
  private readonly deletionService: StudentDeletionService;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() deletionService?: StudentDeletionService,
  ) {
    this.deletionService =
      deletionService ?? new StudentDeletionService(this.prisma);
  }

  async assertStudentAccess(
    studentId: string,
    user: AuthenticatedUser,
    allowStudent = true,
    allowParent = true,
  ) {
    return assertStudentAccess(this.prisma, studentId, user, allowStudent, allowParent);
  }

  /**
   * Updates student profile details and group enrollments
   */
  async updateStudent(
    studentId: string,
    dto: UpdateStudentDto,
    user: AuthenticatedUser,
  ) {
    await this.assertStudentAccess(studentId, user, false, false);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        parentLinks: { include: { parent: { include: { user: true } } } },
        groupEnrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student [${studentId}] not found`);
    }

    const updaterName =
      user?.fullName ||
      (user?.role === UserRole.SECRETARIAT ? 'المساعد' : 'المعلم');

    return this.prisma.$transaction(async (tx) => {
      if (dto.phone || dto.email || dto.fullName) {
        await tx.user.update({
          where: { id: student.id },
          data: {
            ...(dto.fullName && { fullName: dto.fullName }),
            ...(dto.phone && { phone: dto.phone }),
            ...(dto.email && { email: dto.email }),
          },
        });
      }

      if (
        dto.gradeLevel ||
        dto.academicStage ||
        dto.emergencyPhone ||
        dto.dateOfBirth
      ) {
        await tx.studentProfile.update({
          where: { id: student.id },
          data: {
            ...(dto.gradeLevel && { gradeLevel: dto.gradeLevel }),
            ...(dto.academicStage && { academicStage: dto.academicStage }),
            ...(dto.emergencyPhone && { emergencyPhone: dto.emergencyPhone }),
            ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
            updatedById: user.id,
            updatedByName: updaterName,
          },
        });
      }

      if (dto.parentName || dto.parentPhone || dto.parentRelationship) {
        const parentLink = student.parentLinks[0];

        if (parentLink) {
          await tx.user.update({
            where: { id: parentLink.parentId },
            data: {
              ...(dto.parentName && { fullName: dto.parentName }),
              ...(dto.parentPhone && { phone: dto.parentPhone }),
            },
          });
          if (dto.parentRelationship) {
            await tx.parentProfile.update({
              where: { id: parentLink.parentId },
              data: { relationshipType: dto.parentRelationship },
            });
          }
        } else if (dto.parentPhone) {
          const parentTempPassword = generateSecurePassword(8);
          const parentPasswordHash = await bcrypt.hash(parentTempPassword, 10);
          const parentUser = await tx.user.create({
            data: {
              fullName:
                dto.parentName ||
                `ولي أمر ${dto.fullName || student.user.fullName}`,
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
          });

          await tx.parentStudentLink.create({
            data: {
              parentId: parentUser.id,
              studentId: student.id,
            },
          });
        }
      }

      if (dto.initialGroupId) {
        const currentActiveEnrollments = student.groupEnrollments;
        const isAlreadyInGroup = currentActiveEnrollments.some(
          (e) => e.groupId === dto.initialGroupId,
        );

        if (!isAlreadyInGroup) {
          if (currentActiveEnrollments.length > 0) {
            await tx.groupEnrollment.updateMany({
              where: { id: { in: currentActiveEnrollments.map((e) => e.id) } },
              data: { status: 'DROPPED' as GroupEnrollmentStatus },
            });
          }

          const group = await tx.academicGroup.findUnique({
            where: { id: dto.initialGroupId },
            include: {
              _count: {
                select: {
                  enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } },
                },
              },
            },
          });

          if (!group) {
            throw new NotFoundException(`Group [${dto.initialGroupId}] not found`);
          }

          if (group._count.enrollments >= group.maxCapacity) {
            throw new BadRequestException(
              `Group [${group.name}] has reached its max capacity`,
            );
          }

          const existingEnrollment = await tx.groupEnrollment.findUnique({
            where: {
              groupId_studentId: {
                groupId: dto.initialGroupId,
                studentId: student.id,
              },
            },
          });

          if (existingEnrollment) {
            await tx.groupEnrollment.update({
              where: { id: existingEnrollment.id },
              data: { status: GroupEnrollmentStatus.ACTIVE },
            });
          } else {
            await tx.groupEnrollment.create({
              data: {
                groupId: dto.initialGroupId,
                studentId: student.id,
                status: GroupEnrollmentStatus.ACTIVE,
              },
            });
          }
        }
      }

      return tx.studentProfile.findUnique({
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
                      isActive: true,
                    },
                  },
                },
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
    });
  }

  /**
   * Retrieves single student by ID with user, parent links, and group enrollments.
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
        attendanceMode: true,
        dateOfBirth: true,
        emergencyPhone: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        createdByName: true,
        updatedById: true,
        updatedByName: true,
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
                    isActive: true,
                  },
                },
              },
            },
          },
        },
        groupEnrollments: {
          orderBy: { enrolledAt: 'desc' },
          include: {
            group: { select: { id: true, name: true, gradeLevel: true, academicYear: true, academicTerm: true } },
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
   * Updates student academic status.
   */
  async updateStudentStatus(
    id: string,
    status: StudentAcademicStatus,
    user: AuthenticatedUser,
  ) {
    await this.assertStudentAccess(id, user);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) throw new NotFoundException('Student profile not found');

    const updaterName =
      user?.fullName ||
      (user?.role === UserRole.SECRETARIAT ? 'المساعد' : 'المعلم');
    const updated = await this.prisma.studentProfile.update({
      where: { id },
      data: {
        academicStatus: status,
        updatedById: user?.id,
        updatedByName: updaterName,
      },
      include: {
        user: true,
        parentLinks: { include: { parent: { include: { user: true } } } },
        groupEnrollments: { include: { group: true } },
      },
    });

    this.logger.log(
      `Student [${id}] ${student.user.fullName} status updated to: ${status} by ${updaterName}`,
    );
    return updated;
  }

  /**
   * Removes / deletes a student completely from the system with all child records.
   */
  async deleteStudent(id: string, user: AuthenticatedUser) {
    await this.assertStudentAccess(id, user);
    return this.deletionService.deleteStudent(id, user);
  }
}
