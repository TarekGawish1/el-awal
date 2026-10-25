import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { GroupEnrollmentStatus, UserRole, NotificationChannel, NotificationType } from '@prisma/client';
import { AuthenticatedUser } from '../../../core/security/decorators/current-user.decorator';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { RealtimeGateway } from '../../../realtime/realtime.gateway';
import { formatStudentApprovalMessage } from '../../../utils/spintax';
import { RedisCacheService } from '../../../core/cache/redis-cache.service';
import { GroupCrudService } from './group-crud.service';

@Injectable()
export class GroupReservationsService {
  private readonly logger = new Logger(GroupReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly groupCrudService: GroupCrudService,
    @Optional() private readonly redisCache?: RedisCacheService,
  ) {}

  /**
   * Retrieves all pending group reservations.
   * If teacherId is provided, filters for that teacher's groups only.
   */
  async getPendingReservations(user: AuthenticatedUser) {
    let teacherId = undefined;
    if (user.role === UserRole.TEACHER) {
      teacherId = user.teacherProfileId || user.id;
    } else if (user.role === UserRole.SECRETARIAT) {
      const link = await this.prisma.teacherAssistant.findFirst({
        where: { assistantId: user.id, status: 'ACTIVE' },
        select: { teacherId: true },
      });
      teacherId = link?.teacherId || undefined;
    }

    return this.prisma.groupEnrollment.findMany({
      where: {
        status: 'PENDING' as GroupEnrollmentStatus,
        ...(teacherId ? {
          group: {
            OR: [
              { teacherId: teacherId },
              { teacher: { id: teacherId } },
              { teacher: { user: { id: teacherId } } },
              ...(user.id !== teacherId ? [
                { teacherId: user.id },
                { teacher: { id: user.id } },
                { teacher: { user: { id: user.id } } },
              ] : []),
            ],
          },
        } : {}),
      },
      orderBy: { enrolledAt: 'desc' },
      include: {
        group: { select: { id: true, name: true, maxCapacity: true, gradeLevel: true, _count: { select: { enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } } } } } },
        student: {
          include: {
            user: { select: { fullName: true, phone: true } },
          },
        },
      },
    });
  }

  /**
   * Accepts a pending group reservation
   */
  async acceptReservation(enrollmentId: string, user: AuthenticatedUser, paymentStatus: 'PAID' | 'LATER' = 'LATER') {
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        group: {
          include: {
            _count: { select: { enrollments: { where: { status: GroupEnrollmentStatus.ACTIVE } } } },
            teacher: { include: { user: true } },
          },
        },
        student: {
          include: {
            user: true,
            parentLinks: {
              include: {
                parent: {
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment || enrollment.status !== ('PENDING' as GroupEnrollmentStatus)) {
      throw new NotFoundException('Pending reservation not found');
    }

    await this.groupCrudService.checkTeacherOwnership(enrollment.group, user);

    if (enrollment.group._count.enrollments >= enrollment.group.maxCapacity) {
      throw new BadRequestException('هذه المجموعة مكتملة العدد');
    }

    const otherActiveEnrollments = await this.prisma.groupEnrollment.findMany({
      where: {
        studentId: enrollment.studentId,
        status: GroupEnrollmentStatus.ACTIVE,
        groupId: { not: enrollment.groupId },
      },
      include: { group: { select: { name: true } } },
    });

    if (otherActiveEnrollments.length > 0) {
      const otherGroupNames = otherActiveEnrollments
        .map((e) => e.group?.name)
        .filter(Boolean)
        .join('، ');
      throw new ConflictException(
        `الطالب مسجّل بالفعل في مجموعة أخرى (${otherGroupNames}). يجب نقله أو إزالته من مجموعته الحالية قبل قبول هذا الحجز.`,
      );
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const updatedEnrollment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.groupEnrollment.update({
        where: { id: enrollmentId },
        data: { status: GroupEnrollmentStatus.ACTIVE },
      });

      if (tx.studentProfile?.update) {
        await tx.studentProfile.update({
          where: { id: enrollment.studentId },
          data: {
            createdByName: `طلب انضمام معتمد: ${enrollment.group.name}`,
            updatedById: user.id,
            updatedByName: user.fullName || (user.role === UserRole.SECRETARIAT ? 'المساعد' : 'المعلم'),
          },
        });
      }

      await tx.groupEnrollment.updateMany({
        where: {
          studentId: enrollment.studentId,
          status: GroupEnrollmentStatus.PENDING,
          id: { not: enrollmentId },
        },
        data: { status: GroupEnrollmentStatus.DROPPED },
      });

      const amount = enrollment.group.monthlyFee || 0;

      await tx.studentPaymentRecord.create({
        data: {
          studentId: enrollment.studentId,
          groupId: enrollment.groupId,
          periodYear: currentYear,
          periodMonth: currentMonth,
          amountExpected: amount,
          amountPaid: paymentStatus === 'PAID' ? amount : 0,
          paymentStatus: paymentStatus === 'PAID' ? ('PAID' as any) : ('PENDING' as any),
          paymentType: 'TUITION' as any,
          paymentMethod: 'CASH',
          recordedById: user.id,
          notes:
            paymentStatus === 'PAID'
              ? 'تم الدفع وقت تأكيد الانضمام عبر QR'
              : 'تم تأكيد الانضمام وسيتم الدفع لاحقاً',
        },
      });

      return updated;
    });

    try {
      const student = enrollment.student;
      const studentUser = student?.user;
      const parentLink = student?.parentLinks?.[0];
      const parentUser = parentLink?.parent?.user;

      const pendingCreds = student?.pendingCredentials as {
        studentPassword?: string;
        parentPassword?: string;
        studentPhone?: string;
        parentPhone?: string;
      } | null;

      const parentPhone =
        parentUser?.phone ||
        pendingCreds?.parentPhone ||
        (student as any)?.parentPhone ||
        student?.emergencyPhone ||
        undefined;

      const parentName = parentUser?.fullName || 'ولي الأمر المحترم';
      const studentName = studentUser?.fullName || 'الطالب';
      const studentPhoneOrCode =
        studentUser?.phone ||
        pendingCreds?.studentPhone ||
        student?.studentCode ||
        '';
      const groupName = enrollment.group?.name || '';
      const teacherName = enrollment.group?.teacher?.user?.fullName;
      const centerName = teacherName ? `مجموعة الأستاذ ${teacherName}` : 'منصة الأوّل التعليمية';
      const platformUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://al-awal.online/login';

      const studentPassword = pendingCreds?.studentPassword;
      const parentPassword = pendingCreds?.parentPassword;

      if (studentUser?.id) {
        await this.notificationsService.sendNotification({
          recipientId: studentUser.id,
          type: 'STUDENT_APPROVAL_CREDENTIALS',
          notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
          title: `تم تأكيد وقبول انضمامك إلى ${groupName || 'المجموعة'} 🎉`,
          body: `مرحباً ${studentName}، تم قبول طلب انضمامك بنجاح. يمكنك الآن متابعة الحصص، الامتحانات، والواجبات.`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
          data: {
            studentId: student.id,
            studentName,
            groupName,
            platformUrl,
          },
          referenceEntityId: student.id,
        });
      }

      const parentRecipientId = parentUser?.id || studentUser?.id;
      if (parentRecipientId) {
        const messageBody = formatStudentApprovalMessage({
          parentName,
          studentName,
          studentPhoneOrCode,
          studentPassword,
          parentPhoneOrCode: parentPhone || undefined,
          parentPassword,
          platformUrl,
          centerName,
          groupName,
        });

        const channels: NotificationChannel[] = [
          NotificationChannel.IN_APP,
          NotificationChannel.WEB_PUSH,
        ];
        const whatsappPhone = parentPhone || studentUser?.phone || null;
        if (whatsappPhone) {
          channels.push(NotificationChannel.WHATSAPP);
        } else {
          this.logger.warn(
            `No phone for WhatsApp to student ${studentName} [id=${student.id}] — IN_APP + WEB_PUSH only`,
          );
        }

        await this.notificationsService.sendNotification({
          recipientId: parentRecipientId,
          type: 'STUDENT_APPROVAL_CREDENTIALS',
          notificationType: NotificationType.STUDENT_APPROVAL_CREDENTIALS,
          title: `تم تأكيد وقبول انضمام الطالب ${studentName}`,
          body: messageBody,
          channels,
          data: {
            studentId: student.id,
            studentName,
            studentPhoneOrCode,
            studentPassword,
            parentPhone: whatsappPhone || undefined,
            parentPassword,
            parentName,
            groupName,
            centerName,
            platformUrl,
            phone: whatsappPhone || undefined,
          },
          referenceEntityId: student.id,
        });

        await this.prisma.studentProfile.update({
          where: { id: student.id },
          data: { pendingCredentials: null },
        });

        this.logger.log(
          `📩 Student approval notifications dispatched for ${studentName} (student push: ${studentUser?.id ? 'yes' : 'no'}, parent WhatsApp: ${parentPhone || 'none'})`,
        );
      }
    } catch (notifErr) {
      this.logger.error('Failed to dispatch student approval notification', notifErr);
    }

    this.realtimeGateway.notifyReservationsChanged([user.id]);

    if (this.redisCache) {
      await this.redisCache.delPattern('groups:*');
      await this.redisCache.delPattern(`student:dashboard:${enrollment.studentId}`);
      await this.redisCache.delPattern(`parent:overview:${enrollment.studentId}`);
    }

    return updatedEnrollment;
  }

  /**
   * Rejects a pending group reservation
   */
  async rejectReservation(enrollmentId: string, user: AuthenticatedUser) {
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { group: true },
    });

    if (!enrollment || enrollment.status !== ('PENDING' as GroupEnrollmentStatus)) {
      throw new NotFoundException('Pending reservation not found');
    }

    await this.groupCrudService.checkTeacherOwnership(enrollment.group, user);

    this.realtimeGateway.notifyReservationsChanged([user.id]);

    const deleted = await this.prisma.groupEnrollment.delete({
      where: { id: enrollmentId },
    });

    if (this.redisCache) {
      await this.redisCache.delPattern('groups:*');
      await this.redisCache.delPattern(`student:dashboard:${enrollment.studentId}`);
      await this.redisCache.delPattern(`parent:overview:${enrollment.studentId}`);
    }

    return deleted;
  }

  /**
   * Changes the target group for a pending reservation.
   */
  async changeReservationGroup(enrollmentId: string, newGroupId: string, user: AuthenticatedUser) {
    const enrollment = await this.prisma.groupEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { group: true },
    });

    if (!enrollment || enrollment.status !== ('PENDING' as GroupEnrollmentStatus)) {
      throw new NotFoundException('Pending reservation not found');
    }

    await this.groupCrudService.checkTeacherOwnership(enrollment.group, user);

    const newGroup = await this.prisma.academicGroup.findUnique({
      where: { id: newGroupId },
    });

    if (!newGroup) {
      throw new NotFoundException('Target group not found');
    }

    await this.groupCrudService.checkTeacherOwnership(newGroup, user);

    const updated = await this.prisma.groupEnrollment.update({
      where: { id: enrollmentId },
      data: { groupId: newGroupId },
    });

    if (this.redisCache) {
      await this.redisCache.delPattern('groups:*');
      await this.redisCache.delPattern(`student:dashboard:${enrollment.studentId}`);
      await this.redisCache.delPattern(`parent:overview:${enrollment.studentId}`);
    }

    return updated;
  }
}
