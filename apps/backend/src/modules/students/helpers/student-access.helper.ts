import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole, GroupEnrollmentStatus } from '@prisma/client';

export async function assertStudentAccess(
  prisma: PrismaService,
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
    const link = await prisma.parentStudentLink.findUnique({
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

    const enrolledInTeacherGroup = await prisma.groupEnrollment.findFirst({
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

    if (enrolledInTeacherGroup) {
      return;
    }

    if (prisma.courseEnrollment?.findFirst) {
      const enrolledInTeacherCourse = await prisma.courseEnrollment.findFirst({
        where: {
          studentId,
          course: {
            OR: [
              { teacherId },
              { teacher: { id: teacherId } },
            ],
          },
        },
      });

      if (enrolledInTeacherCourse) {
        return;
      }
    }

    if (prisma.studentProfile?.findUnique) {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: {
          groupEnrollments: {
            where: { status: GroupEnrollmentStatus.ACTIVE },
          },
        },
      });

      if (studentProfile) {
        const isCreatedByTeacher =
          !!studentProfile.createdById &&
          (studentProfile.createdById === teacherId ||
            studentProfile.createdById === user.id);

        const isUnassignedAndSelfRegistered =
          studentProfile.createdById === null &&
          (!studentProfile.groupEnrollments ||
            studentProfile.groupEnrollments.length === 0);

        if (isCreatedByTeacher || isUnassignedAndSelfRegistered) {
          return;
        }
      }
    }

    throw new ForbiddenException('Student is not enrolled in any of your academic groups');
  }

  throw new ForbiddenException('Unauthorized access');
}
