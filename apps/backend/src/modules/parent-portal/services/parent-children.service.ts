import { Injectable, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { GroupEnrollmentStatus, UserRole } from '@prisma/client';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';

@Injectable()
export class ParentChildrenService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Helper: Enforces that the authenticated parent is legally linked to the student.
   */
  async verifyGuardianLink(parentId: string, studentId: string, userRole?: string) {
    if (userRole === UserRole.TEACHER || userRole === UserRole.SECRETARIAT) {
      return;
    }

    const cacheKey = `parent:link:${parentId}:${studentId}`;
    if (this.redisCache) {
      const isLinked = await this.redisCache.get<boolean>(cacheKey);
      if (isLinked === true) return;
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

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, true, 300);
    }
  }

  /**
   * Lists all children/students registered under the authenticated parent account.
   */
  async getLinkedStudents(parentId: string) {
    const cacheKey = `parent:linked_students:${parentId}`;
    if (this.redisCache) {
      const cached = await this.redisCache.get<any[]>(cacheKey);
      if (cached) return cached;
    }

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

    const result = links.map((l) => ({
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

    if (this.redisCache) {
      await this.redisCache.set(cacheKey, result, 120);
    }

    return result;
  }
}
