import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseEnrollmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        teacherProfile: true,
        studentProfile: true,
        parentProfile: true,
        secretariatProfile: true,
        assistantToTeachers: {
          where: { status: 'ACTIVE' },
          select: { permissions: true, teacherId: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const permissions = user.assistantToTeachers?.[0]?.permissions || [];
    const secretariatProfileId = (user.role === 'STUDENT' || user.role === 'TEACHER')
      ? undefined
      : (user.secretariatProfile?.id || (user.assistantToTeachers?.length ? user.id : undefined));
    const teacherProfileId = (user.role === 'TEACHER') ? user.teacherProfile?.id : undefined;
    const parentProfileId = (user.role === 'TEACHER' || user.role === 'STUDENT') ? undefined : user.parentProfile?.id;
    const studentProfileId = (user.role === 'STUDENT') ? user.studentProfile?.id : undefined;

    return {
      ...user,
      secretariatProfileId,
      teacherProfileId,
      parentProfileId,
      studentProfileId,
      permissions,
    };
  }

  async getBadges(user: AuthenticatedUser) {
    const isTeacherOrSecretariat =
      user.role === UserRole.TEACHER || user.role === UserRole.SECRETARIAT;

    // 1. Unread notifications count (for any authenticated user)
    const unreadNotificationsPromise = this.prisma.notification.count({
      where: { recipientId: user.id, isRead: false },
    });

    // 2. Unread website contact inquiries count (for teachers and secretariat)
    const unreadInquiriesPromise = isTeacherOrSecretariat
      ? this.prisma.contactMessage.count({ where: { isRead: false } })
      : Promise.resolve(0);

    // 3. Pending course reservations count (for teachers and secretariat)
    let pendingReservationsPromise: Promise<number> = Promise.resolve(0);
    if (isTeacherOrSecretariat) {
      let teacherProfileId = user.teacherProfileId;
      if (!teacherProfileId) {
        if (user.role === UserRole.TEACHER) {
          const teacher = await this.prisma.teacherProfile.findFirst({
            where: { OR: [{ id: user.id }, { user: { id: user.id } }] },
            select: { id: true },
          });
          teacherProfileId = teacher?.id || user.id;
        } else if (user.role === UserRole.SECRETARIAT) {
          const link = await this.prisma.teacherAssistant.findFirst({
            where: { assistantId: user.id, status: 'ACTIVE' },
            select: { teacherId: true },
          });
          teacherProfileId = link?.teacherId || undefined;
        }
      }

      if (teacherProfileId) {
        pendingReservationsPromise = this.prisma.courseEnrollment.count({
          where: {
            status: CourseEnrollmentStatus.PENDING,
            course: { teacherId: teacherProfileId },
          },
        });
      }
    }

    const [unreadNotifications, unreadInquiries, pendingReservations] = await Promise.all([
      unreadNotificationsPromise,
      unreadInquiriesPromise,
      pendingReservationsPromise,
    ]);

    return {
      unreadNotifications,
      unreadInquiries,
      pendingReservations,
    };
  }
}

