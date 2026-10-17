import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { UserRole, GroupEnrollmentStatus } from '@prisma/client';

export async function assertGroupAccess(
  prisma: PrismaService,
  groupId: string,
  user: AuthenticatedUser,
  requireTeacherOwnership = false,
) {
  const group = await prisma.academicGroup.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    throw new NotFoundException(`Academic group [${groupId}] not found`);
  }

  if (user.role === UserRole.SECRETARIAT) {
    return group;
  }

  if (user.role === UserRole.TEACHER) {
    const teacherId = user.teacherProfileId || user.id;
    if (group.teacherId !== teacherId && group.teacherId !== user.id) {
      throw new ForbiddenException('You do not own this academic group');
    }
    return group;
  }

  if (requireTeacherOwnership) {
    throw new ForbiddenException(
      'Only the group teacher or secretariat can perform this action',
    );
  }

  if (user.role === UserRole.STUDENT) {
    const studentId = user.studentProfileId || user.id;
    const enrollment = await prisma.groupEnrollment.findUnique({
      where: {
        groupId_studentId: {
          groupId,
          studentId,
        },
      },
    });
    if (!enrollment || enrollment.status !== GroupEnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('You are not enrolled in this group');
    }
    return group;
  }

  if (user.role === UserRole.PARENT) {
    const parentId = user.parentProfileId || user.id;
    const childEnrollment = await prisma.groupEnrollment.findFirst({
      where: {
        groupId,
        status: GroupEnrollmentStatus.ACTIVE,
        student: {
          parentLinks: {
            some: { parentId },
          },
        },
      },
    });
    if (!childEnrollment) {
      throw new ForbiddenException(
        'None of your linked children are enrolled in this group',
      );
    }
    return group;
  }

  throw new ForbiddenException('Unauthorized access');
}
