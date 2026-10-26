import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { WhatsAppStatus, NotificationStatus, UserRole } from '@prisma/client';
import { CleanupJobsService } from '../../../jobs/cleanup-jobs.service';
import { WhatsAppQueueManagerService } from '../../whatsapp/services/whatsapp-queue-manager.service';
import {
  formatStudentApprovalMessage,
  formatStudentRegistrationMessage,
} from '../../../utils/spintax-auth';
import {
  formatResetStudentPasswordMessage,
  formatResetParentPasswordMessage,
} from '../../students/helpers/student-credentials-message.helper';
import {
  redactCredentialMessageBody,
  hasUnredactedCredentials,
  isMessageBodyRedacted,
  redactNotificationData,
  removePassFromUrl,
  REDACTED_PASSWORD_PLACEHOLDER,
} from '../../whatsapp/services/whatsapp-credential-redactor.util';

describe('Phase 2D.2: Secure Stored Credentials Without Breaking WhatsApp Delivery', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. WhatsApp Message Outbound Generation — Credentials & URLs
  // ──────────────────────────────────────────────────────────────────────────
  describe('Outbound WhatsApp Message Formatting & URL Sanitization', () => {
    it('PRESERVES student and parent passwords in outbound message body for delivery', () => {
      const msg = formatStudentApprovalMessage({
        studentName: 'أحمد محمود',
        studentPhoneOrCode: '01011112222',
        studentPassword: 'StudentSecret123!',
        parentName: 'محمود عبد الله',
        parentPhoneOrCode: '01033334444',
        parentPassword: 'ParentSecret456!',
        centerName: 'منصة الأول للرياضيات',
        groupName: 'مجموعة الثانوية العامة',
      });

      // Passwords MUST be present in outbound WhatsApp text
      expect(msg).toContain('StudentSecret123!');
      expect(msg).toContain('ParentSecret456!');
      // Phone numbers and names must be present
      expect(msg).toContain('01011112222');
      expect(msg).toContain('01033334444');
      expect(msg).toContain('أحمد محمود');

      // Parent direct access link MUST contain phone and pass for 1-click login
      expect(msg).toContain('/parent-access?phone=');
      expect(msg).toContain('pass=ParentSecret456!');
    });

    it('PRESERVES credentials in formatStudentRegistrationMessage with direct access link', () => {
      const msg = formatStudentRegistrationMessage({
        studentName: 'سارة علي',
        studentPhoneOrCode: '01055556666',
        studentPassword: 'SaraPass789!',
        parentName: 'علي إبراهيم',
        parentPhoneOrCode: '01077778888',
        parentPassword: 'ParentPass999!',
        centerName: 'منصة الأول للرياضيات',
      });

      expect(msg).toContain('SaraPass789!');
      expect(msg).toContain('ParentPass999!');
      expect(msg).toContain('/parent-access?phone=');
      expect(msg).toContain('pass=ParentPass999!');
    });

    it('PRESERVES password in password-reset messages with directLoginUrl', () => {
      const directLoginUrl = 'https://al-awal.online/parent-access?phone=01033334444&pass=FreshParentPass2!';
      const studentMsg = formatResetStudentPasswordMessage({
        parentName: 'محمود',
        studentName: 'أحمد',
        studentCode: 'STU-100',
        teacherName: 'أ. أحمد غريب',
        studentPhone: '01011112222',
        newPassword: 'FreshStudentPass1!',
      });
      expect(studentMsg).toContain('FreshStudentPass1!');
      expect(studentMsg).not.toMatch(/[?&]pass=/);

      const parentMsg = formatResetParentPasswordMessage({
        parentName: 'محمود',
        studentName: 'أحمد',
        studentCode: 'STU-100',
        teacherName: 'أ. أحمد غريب',
        parentPhone: '01033334444',
        newPassword: 'FreshParentPass2!',
        directLoginUrl,
      });
      expect(parentMsg).toContain('FreshParentPass2!');
      expect(parentMsg).toContain(directLoginUrl);
    });

    it('removePassFromUrl strips pass query param while preserving other params', () => {
      expect(
        removePassFromUrl('https://al-awal.online/parent-access?phone=01033334444&pass=Secret123'),
      ).toBe('https://al-awal.online/parent-access?phone=01033334444');

      expect(
        removePassFromUrl('https://al-awal.online/parent-access?pass=Secret123&phone=01033334444'),
      ).toBe('https://al-awal.online/parent-access?phone=01033334444');

      expect(
        removePassFromUrl('https://al-awal.online/parent-access?pass=Secret123'),
      ).toBe('https://al-awal.online/parent-access');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Redaction Utility Functions
  // ──────────────────────────────────────────────────────────────────────────
  describe('Redaction Utility Functions', () => {
    it('correctly identifies unredacted credentials in message bodies', () => {
      const unredactedMsg = `
📌 *بيانات دخول الطالب:*
- اسم المستخدم / الهاتف: \`01011112222\`
- كلمة المرور: \`StudentPass123!\`
🔗 رابط دخول الطالب: https://al-awal.online/login

📌 *بيانات حساب ولي الأمر:*
- رقم هاتف الحساب: \`01033334444\`
- كلمة المرور: \`ParentPass456!\`
      `;
      expect(hasUnredactedCredentials(unredactedMsg)).toBe(true);
      expect(isMessageBodyRedacted(unredactedMsg)).toBe(false);

      const redacted = redactCredentialMessageBody(unredactedMsg);
      expect(redacted).not.toContain('StudentPass123!');
      expect(redacted).not.toContain('ParentPass456!');
      expect(redacted).toContain(`- كلمة المرور: \`${REDACTED_PASSWORD_PLACEHOLDER}\``);
      expect(hasUnredactedCredentials(redacted)).toBe(false);
      expect(isMessageBodyRedacted(redacted)).toBe(true);
    });

    it('redacts bullet-style credentials generated by password reset or group registration', () => {
      const bulletMsg = `
👤 *بيانات حساب الطالب:*
▫️ *كود الطالب:* STU-123
▫️ *رقم الدخول:* 01011112222
▫️ *كلمة المرور:* RawPass123
🔗 *رابط منصة الطالب:* https://al-awal.online/login

👨‍👩‍👦 *بيانات حساب ولي الأمر (لمتابعة الحضور والدرجات والغياب):*
▫️ *رقم الدخول:* 01098765432
▫️ *كلمة مرور ولي الأمر:* ParentPassSecret
🔗 *رابط بوابة ولي الأمر:* https://al-awal.online/parent-access?phone=01098765432&pass=ParentPassSecret
      `;

      expect(hasUnredactedCredentials(bulletMsg)).toBe(true);
      const redacted = redactCredentialMessageBody(bulletMsg);

      expect(redacted).not.toContain('RawPass123');
      expect(redacted).not.toContain('ParentPassSecret');
      expect(redacted).toContain(`▫️ *كلمة المرور:* ${REDACTED_PASSWORD_PLACEHOLDER}`);
      expect(redacted).toContain(`▫️ *كلمة مرور ولي الأمر:* ${REDACTED_PASSWORD_PLACEHOLDER}`);
      expect(redacted).not.toContain('pass=');
      expect(redacted).toContain('https://al-awal.online/parent-access?phone=01098765432');
      expect(hasUnredactedCredentials(redacted)).toBe(false);
    });

    it('redactNotificationData safely strips studentPassword and parentPassword JSON fields', () => {
      const rawData = {
        phone: '01033334444',
        studentName: 'أحمد',
        studentPassword: 'StudentSecret123!',
        parentPassword: 'ParentSecret456!',
        directLoginUrl: 'https://al-awal.online/parent-access?phone=01033334444&pass=ParentSecret456!',
      };

      const sanitized = redactNotificationData(rawData);
      expect(sanitized).toBeDefined();
      expect(sanitized!.studentPassword).toBeUndefined();
      expect(sanitized!.parentPassword).toBeUndefined();
      expect(sanitized!.phone).toBe('01033334444');
      expect(sanitized!.studentName).toBe('أحمد');
      expect(sanitized!.directLoginUrl).toBe('https://al-awal.online/parent-access?phone=01033334444');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Queue & Worker Protection: Queued & Sending Messages Must NEVER Lose Payload
  // ──────────────────────────────────────────────────────────────────────────
  describe('Worker & Queue Protection Lifecycle', () => {
    let mockPrisma: any;
    let cleanupService: CleanupJobsService;

    const queuedMessage = {
      id: 'msg-queued-1',
      status: WhatsAppStatus.QUEUED,
      messageBody: `📌 *بيانات دخول الطالب:*
- اسم المستخدم / الهاتف: \`01011112222\`
- كلمة المرور: \`SecretPassQueued1!\``,
      failureReason: null,
      updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    };

    const sendingMessage = {
      id: 'msg-sending-2',
      status: WhatsAppStatus.SENDING,
      messageBody: `📌 *بيانات دخول الطالب:*
- اسم المستخدم / الهاتف: \`01011112222\`
- كلمة المرور: \`SecretPassSending2!\``,
      failureReason: null,
      updatedAt: new Date(Date.now() - 5 * 1000), // 5 seconds ago
    };

    beforeEach(() => {
      mockPrisma = {
        whatsAppMessageLog: {
          findMany: vi.fn(),
          update: vi.fn(),
        },
        notification: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
      };
      cleanupService = new CleanupJobsService(undefined, mockPrisma);
    });

    it('NEVER selects or redacts QUEUED or SENDING messages during cleanup', async () => {
      // The cleanup query specifies status: DELIVERED, SENT (<= 48h), or FAILED/PERMANENT_FAIL (<= 7d).
      // If only QUEUED and SENDING messages exist, findMany returns empty array.
      mockPrisma.whatsAppMessageLog.findMany.mockImplementation(({ where }: any) => {
        // Verify predicate does NOT contain QUEUED or SENDING
        const statusesInPredicate = where.OR.flatMap((cond: any) =>
          cond.status?.in || cond.status ? [cond.status] : [],
        );
        expect(statusesInPredicate).not.toContain(WhatsAppStatus.QUEUED);
        expect(statusesInPredicate).not.toContain(WhatsAppStatus.SENDING);

        return Promise.resolve([]);
      });

      const result = await cleanupService.cleanupDeliveredCredentialMessages();

      expect(result.redactedWhatsAppLogsCount).toBe(0);
      expect(mockPrisma.whatsAppMessageLog.update).not.toHaveBeenCalled();
      // Payload remains fully intact
      expect(queuedMessage.messageBody).toContain('SecretPassQueued1!');
      expect(sendingMessage.messageBody).toContain('SecretPassSending2!');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Confirmed Delivery Redaction (DELIVERED vs SENT)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Confirmed Delivery Redaction', () => {
    it('redacts stored copy in whatsAppMessageLog when markDelivered() is called', async () => {
      let storedLog = {
        id: 'msg-delivered-1',
        providerMessageId: 'prov-msg-999',
        status: WhatsAppStatus.SENT,
        messageBody: `📌 *بيانات دخول الطالب:*
- اسم المستخدم / الهاتف: \`01011112222\`
- كلمة المرور: \`DeliveredPass123!\`
🔗 رابط دخول الطالب: https://al-awal.online/login`,
        deliveredAt: null as Date | null,
      };

      const mockPrisma = {
        whatsAppMessageLog: {
          findMany: vi.fn().mockImplementation(({ where }: any) => {
            if (where.providerMessageId === 'prov-msg-999' && where.status === WhatsAppStatus.SENT) {
              return Promise.resolve([storedLog]);
            }
            return Promise.resolve([]);
          }),
          update: vi.fn().mockImplementation(({ where, data }: any) => {
            if (where.id === storedLog.id) {
              storedLog = { ...storedLog, ...data };
              return Promise.resolve(storedLog);
            }
            return Promise.resolve({});
          }),
        },
      };

      const queueManager = new WhatsAppQueueManagerService(mockPrisma as any);
      await queueManager.markDelivered('prov-msg-999');

      expect(storedLog.status).toBe(WhatsAppStatus.DELIVERED);
      expect(storedLog.deliveredAt).toBeInstanceOf(Date);
      // Secret MUST be redacted from the stored database copy
      expect(storedLog.messageBody).not.toContain('DeliveredPass123!');
      expect(storedLog.messageBody).toContain(`- كلمة المرور: \`${REDACTED_PASSWORD_PLACEHOLDER}\``);
      // Non-sensitive structure preserved
      expect(storedLog.messageBody).toContain('01011112222');
      expect(storedLog.messageBody).toContain('https://al-awal.online/login');
    });

    it('redacts SENT messages older than 48 hours when delivery ACK is never received', async () => {
      const now = new Date('2026-10-25T12:00:00Z');
      const sent72hAgo = {
        id: 'msg-sent-old',
        status: WhatsAppStatus.SENT,
        sentAt: new Date('2026-10-22T10:00:00Z'), // 74 hours ago
        messageBody: `📌 *بيانات دخول الطالب:*
- كلمة المرور: \`LegacySentPass!\``,
        failureReason: null,
      };

      const mockPrisma = {
        whatsAppMessageLog: {
          findMany: vi.fn().mockResolvedValue([sent72hAgo]),
          update: vi.fn().mockImplementation(({ where, data }: any) => {
            Object.assign(sent72hAgo, data);
            return Promise.resolve(sent72hAgo);
          }),
        },
        notification: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
      };

      const cleanupService = new CleanupJobsService(undefined, mockPrisma as any);
      const res = await cleanupService.cleanupDeliveredCredentialMessages(now);

      expect(res.redactedWhatsAppLogsCount).toBe(1);
      expect(sent72hAgo.messageBody).not.toContain('LegacySentPass!');
      expect(sent72hAgo.messageBody).toContain(REDACTED_PASSWORD_PLACEHOLDER);
    });

    it('PRESERVES recently SENT messages within 48h to allow delivery receipts to arrive', async () => {
      const now = new Date('2026-10-25T12:00:00Z');
      // findMany should not return this record because sentAt is within 48h
      const mockPrisma = {
        whatsAppMessageLog: {
          findMany: vi.fn().mockImplementation(({ where }: any) => {
            const sentCond = where.OR.find((c: any) => c.status === WhatsAppStatus.SENT);
            const cutoff = sentCond?.sentAt?.lte;
            // Message sent 2 hours ago: sentAt > cutoff, so not matched
            const recentSent = new Date('2026-10-25T10:00:00Z');
            if (recentSent <= cutoff) return Promise.resolve([{ id: 'recent' }]);
            return Promise.resolve([]);
          }),
          update: vi.fn(),
        },
        notification: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
      };

      const cleanupService = new CleanupJobsService(undefined, mockPrisma as any);
      const res = await cleanupService.cleanupDeliveredCredentialMessages(now);

      expect(res.redactedWhatsAppLogsCount).toBe(0);
      expect(mockPrisma.whatsAppMessageLog.update).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Failed Messages & 7-Day Operational Retention Window
  // ──────────────────────────────────────────────────────────────────────────
  describe('Failed Messages & 7-Day Retention Window', () => {
    let activeFailedLog: any;
    let expiredFailedLog: any;
    let mockPrisma: any;

    beforeEach(() => {
      activeFailedLog = {
        id: 'msg-failed-active',
        status: WhatsAppStatus.FAILED,
        retryCount: 1,
        maxRetries: 3,
        updatedAt: new Date('2026-10-24T12:00:00Z'), // 1 day ago
        messageBody: `📌 *بيانات دخول الطالب:*
- كلمة المرور: \`ActiveRetrySecretPass1!\``,
        failureReason: 'Socket connection dropped',
      };

      expiredFailedLog = {
        id: 'msg-failed-expired',
        status: WhatsAppStatus.PERMANENT_FAIL,
        retryCount: 3,
        maxRetries: 3,
        updatedAt: new Date('2026-10-15T12:00:00Z'), // 10 days ago (> 7 days)
        messageBody: `📌 *بيانات دخول الطالب:*
- كلمة المرور: \`ExpiredFailSecretPass2!\``,
        failureReason: 'Recipient phone is not registered on WhatsApp',
      };

      mockPrisma = {
        whatsAppMessageLog: {
          findMany: vi.fn().mockImplementation(({ where }: any) => {
            const results = [];
            const failCond = where.OR.find((c: any) => c.status?.in);
            const cutoff = failCond?.updatedAt?.lte;

            if (activeFailedLog.updatedAt <= cutoff) results.push(activeFailedLog);
            if (expiredFailedLog.updatedAt <= cutoff) results.push(expiredFailedLog);
            return Promise.resolve(results);
          }),
          findUnique: vi.fn().mockImplementation(({ where }: any) => {
            if (where.id === activeFailedLog.id) return Promise.resolve(activeFailedLog);
            if (where.id === expiredFailedLog.id) return Promise.resolve(expiredFailedLog);
            return Promise.resolve(null);
          }),
          update: vi.fn().mockImplementation(({ where, data }: any) => {
            if (where.id === activeFailedLog.id) Object.assign(activeFailedLog, data);
            if (where.id === expiredFailedLog.id) Object.assign(expiredFailedLog, data);
            return Promise.resolve(data);
          }),
          updateMany: vi.fn().mockImplementation(({ where, data }: any) => {
            let count = 0;
            // Check NOT messageBody contains REDACTED_PASSWORD_PLACEHOLDER
            if (!activeFailedLog.messageBody.includes(REDACTED_PASSWORD_PLACEHOLDER)) {
              Object.assign(activeFailedLog, data);
              count++;
            }
            if (!expiredFailedLog.messageBody.includes(REDACTED_PASSWORD_PLACEHOLDER)) {
              Object.assign(expiredFailedLog, data);
              count++;
            }
            return Promise.resolve({ count });
          }),
        },
        notification: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
      };
    });

    it('PRESERVES payload for active failed messages within 7-day retention window', async () => {
      const cleanupService = new CleanupJobsService(undefined, mockPrisma);
      const now = new Date('2026-10-25T12:00:00Z');

      const res = await cleanupService.cleanupDeliveredCredentialMessages(now);

      // Only the expired message (> 7 days) should be redacted
      expect(res.redactedWhatsAppLogsCount).toBe(1);
      // Active failed message payload is 100% preserved
      expect(activeFailedLog.messageBody).toContain('ActiveRetrySecretPass1!');
      // Expired failed message is redacted
      expect(expiredFailedLog.messageBody).not.toContain('ExpiredFailSecretPass2!');
      expect(expiredFailedLog.messageBody).toContain(REDACTED_PASSWORD_PLACEHOLDER);
      expect(expiredFailedLog.failureReason).toContain('تم مسح البيانات السرية لانتهاء فترة الاحتفاظ 7 أيام');
    });

    it('ALLOWS manual retry for active failed messages before redaction', async () => {
      const queueManager = new WhatsAppQueueManagerService(mockPrisma);
      const onTrigger = vi.fn();

      const retried = await queueManager.retryMessage(activeFailedLog.id, onTrigger);

      expect(retried.status).toBe(WhatsAppStatus.QUEUED);
      expect(retried.retryCount).toBe(0);
      expect(activeFailedLog.messageBody).toContain('ActiveRetrySecretPass1!');
      expect(onTrigger).toHaveBeenCalled();
    });

    it('BLOCKS retry for redacted messages and directs staff to password reset', async () => {
      // First, redact the expired message
      const cleanupService = new CleanupJobsService(undefined, mockPrisma);
      await cleanupService.cleanupDeliveredCredentialMessages(new Date('2026-10-25T12:00:00Z'));

      const queueManager = new WhatsAppQueueManagerService(mockPrisma);

      // Attempting to retry a redacted message MUST throw BadRequestException
      await expect(queueManager.retryMessage(expiredFailedLog.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(queueManager.retryMessage(expiredFailedLog.id)).rejects.toThrow(
        /تم مسحها بأمان بعد انتهاء فترة الاحتفاظ.*إصدار كلمة مرور جديدة/,
      );
    });

    it('retryAllFailed() skips already-redacted messages and only retries active ones', async () => {
      const cleanupService = new CleanupJobsService(undefined, mockPrisma);
      await cleanupService.cleanupDeliveredCredentialMessages(new Date('2026-10-25T12:00:00Z'));

      const queueManager = new WhatsAppQueueManagerService(mockPrisma);
      const result = await queueManager.retryAllFailed();

      // Only the 1 active failed message was retried
      expect(result.count).toBe(1);
      expect(activeFailedLog.status).toBe(WhatsAppStatus.QUEUED);
      expect(expiredFailedLog.status).toBe(WhatsAppStatus.PERMANENT_FAIL); // untouched
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Notification Record Sanitization & In-App Feed Preservation
  // ──────────────────────────────────────────────────────────────────────────
  describe('Notification Records Retention & In-App UI Preservation', () => {
    let mockPrisma: any;
    let storedNotification: any;

    beforeEach(() => {
      storedNotification = {
        id: 'notif-approval-1',
        recipientId: 'user-parent-1',
        type: 'STUDENT_APPROVAL_CREDENTIALS',
        title: '🎉 تمت الموافقة على قبول الطالب أحمد',
        message: `📌 *بيانات دخول الطالب:*
- اسم المستخدم / الهاتف: \`01011112222\`
- كلمة المرور: \`PlainSecretNotifPass1!\`
🔗 رابط دخول الطالب: https://al-awal.online/login`,
        data: {
          phone: '01033334444',
          studentName: 'أحمد',
          studentPassword: 'PlainSecretNotifPass1!',
          parentPassword: 'PlainParentNotifPass2!',
          directLoginUrl: 'https://al-awal.online/parent-access?phone=01033334444&pass=PlainParentNotifPass2!',
        },
        isRead: false,
        whatsappStatus: NotificationStatus.SENT,
        createdAt: new Date('2026-10-24T10:00:00Z'),
      };

      mockPrisma = {
        whatsAppMessageLog: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
        notification: {
          findMany: vi.fn().mockResolvedValue([storedNotification]),
          update: vi.fn().mockImplementation(({ where, data }: any) => {
            Object.assign(storedNotification, data);
            return Promise.resolve(storedNotification);
          }),
        },
      };
    });

    it('redacts plaintext passwords in notifications.message and notifications.data', async () => {
      const cleanupService = new CleanupJobsService(undefined, mockPrisma);
      const res = await cleanupService.cleanupDeliveredCredentialMessages();

      expect(res.redactedNotificationsCount).toBe(1);

      // 1. Password must be redacted in message text
      expect(storedNotification.message).not.toContain('PlainSecretNotifPass1!');
      expect(storedNotification.message).toContain(REDACTED_PASSWORD_PLACEHOLDER);

      // 2. Data payload must have passwords deleted
      expect(storedNotification.data.studentPassword).toBeUndefined();
      expect(storedNotification.data.parentPassword).toBeUndefined();
      expect(storedNotification.data.directLoginUrl).toBe('https://al-awal.online/parent-access?phone=01033334444');

      // 3. User experience and metadata MUST be completely preserved
      expect(storedNotification.id).toBe('notif-approval-1');
      expect(storedNotification.title).toBe('🎉 تمت الموافقة على قبول الطالب أحمد');
      expect(storedNotification.isRead).toBe(false); // Unread count intact!
      expect(storedNotification.data.studentName).toBe('أحمد');
      expect(storedNotification.data.phone).toBe('01033334444');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Idempotency & Concurrency Safety
  // ──────────────────────────────────────────────────────────────────────────
  describe('Idempotency & Concurrent Execution', () => {
    it('is strictly idempotent when executed repeatedly', async () => {
      const deliveredLog = {
        id: 'msg-deliv-repeat',
        status: WhatsAppStatus.DELIVERED,
        messageBody: `📌 *بيانات دخول الطالب:*
- كلمة المرور: \`SecretPassRepeat1!\``,
        failureReason: null,
      };

      const mockPrisma = {
        whatsAppMessageLog: {
          findMany: vi.fn().mockResolvedValue([deliveredLog]),
          update: vi.fn().mockImplementation(({ data }: any) => {
            Object.assign(deliveredLog, data);
            return Promise.resolve(deliveredLog);
          }),
        },
        notification: {
          findMany: vi.fn().mockResolvedValue([]),
          update: vi.fn(),
        },
      };

      const cleanupService = new CleanupJobsService(undefined, mockPrisma as any);

      // Run 1: Redacts the message
      const run1 = await cleanupService.cleanupDeliveredCredentialMessages();
      expect(run1.redactedWhatsAppLogsCount).toBe(1);
      expect(deliveredLog.messageBody).toContain(REDACTED_PASSWORD_PLACEHOLDER);

      // Run 2: Message already redacted -> 0 updates performed
      const run2 = await cleanupService.cleanupDeliveredCredentialMessages();
      expect(run2.redactedWhatsAppLogsCount).toBe(0);
      expect(mockPrisma.whatsAppMessageLog.update).toHaveBeenCalledTimes(1);
    });
  });
});
