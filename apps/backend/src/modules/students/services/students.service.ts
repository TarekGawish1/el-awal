import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { StudentQueryDto } from '../dto/student-query.dto';
import { StudentQrCodeResponseDto } from '../dto/qr-code-response.dto';
import { UserRole, GroupEnrollmentStatus } from '@prisma/client';
import { CursorPaginationHelper } from '../../../common/pagination/cursor-pagination.helper';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { generateUniqueStudentCode } from '../../../common/utils/student-code.util';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private readonly prisma: PrismaService) {}

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
          where: { status: GroupEnrollmentStatus.ACTIVE },
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
  async getStudents(query: StudentQueryDto) {
    const limit = CursorPaginationHelper.sanitizeLimit(query.limit);
    const decodedCursor = query.cursor ? CursorPaginationHelper.decodeCursor(query.cursor) : null;
    const cursorFilter = CursorPaginationHelper.buildPrismaWhereClause(decodedCursor, 'DESC');

    const where: any = {
      ...(query.gradeLevel ? { gradeLevel: query.gradeLevel } : {}),
      ...(query.academicStage ? { academicStage: query.academicStage } : {}),
      ...(query.academicStatus ? { academicStatus: query.academicStatus } : {}),
      ...(query.groupId
        ? { groupEnrollments: { some: { groupId: query.groupId, status: GroupEnrollmentStatus.ACTIVE } } }
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
}
