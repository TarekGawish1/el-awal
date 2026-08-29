import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationChannel, NotificationType } from '@prisma/client';

export interface NotificationSystemSettings {
  isWhatsAppEnabled: boolean;
  isPushEnabled: boolean;
  isInAppEnabled: boolean;
  // Target Audience Master Switches
  teacherNotificationsEnabled: boolean;
  studentNotificationsEnabled: boolean;
  parentNotificationsEnabled: boolean;
  // Category Switches
  absenceAlertsEnabled: boolean;
  paymentAlertsEnabled: boolean;
  studentApprovalAlertsEnabled: boolean;
  examAlertsEnabled: boolean;
  teacherDailyScheduleEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSystemSettings = {
  isWhatsAppEnabled: true,
  isPushEnabled: true,
  isInAppEnabled: true,
  teacherNotificationsEnabled: true,
  studentNotificationsEnabled: true,
  parentNotificationsEnabled: true,
  absenceAlertsEnabled: true,
  paymentAlertsEnabled: true,
  studentApprovalAlertsEnabled: true,
  examAlertsEnabled: true,
  teacherDailyScheduleEnabled: true,
};

const SETTINGS_KEY = 'NOTIFICATION_SYSTEM_SETTINGS';

@Injectable()
export class NotificationSettingsService {
  private readonly logger = new Logger(NotificationSettingsService.name);
  private cachedSettings: NotificationSystemSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };
  private isLoaded = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves current global notification system settings with in-memory caching.
   */
  async getSettings(): Promise<NotificationSystemSettings> {
    if (this.isLoaded) {
      return { ...this.cachedSettings };
    }

    try {
      const record = await this.prisma.systemSetting.findUnique({
        where: { key: SETTINGS_KEY },
      });

      if (record && record.value && typeof record.value === 'object') {
        this.cachedSettings = {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...(record.value as unknown as Partial<NotificationSystemSettings>),
          updatedAt: record.updatedAt?.toISOString(),
        };
      } else {
        this.cachedSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };
      }
      this.isLoaded = true;
    } catch (err: any) {
      this.logger.warn(`Failed to read system settings from DB (${err.message}). Using memory defaults.`);
      this.cachedSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };
    }

    return { ...this.cachedSettings };
  }

  /**
   * Updates global notification settings (WhatsApp Master, Push Master, Category toggles).
   */
  async updateSettings(
    dto: Partial<NotificationSystemSettings>,
    updatedBy = 'Admin',
  ): Promise<NotificationSystemSettings> {
    const current = await this.getSettings();
    const updated: NotificationSystemSettings = {
      ...current,
      ...dto,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    // Update in-memory cache immediately
    this.cachedSettings = updated;
    this.isLoaded = true;

    try {
      await this.prisma.systemSetting.upsert({
        where: { key: SETTINGS_KEY },
        create: {
          key: SETTINGS_KEY,
          value: updated as any,
        },
        update: {
          value: updated as any,
        },
      });
      this.logger.log(
        `Notification settings updated by [${updatedBy}]: WhatsApp=${updated.isWhatsAppEnabled}, Push=${updated.isPushEnabled}, InApp=${updated.isInAppEnabled}`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to persist system settings to database (${err.message})`, err.stack);
    }

    return { ...this.cachedSettings };
  }

  /**
   * Checks whether a specific delivery channel is enabled given the notification type.
   */
  async isChannelAllowed(
    channel: NotificationChannel,
    notificationType?: NotificationType | string | null,
  ): Promise<boolean> {
    const settings = await this.getSettings();

    // ── Master Channel Switches ──
    if (channel === NotificationChannel.WHATSAPP && !settings.isWhatsAppEnabled) {
      return false;
    }
    if (channel === NotificationChannel.WEB_PUSH && !settings.isPushEnabled) {
      return false;
    }
    if (channel === NotificationChannel.IN_APP && !settings.isInAppEnabled) {
      return false;
    }

    // ── Granular Category Switches ──
    if (notificationType) {
      const typeStr = String(notificationType);
      if (
        (typeStr === NotificationType.ABSENCE_ALERT_PARENT || typeStr === 'STUDENT_ABSENCE') &&
        !settings.absenceAlertsEnabled
      ) {
        return false;
      }
      if (
        (typeStr === NotificationType.PAYMENT_RECEIVED_PARENT || typeStr === 'PAYMENT_RECEIVED') &&
        !settings.paymentAlertsEnabled
      ) {
        return false;
      }
      if (
        (typeStr === NotificationType.STUDENT_APPROVAL_CREDENTIALS || typeStr === 'STUDENT_REGISTRATION_CREDENTIALS') &&
        !settings.studentApprovalAlertsEnabled
      ) {
        return false;
      }
      if (
        (typeStr === NotificationType.ONLINE_EXAM_REMINDER ||
          typeStr === NotificationType.EXAM_FAILED_ALERT_PARENT ||
          typeStr === 'NEW_EXAM_PUBLISHED' ||
          typeStr === 'EXAM_DEADLINE_REMINDER') &&
        !settings.examAlertsEnabled
      ) {
        return false;
      }
      if (
        typeStr === NotificationType.TEACHER_DAILY_SCHEDULE &&
        !settings.teacherDailyScheduleEnabled
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks whether notifications are globally enabled for a specific recipient role.
   */
  async isRecipientRoleAllowed(role?: string): Promise<boolean> {
    const settings = await this.getSettings();
    if (role === 'TEACHER' && !settings.teacherNotificationsEnabled) {
      return false;
    }
    if (role === 'STUDENT' && !settings.studentNotificationsEnabled) {
      return false;
    }
    if (role === 'PARENT' && !settings.parentNotificationsEnabled) {
      return false;
    }
    return true;
  }
}

