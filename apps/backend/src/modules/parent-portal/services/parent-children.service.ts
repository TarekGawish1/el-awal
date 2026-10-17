import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { GroupEnrollmentStatus, UserRole } from '@prisma/client';

@Injectable()
export class ParentChildrenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Enforces that the authenticated parent is legally linked to the student.
   */
  async verifyGuardianLink(parentId: string, studentId: string, userRole?: string) {
    if (userRole === UserRole.TEACHER || userRole === UserRole.SECRETARIAT) {
      return;
    }

    const link = await this.prisma.parentStudentLink.findFirst({
      where: {
        parentId,
        studentId,
      },
    });

    if (!link) {
      throw new ForbiddenException(
        'Guardianship authorization failed: You are not linked to this student',
      );
    }
  }

  /**
   * Lists all children/students registered under the authenticated parent account.
   */
  async getLinkedStudents(parentId: string) {
    const links = await this.prisma.parentStudentLink.findMany({
      where: {
        OR: [
          { parentId },
          { parent: { id: parentId } },
        ],
      },
      include: {
        parent: true,
        student: {
          include: {
            user: { select: { id: true, fullName: true, phone: true, email: true } },
            groupEnrollments: {
              where: { status: GroupEnrollmentStatus.ACTIVE },
              include: { group: { select: { id: true, name: true, gradeLevel: true } } },
            },
          },
        },
      },
    });

    return links.map((l) => ({
      linkId: l.id,
      relationshipType: l.parent?.relationshipType || 'Guardian',
      student: {
        id: l.student.id,
        studentCode: l.student.studentCode,
        fullName: l.student.user.fullName,
        phone: l.student.user.phone,
        email: l.student.user.email,
        gradeLevel: l.student.gradeLevel,
        academicStage: l.student.academicStage,
        activeGroups: l.student.groupEnrollments.map((ge) => ge.group),
      },
    }));
  }
}
