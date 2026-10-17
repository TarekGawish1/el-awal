import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { GroupEnrollmentStatus } from '@prisma/client';

export async function fetchTeacherSnapshotStudents(
  prisma: PrismaService,
  allTeacherGroupIds: string[],
  groupIds: string[],
  isDelta: boolean,
  sinceDate: Date | null,
  logger: Logger,
): Promise<any[]> {
  try {
    const targetGroupIds = allTeacherGroupIds.length > 0 ? allTeacherGroupIds : groupIds;
    if (targetGroupIds.length === 0) {
      return [];
    }

    const enrollmentWhere: any = {
      groupId: { in: targetGroupIds },
      status: GroupEnrollmentStatus.ACTIVE,
      student: {
        academicStatus: 'ACTIVE',
        user: { isActive: true },
      },
    };

    if (isDelta && sinceDate) {
      enrollmentWhere.OR = [
        { updatedAt: { gte: sinceDate } },
        { student: { updatedAt: { gte: sinceDate } } },
      ];
    }

    const enrollments = await prisma.groupEnrollment.findMany({
      where: enrollmentWhere,
      ...(!isDelta ? { take: 2000 } : {}),
      include: {
        student: {
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
          },
        },
      },
    });

    const studentMap = new Map<string, any>();
    for (const enrollment of ((enrollments as any[]) || [])) {
      if (
        enrollment?.student &&
        enrollment.student.user?.isActive !== false &&
        (enrollment.student.academicStatus || 'ACTIVE') === 'ACTIVE'
      ) {
        const s = enrollment.student;
        const existing = studentMap.get(s.id);
        if (!existing) {
          studentMap.set(s.id, {
            id: s.id,
            fullName: s.user?.fullName || '',
            phone: s.user?.phone,
            email: s.user?.email,
            studentCode: s.studentCode || '',
            qrCodeToken: s.qrCodeToken,
            gradeLevel: s.gradeLevel,
            emergencyPhone: s.emergencyPhone,
            academicStatus: s.academicStatus || 'ACTIVE',
            groupId: enrollment.groupId,
            groupIds: [enrollment.groupId],
            updatedAt: s.updatedAt,
          });
        } else {
          if (enrollment.groupId && !existing.groupIds.includes(enrollment.groupId)) {
            existing.groupIds.push(enrollment.groupId);
          }
        }
      }
    }

    const unassignedWhere: any = {
      academicStatus: 'ACTIVE',
      user: { isActive: true },
      groupEnrollments: { none: { status: GroupEnrollmentStatus.ACTIVE } },
    };

    if (isDelta && sinceDate) {
      unassignedWhere.updatedAt = { gte: sinceDate };
    }

    const unassignedCenterStudents = await prisma.studentProfile.findMany({
      where: unassignedWhere,
      ...(!isDelta ? { take: 500 } : {}),
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
      },
    });

    for (const s of unassignedCenterStudents) {
      if (!studentMap.has(s.id)) {
        studentMap.set(s.id, {
          id: s.id,
          fullName: s.user?.fullName || '',
          phone: s.user?.phone,
          email: s.user?.email,
          studentCode: s.studentCode || '',
          qrCodeToken: s.qrCodeToken,
          gradeLevel: s.gradeLevel,
          emergencyPhone: s.emergencyPhone,
          academicStatus: s.academicStatus || 'ACTIVE',
          groupId: null,
          groupIds: [],
          updatedAt: s.updatedAt,
        });
      }
    }

    return Array.from(studentMap.values());
  } catch (err) {
    logger.warn('Failed to fetch students in bootstrap snapshot:', err);
    return [];
  }
}
