import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { NotificationChannel, NotificationType, UserRole } from '@prisma/client';

@Injectable()
export class ContactMessagesService {
  private readonly logger = new Logger(ContactMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(createDto: { name: string; phone: string; message: string }) {
    const contactMessage = await this.prisma.contactMessage.create({
      data: createDto,
    });

    try {
      // Find all active teachers and secretariat staff to notify
      const staffMembers = await this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] },
          isActive: true,
        },
        select: { id: true, fullName: true },
      });

      const staffIds = staffMembers.map((s) => s.id);

      // 1. Emit realtime socket signal so sidebar counter badge updates instantly
      this.realtimeGateway.notifyInquiriesChanged(staffIds);

      // 2. Dispatch in-app notification and Web Push notification to each teacher/assistant
      const snippet =
        createDto.message.length > 100
          ? `${createDto.message.substring(0, 100)}...`
          : createDto.message;

      for (const staff of staffMembers) {
        try {
          await this.notificationsService.sendNotification({
            recipientId: staff.id,
            type: 'WEBSITE_INQUIRY',
            notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
            title: `📩 رسالة جديدة من الموقع: ${createDto.name}`,
            body: snippet,
            channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
            data: {
              url: '/teacher/inquiries',
              inquiryId: contactMessage.id,
              senderName: createDto.name,
              senderPhone: createDto.phone,
            },
          });
        } catch (notifErr) {
          this.logger.warn(
            `Failed to send inquiry notification to user [${staff.id}]`,
            notifErr,
          );
        }
      }
    } catch (err) {
      this.logger.error('Error broadcasting website inquiry notifications:', err);
    }

    return contactMessage;
  }

  async findAll() {
    return this.prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    const updated = await this.prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });

    try {
      const staffMembers = await this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] },
          isActive: true,
        },
        select: { id: true },
      });
      this.realtimeGateway.notifyInquiriesChanged(staffMembers.map((s) => s.id));
    } catch (err) {
      this.logger.warn('Failed to notify staff of inquiry markAsRead update', err);
    }

    return updated;
  }

  async delete(id: string) {
    const deleted = await this.prisma.contactMessage.delete({
      where: { id },
    });

    try {
      const staffMembers = await this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] },
          isActive: true,
        },
        select: { id: true },
      });
      this.realtimeGateway.notifyInquiriesChanged(staffMembers.map((s) => s.id));
    } catch (err) {
      this.logger.warn('Failed to notify staff of inquiry delete update', err);
    }

    return deleted;
  }
}
