import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';

export interface CreateNotificationDto {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  referenceEntityId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        recipientId: dto.recipientId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        referenceEntityId: dto.referenceEntityId,
      },
    });
  }

  async getUnreadNotifications(recipientId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, recipientId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, recipientId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Asynchronous decoupled domain event listener
   */
  @OnEvent('student.absence.recorded', { async: true })
  async handleStudentAbsenceEvent(payload: { studentId: string; groupName: string; date: Date }) {
    this.logger.log(`Handling asynchronous absence event for student [${payload.studentId}]`);
    // Find guardians linked to student and send alerts
    const links = await this.prisma.parentStudentLink.findMany({
      where: { studentId: payload.studentId },
      include: { parent: true },
    });

    for (const link of links) {
      await this.createNotification({
        recipientId: link.parent.id,
        type: 'STUDENT_ABSENCE',
        title: 'تنبيه غياب الطالب',
        message: `تم تسجيل غياب الطالب في حصة ${payload.groupName} بتاريخ ${payload.date.toISOString().split('T')[0]}`,
        referenceEntityId: payload.studentId,
      });
    }
  }
}
