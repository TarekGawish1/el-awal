import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import {
  GroupEnrollmentStatus,
  NotificationChannel,
  NotificationType,
} from '@prisma/client';

@Injectable()
export class StudentGroupReservationService {
  private readonly logger = new Logger(StudentGroupReservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private resolveStudentId(user: AuthenticatedUser): string {
    return user.studentProfileId || user.id;
  }

  /**
   * Fetches available active groups for the student's current grade level.
   */
  async getAvailableGroups(user: AuthenticatedUser) {
    const studentId = this.resolveStudentId(user);
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { gradeLevel: true, academicStage: true },
    });

    if (!student) throw new NotFoundException('Student profile not found');

    return this.prisma.academicGroup.findMany({
      where: {
        gradeLevel: student.gradeLevel,
        isActive: true,
      },
      include: {
        teacher: {
          include: { user: { select: { fullName: true } } },
        },
        schedules: {
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
        _count: {
          select: {
            enrollments: {
              where: {
                status: {
                  in: [
                    GroupEnrollmentStatus.ACTIVE,
                    'PENDING' as GroupEnrollmentStatus,
                  ],
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Allows a student to reserve a spot (PENDING enrollment) in a group.
   */
  async reserveGroup(groupId: string, user: AuthenticatedUser) {
    const studentId = this.resolveStudentId(user);
    const group = await this.prisma.academicGroup.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            enrollments: {
              where: {
                status: {
                  in: [
                    GroupEnrollmentStatus.ACTIVE,
                    'PENDING' as GroupEnrollmentStatus,
                  ],
                },
              },
            },
          },
        },
        teacher: { include: { user: { select: { id: true, fullName: true } } } },
      },
    });

    if (!group) throw new NotFoundException('Group not found');
    if (group._count.enrollments >= group.maxCapacity) {
      throw new BadRequestException('هذه المجموعة مكتملة العدد');
    }

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { id: true, fullName: true } } },
    });

    // Enforce single active enrollment: prevent student from reserving another group if already ACTIVE elsewhere
    const activeEnrollment = await this.prisma.groupEnrollment.findFirst({
      where: {
        studentId,
        status: GroupEnrollmentStatus.ACTIVE,
        groupId: { not: groupId },
      },
      include: { group: { select: { name: true } } },
    });

    if (activeEnrollment) {
      throw new BadRequestException(
        `أنت مسجل بالفعل في مجموعة نشطة (${activeEnrollment.group?.name || 'أخرى'}). لتغيير المجموعة يرجى التواصل مع المعلم لنقلك.`,
      );
    }

    // Enforce single pending reservation: prevent student from holding multiple pending spots
    const otherPendingEnrollment = await this.prisma.groupEnrollment.findFirst({
      where: {
        studentId,
        status: GroupEnrollmentStatus.PENDING,
        groupId: { not: groupId },
      },
      include: { group: { select: { name: true } } },
    });

    if (otherPendingEnrollment) {
      throw new BadRequestException(
        `لديك طلب حجز قيد الانتظار بالفعل في مجموعة (${otherPendingEnrollment.group?.name || 'أخرى'}). لا يمكن حجز أكثر من مجموعة في نفس الوقت.`,
      );
    }

    const existingEnrollment = await this.prisma.groupEnrollment.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });

    let enrollment;
    if (existingEnrollment) {
      if (existingEnrollment.status === ('PENDING' as GroupEnrollmentStatus)) {
        throw new BadRequestException('لديك حجز قيد الانتظار بالفعل في هذه المجموعة');
      }
      if (existingEnrollment.status === GroupEnrollmentStatus.ACTIVE) {
        throw new BadRequestException('أنت منضم بالفعل لهذه المجموعة');
      }

      // If DROPPED or TRANSFERRED, we can reactivate it as PENDING
      enrollment = await this.prisma.groupEnrollment.update({
        where: { id: existingEnrollment.id },
        data: { status: 'PENDING' as GroupEnrollmentStatus },
      });
    } else {
      enrollment = await this.prisma.groupEnrollment.create({
        data: {
          groupId,
          studentId,
          status: 'PENDING' as GroupEnrollmentStatus,
        },
      });
    }

    // Notify the group's teacher about the new join request
    const teacherUserId = group?.teacher?.user?.id;
    this.realtimeGateway.notifyReservationsChanged([teacherUserId]);

    if (teacherUserId) {
      const studentName = student?.user?.fullName || 'طالب';
      const groupName = group?.name || 'المجموعة';

      try {
        await this.notificationsService.sendNotification({
          recipientId: teacherUserId,
          type: 'TEACHER_JOIN_REQUEST',
          notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
          title: '🔔 طلب انضمام جديد',
          body: `طلب الطالب ${studentName} الانضمام إلى مجموعة ${groupName} بانتظار تأكيدك.`,
          channels: [NotificationChannel.WEB_PUSH, NotificationChannel.IN_APP],
          data: {
            url: '/teacher/reservations',
            enrollmentId: enrollment.id,
            studentName,
            groupName,
            groupId: group.id,
          },
          referenceEntityId: enrollment.id,
        });
        this.logger.log(
          `Dispatched join-request notification to teacher [${teacherUserId}] for student [${studentId}]`,
        );
      } catch (notifErr) {
        this.logger.error('Failed to notify teacher of join request', notifErr);
      }
    }

    return enrollment;
  }

  /**
   * Sends WhatsApp to the parent (or student as fallback) after a group-link enrollment.
   */
  async sendGroupLinkWhatsApp(
    studentId: string,
    groupId: string,
    partialStudent?: { user?: { fullName: string } | null } | null,
  ): Promise<void> {
    try {
      const [student, group] = await Promise.all([
        this.prisma.studentProfile.findUnique({
          where: { id: studentId },
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
            parentLinks: {
              take: 1,
              include: {
                parent: {
                  include: {
                    user: { select: { id: true, fullName: true, phone: true } },
                  },
                },
              },
            },
          },
        }),
        this.prisma.academicGroup.findUnique({
          where: { id: groupId },
          select: {
            name: true,
            teacher: {
              include: { user: { select: { fullName: true } } },
            },
          },
        }),
      ]);

      if (!student) return;

      const parentUser = student.parentLinks[0]?.parent?.user;
      const whatsappPhone =
        parentUser?.phone ||
        student.emergencyPhone ||
        student.user?.phone ||
        null;

      if (!whatsappPhone) {
        this.logger.warn(
          `[reserveGroup] No phone for WhatsApp to student ${student.user?.fullName} [${studentId}] — skipped`,
        );
        return;
      }

      const pendingCreds = student.pendingCredentials as {
        studentPassword?: string;
        parentPassword?: string;
        studentPhone?: string;
      } | null;

      const teacherName = (group as any)?.teacher?.user?.fullName;
      const centerName = teacherName
        ? `مجموعة الأستاذ ${teacherName}`
        : 'منصة الأوّل التعليمية';
      const studentName = student.user?.fullName || 'الطالب';
      const recipientId = parentUser?.id || student.user?.id;

      if (!recipientId) return;

      await this.notificationsService.sendNotification({
        recipientId,
        type: 'STUDENT_GROUP_LINK_ENROLLMENT',
        notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
        title: `📋 تم تسجيل طلب انضمام ${studentName} إلى ${group?.name || 'المجموعة'}`,
        body: `مرحباً، تم تسجيل طلب انضمام الطالب ${studentName} بنجاح وبانتظار الموافقة.`,
        channels: [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
        data: {
          studentId,
          studentName,
          studentPhoneOrCode:
            pendingCreds?.studentPhone ||
            student.user?.phone ||
            student.studentCode,
          studentPassword: pendingCreds?.studentPassword,
          parentPhone: whatsappPhone,
          parentPassword: pendingCreds?.parentPassword,
          parentName: parentUser?.fullName || studentName,
          groupName: group?.name,
          centerName,
          platformUrl:
            process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online',
          phone: whatsappPhone,
        },
      });

      this.logger.log(
        `📥 Group-link WhatsApp queued for student ${studentName} → ${whatsappPhone}`,
      );
    } catch (err) {
      this.logger.error(
        `sendGroupLinkWhatsApp error for student [${studentId}]`,
        err,
      );
    }
  }
}
