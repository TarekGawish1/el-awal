import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { NotificationChannel, NotificationType, UserRole } from '@prisma/client';

export interface BanState {
  isBanned: boolean;
  banReason: string | null;
  bannedAt: Date | null;
}

@Injectable()
export class WhatsAppBanService {
  private readonly logger = new Logger(WhatsAppBanService.name);

  constructor(private readonly prisma: PrismaService) {}

  async loadBanState(): Promise<BanState> {
    try {
      const record = await this.prisma.systemSetting.findUnique({
        where: { key: 'WHATSAPP_BAN_STATE' },
      });
      if (record && record.value && typeof record.value === 'object') {
        const val = record.value as Record<string, unknown>;
        if (val.isBanned) {
          const banReason = typeof val.banReason === 'string' ? val.banReason : 'تم حظر الحساب من قِبل شركة واتساب';
          const bannedAt = typeof val.bannedAt === 'string' ? new Date(val.bannedAt) : new Date();
          this.logger.warn(`⚠️ Loaded persisted WhatsApp ban state: ${banReason}`);
          return { isBanned: true, banReason, bannedAt };
        }
      }
    } catch (err: any) {
      this.logger.debug(`Could not load ban state from DB: ${err?.message}`);
    }
    return { isBanned: false, banReason: null, bannedAt: null };
  }

  async saveBanState(banReason: string | null, bannedAt: Date | null): Promise<void> {
    try {
      await this.prisma.systemSetting.upsert({
        where: { key: 'WHATSAPP_BAN_STATE' },
        create: {
          key: 'WHATSAPP_BAN_STATE',
          value: {
            isBanned: true,
            banReason,
            bannedAt: bannedAt?.toISOString(),
          },
        },
        update: {
          value: {
            isBanned: true,
            banReason,
            bannedAt: bannedAt?.toISOString(),
          },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to persist ban state: ${err?.message}`);
    }
  }

  async clearBanState(): Promise<void> {
    try {
      await this.prisma.systemSetting.deleteMany({
        where: { key: 'WHATSAPP_BAN_STATE' },
      });
    } catch (err: any) {
      this.logger.debug(`Could not clear ban state from DB: ${err?.message}`);
    }
  }

  /**
   * Dispatches an in-app system notification to all teachers and administrative staff upon ban.
   */
  async notifyTeachersOfBan(connectedNumber?: string | null, banReason?: string | null, bannedAt?: Date | null): Promise<void> {
    try {
      const recentAlert = await this.prisma.notification.findFirst({
        where: {
          type: 'WHATSAPP_BAN_ALERT',
          createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
        },
      });

      if (recentAlert) {
        this.logger.log('Ban alert notification already dispatched recently; skipping duplicate dispatch.');
        return;
      }

      const staffUsers = await this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.TEACHER, UserRole.SECRETARIAT] },
          isActive: true,
        },
        select: { id: true, fullName: true, role: true },
      });

      if (!staffUsers.length) return;

      const title = '🚨 تنبيه عاجل: تم حظر رقم الواتساب المرتبط بالمنصة';
      const message =
        `نود إحاطتكم بأنه تم حظر رقم الواتساب (${connectedNumber || 'المرتبط بالمنصة'}) من قِبل شركة واتساب.\n\n` +
        `📌 سبب الحظر المحتمل: إرسال عدد كبير من الرسائل التلقائية في وقت متقارب لأرقام غير مسجلة في جهات اتصال الهاتف، أو قيام أحد المستلمين بالإبلاغ عن الرسائل (Spam).\n\n` +
        `⏳ مدة الحظر المتوقعة: يستمر الحظر المؤقت عادةً من 24 إلى 48 ساعة. في حالة الحظر الدائم، يلزم تقديم طلب مراجعة رسمي.\n\n` +
        `🛠️ الإجراء الموصى به:\n` +
        `1. فتح تطبيق واتساب على الهاتف والضغط على "طلب مراجعة" (Request a Review).\n` +
        `2. أو الدخول إلى "مركز التحكم في الإشعارات" وفك الارتباط وربط رقم هاتف جديد فوراً لضمان استمرار وصول الرسائل لأولياء الأمور.`;

      await this.prisma.notification.createMany({
        data: staffUsers.map((staff) => ({
          recipientId: staff.id,
          type: 'WHATSAPP_BAN_ALERT',
          notificationType: NotificationType.GENERAL_ANNOUNCEMENT,
          title,
          message,
          channels: [NotificationChannel.IN_APP],
          isRead: false,
          data: {
            isBanned: true,
            bannedAt: bannedAt?.toISOString(),
            reason: banReason,
          },
        })),
      });

      this.logger.log(`📢 Ban notifications sent to ${staffUsers.length} staff members.`);
    } catch (err) {
      this.logger.error('Failed to dispatch ban notifications to teachers', err);
    }
  }
}
