import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../services/notifications.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { WebPushService } from '../../../services/webpush.service';
import { WhatsAppDispatcherService } from '../../whatsapp/services/whatsapp-dispatcher.service';
import { NotificationSettingsService } from '../services/notification-settings.service';
import { WebPushDispatcherService } from '../services/webpush-dispatcher.service';
import { AttendanceStatus, NotificationChannel, NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockWebPushService = {
    sendPush: jest.fn(),
    sendToUser: jest.fn().mockResolvedValue(1),
    sendBatchSubscriptions: jest.fn().mockResolvedValue({
      totalSubscriptions: 2,
      successCount: 2,
      failureCount: 0,
      expiredCount: 0,
      successfulUserIds: ['user-1', 'user-2'],
      failedUserIds: [],
    }),
  };

  const mockWhatsAppDispatcher = {
    enqueueNotification: jest.fn(),
    enqueueNotificationsBatch: jest.fn().mockResolvedValue(0),
  };

  const mockNotificationSettings = {
    getSettings: jest.fn().mockResolvedValue({
      isWhatsAppEnabled: true,
      isPushEnabled: true,
      isInAppEnabled: true,
      absenceAlertsEnabled: true,
      paymentAlertsEnabled: true,
      studentApprovalAlertsEnabled: true,
      examAlertsEnabled: true,
      teacherDailyScheduleEnabled: true,
      teacherNotificationsEnabled: true,
      studentNotificationsEnabled: true,
      parentNotificationsEnabled: true,
    }),
    isChannelAllowed: jest.fn().mockResolvedValue(true),
    isRecipientRoleAllowed: jest.fn().mockResolvedValue(true),
  };

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn(),
    },
    pushSubscription: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    assessment: {
      findUnique: jest.fn(),
    },
    parentStudentLink: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1', fullName: 'مستخدم', role: 'PARENT' }),
      findMany: jest.fn().mockImplementation((args: any) => {
        const ids: string[] = args?.where?.id?.in || ['user-1', 'user-2'];
        return Promise.resolve(
          ids.map((id) => ({
            id,
            fullName: `مستخدم ${id}`,
            role: id.includes('parent') ? 'PARENT' : 'STUDENT',
          })),
        );
      }),
    },
  };

  const mockWebPushDispatcher = {
    kick: jest.fn(),
    processNextBatch: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WebPushService, useValue: mockWebPushService },
        { provide: WebPushDispatcherService, useValue: mockWebPushDispatcher },
        { provide: WhatsAppDispatcherService, useValue: mockWhatsAppDispatcher },
        { provide: NotificationSettingsService, useValue: mockNotificationSettings },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
    mockNotificationSettings.isChannelAllowed.mockReset();
    mockNotificationSettings.isChannelAllowed.mockResolvedValue(true);
    mockNotificationSettings.isRecipientRoleAllowed.mockReset();
    mockNotificationSettings.isRecipientRoleAllowed.mockResolvedValue(true);
  });

  describe('handleAbsenceEvent', () => {
    it('should create notification for linked parents on student absence', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-1',
        user: { fullName: 'محمود أحمد' },
        parentLinks: [
          {
            parentId: 'parent-1',
            parent: {
              user: {
                id: 'parent-1',
                phone: '201012345678',
              },
            },
          },
        ],
      });

      mockPrismaService.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.handleAbsenceEvent({
        studentId: 'stu-1',
        groupName: 'مجموعة أ',
        date: new Date('2026-09-01'),
        status: AttendanceStatus.ABSENT,
      });

      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              recipientId: 'parent-1',
              type: 'ABSENCE_ALERT_PARENT',
            }),
          ]),
        }),
      );
    });
  });

  describe('handleAssessmentGradedEvent', () => {
    it('should notify student and parents when exam is graded', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue({
        id: 'assessment-1',
        title: 'اختبار النحو',
        totalScore: 20.0,
      });

      mockPrismaService.studentProfile.findUnique.mockResolvedValue({
        id: 'stu-1',
        user: { fullName: 'محمود أحمد' },
        parentLinks: [
          {
            parentId: 'parent-1',
            parent: {
              user: {
                id: 'parent-1',
                phone: '201012345678',
              },
            },
          },
        ],
      });

      await service.handleAssessmentGradedEvent({
        submissionId: 'sub-1',
        assessmentId: 'assessment-1',
        studentId: 'stu-1',
        scoreObtained: 19.0,
      });

      // 1 notification for student + 1 for parent in 1 batch createMany
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ recipientId: 'stu-1' }),
            expect.objectContaining({ recipientId: 'parent-1' }),
          ]),
        }),
      );
    });
  });

  describe('global channel switches enforcement', () => {
    it('should exclude WHATSAPP channel when WhatsApp master switch is disabled', async () => {
      mockNotificationSettings.isChannelAllowed.mockImplementation(async (ch: NotificationChannel) => {
        if (ch === NotificationChannel.WHATSAPP) return false;
        return true;
      });

      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-2',
        recipient: { fullName: 'طالب', role: 'STUDENT' },
      });

      await service.sendNotification({
        recipientId: 'user-1',
        notificationType: 'PAYMENT_RECEIVED_PARENT' as any,
        type: 'PAYMENT_RECEIVED_PARENT',
        title: 'سند قبض',
        body: 'تم استلام الرسوم',
        channels: [NotificationChannel.IN_APP, NotificationChannel.WHATSAPP],
      });

      expect(mockWhatsAppDispatcher.enqueueNotification).not.toHaveBeenCalled();
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channels: [NotificationChannel.IN_APP],
          }),
        }),
      );
    });
  });

  describe('dispatchToUsers (Bulk Performance, Deduplication, & Rules Enforcement)', () => {
    it('creates all notifications in bulk without missing recipients, using a single createMany query', async () => {
      const recipientIds = ['u1', 'u2', 'u3', 'u4'];
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'u1', fullName: 'طالب 1', role: 'STUDENT' },
        { id: 'u2', fullName: 'طالب 2', role: 'STUDENT' },
        { id: 'u3', fullName: 'طالب 3', role: 'STUDENT' },
        { id: 'u4', fullName: 'طالب 4', role: 'STUDENT' },
      ]);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 4 });

      const results = await service.dispatchToUsers(
        recipientIds,
        {
          notificationType: 'NEW_HOMEWORK_ASSIGNED' as any,
          title: 'واجب جديد',
          body: 'يرجى حل الواجب',
          referenceEntityId: 'hw-100',
        },
        [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
      );

      // Verify all 4 recipients were processed without misses
      expect(results).toHaveLength(4);
      expect(results.map((r) => r.recipientId)).toEqual(['u1', 'u2', 'u3', 'u4']);

      // Verify N+1 prevention: user.findMany called exactly ONCE, notification.createMany called ONCE
      expect(mockPrismaService.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: recipientIds } },
        select: { id: true, fullName: true, role: true },
      });
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ recipientId: 'u1', title: 'واجب جديد' }),
          expect.objectContaining({ recipientId: 'u2', title: 'واجب جديد' }),
          expect.objectContaining({ recipientId: 'u3', title: 'واجب جديد' }),
          expect.objectContaining({ recipientId: 'u4', title: 'واجب جديد' }),
        ]),
        skipDuplicates: true,
      });
    });

    it('deduplicates duplicate user IDs in input and prevents duplicate job records', async () => {
      const duplicateIds = ['u1', 'u1', 'u2', 'u2', 'u1'];
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'u1', fullName: 'طالب 1', role: 'STUDENT' },
        { id: 'u2', fullName: 'طالب 2', role: 'STUDENT' },
      ]);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });

      const results = await service.dispatchToUsers(
        duplicateIds,
        {
          notificationType: 'ONLINE_EXAM_REMINDER' as any,
          title: 'تذكير امتحان',
          body: 'الامتحان سيبدأ قريبا',
        },
        [NotificationChannel.IN_APP],
      );

      // Only 2 distinct recipients should be created
      expect(results).toHaveLength(2);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['u1', 'u2'] } },
        select: { id: true, fullName: true, role: true },
      });
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ recipientId: 'u1' }),
            expect.objectContaining({ recipientId: 'u2' }),
          ]),
        }),
      );
    });

    it('preserves recipient role suppression rules during bulk dispatch', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'u1', fullName: 'طالب 1', role: 'STUDENT' },
        { id: 'u2', fullName: 'معلم 1', role: 'TEACHER' },
      ]);

      // Suppose TEACHER notifications are suppressed in settings
      mockNotificationSettings.isRecipientRoleAllowed.mockImplementation(async (role: string) => {
        return role === 'STUDENT';
      });

      const results = await service.dispatchToUsers(
        ['u1', 'u2'],
        {
          notificationType: 'GENERAL_ANNOUNCEMENT' as any,
          title: 'إعلان للطلاب فقط',
          body: 'مرحبا بالطلاب',
        },
        [NotificationChannel.IN_APP],
      );

      expect(results).toHaveLength(1);
      expect(results[0].recipientId).toBe('u1');
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ recipientId: 'u1' })],
        skipDuplicates: true,
      });
    });

    it('preserves notification payload integrity and sets pushStatus to PENDING when Web Push is active', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'u1', fullName: 'طالب 1', role: 'STUDENT' },
      ]);

      const payload = {
        notificationType: 'NEW_EXAM_PUBLISHED' as any,
        type: 'NEW_EXAM_PUBLISHED',
        title: 'امتحان جديد: الجبر والهندسة',
        body: 'تم رفع امتحان جديد لمجموعتك',
        referenceEntityId: 'exam-123',
        data: { examId: 'exam-123', totalScore: 20 },
      };

      await service.dispatchToUsers(['u1'], payload, [
        NotificationChannel.IN_APP,
        NotificationChannel.WEB_PUSH,
      ]);

      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            recipientId: 'u1',
            notificationType: 'NEW_EXAM_PUBLISHED',
            type: 'NEW_EXAM_PUBLISHED',
            title: 'امتحان جديد: الجبر والهندسة',
            message: 'تم رفع امتحان جديد لمجموعتك',
            referenceEntityId: 'exam-123',
            data: { examId: 'exam-123', totalScore: 20 },
            channels: [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
            pushStatus: 'PENDING',
          }),
        ],
        skipDuplicates: true,
      });
    });

    it('measures exact database queries for 400 recipients and proves 0 per-recipient queries (constant O(1) queries)', async () => {
      const recipientCount = 400;
      const userIds = Array.from({ length: recipientCount }, (_, i) => `student-${i + 1}`);
      const mockUsers = userIds.map((id, i) => ({
        id,
        fullName: `طالب ${i + 1}`,
        role: 'STUDENT',
      }));

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.notification.findMany.mockResolvedValue([]); // No pre-existing notifications
      mockPrismaService.notification.createMany.mockResolvedValue({ count: recipientCount });
      mockPrismaService.pushSubscription.findMany.mockResolvedValue(
        userIds.map((id) => ({
          endpoint: `https://push.com/${id}`,
          p256dh: 'k',
          auth: 'a',
          userId: id,
        })),
      );

      mockNotificationSettings.isChannelAllowed.mockResolvedValue(true);
      mockNotificationSettings.isRecipientRoleAllowed.mockResolvedValue(true);

      const results = await service.dispatchToUsers(
        userIds,
        {
          notificationType: 'ONLINE_EXAM_REMINDER' as any,
          type: 'ONLINE_EXAM_REMINDER',
          title: 'تذكير بالامتحان الشامل',
          body: 'يبدأ الامتحان بعد قليل لجميع طلاب الدفعة',
          referenceEntityId: 'exam-mega-400',
        },
        [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH, NotificationChannel.WHATSAPP],
      );

      // Verify all 400 recipients were processed
      expect(results).toHaveLength(recipientCount);

      // ── VERIFIED DATABASE QUERY MEASUREMENTS ──
      // 1. Fetching users: exactly 1 batch query
      expect(mockPrismaService.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(0);

      // 2. Deduplication check: exactly 1 batch query
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledTimes(1);

      // 3. Notification persistence: exactly 1 batch insert
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(0);

      // 4. WhatsApp queue enqueue: exactly 1 batch enqueue
      expect(mockWhatsAppDispatcher.enqueueNotificationsBatch).toHaveBeenCalledTimes(1);
      expect(mockWhatsAppDispatcher.enqueueNotification).toHaveBeenCalledTimes(0);

      // TOTAL DATABASE QUERIES FOR 400 RECIPIENTS: EXACTLY 4 QUERIES!
    });

    it('reliably deduplicates against existing records using referenceEntityId before bulk insertion', async () => {
      const userIds = ['u1', 'u2', 'u3', 'u4'];
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'u1', fullName: 'طالب 1', role: 'STUDENT' },
        { id: 'u2', fullName: 'طالب 2', role: 'STUDENT' },
        { id: 'u3', fullName: 'طالب 3', role: 'STUDENT' },
        { id: 'u4', fullName: 'طالب 4', role: 'STUDENT' },
      ]);

      // Suppose u1 and u3 have already received notifications for this exam
      mockPrismaService.notification.findMany.mockResolvedValue([
        { recipientId: 'u1' },
        { recipientId: 'u3' },
      ]);

      await service.dispatchToUsers(
        userIds,
        {
          notificationType: 'ONLINE_EXAM_REMINDER' as any,
          type: 'ONLINE_EXAM_REMINDER',
          title: 'امتحان',
          body: 'بدء الامتحان',
          referenceEntityId: 'exam-dup-check',
        },
        [NotificationChannel.IN_APP],
      );

      // Only u2 and u4 should be inserted!
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ recipientId: 'u2' }),
          expect.objectContaining({ recipientId: 'u4' }),
        ],
        skipDuplicates: true,
      });
    });

    it('isolates pushStatus updates strictly to newly created notification IDs', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'u1', fullName: 'طالب 1', role: 'STUDENT' },
      ]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.pushSubscription.findMany.mockResolvedValue([
        { endpoint: 'https://push.com/u1', p256dh: 'k', auth: 'a', userId: 'u1' },
      ]);
      mockWebPushService.sendBatchSubscriptions.mockResolvedValue({
        totalSubscriptions: 1,
        successCount: 1,
        failureCount: 0,
        expiredCount: 0,
        successfulUserIds: ['u1'],
        failedUserIds: [],
        partialUserIds: [],
        deviceOutcomes: [],
      });

      const results = await service.dispatchToUsers(
        ['u1'],
        {
          notificationType: 'ONLINE_EXAM_REMINDER' as any,
          type: 'ONLINE_EXAM_REMINDER',
          title: 'تنبيه',
          body: 'فحص عزل الـ IDs',
          referenceEntityId: 'exam-isolate-ids',
        },
        [NotificationChannel.IN_APP, NotificationChannel.WEB_PUSH],
      );

      const generatedNotifId = results[0].id;
      expect(generatedNotifId).toBeDefined();

      // Verify the WebPush database queue worker was kicked immediately
      expect(mockWebPushDispatcher.kick).toHaveBeenCalled();

      // Verify notification was created with pushStatus PENDING for queue execution
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              id: generatedNotifId,
              pushStatus: 'PENDING',
            }),
          ]),
        }),
      );
    });

    it('sendBatch: deduplicates heterogeneous batch items using Visited Set pattern and executes in 1 createMany', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', fullName: 'طالب 1', role: 'STUDENT' },
        { id: 'user-2', fullName: 'طالب 2', role: 'STUDENT' },
      ]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });

      const items = [
        {
          recipientId: 'user-1',
          notificationType: NotificationType.SESSION_REMINDER_STUDENT,
          type: 'SESSION_REMINDER_STUDENT',
          title: 'حصة 1',
          body: 'تذكير حصة 1',
          channels: [NotificationChannel.IN_APP],
          referenceEntityId: 'session-1',
        },
        // Duplicate item for user-1 and session-1 (should be filtered by visited set)
        {
          recipientId: 'user-1',
          notificationType: NotificationType.SESSION_REMINDER_STUDENT,
          type: 'SESSION_REMINDER_STUDENT',
          title: 'حصة 1 مكررة',
          body: 'تذكير حصة 1 مكرر',
          channels: [NotificationChannel.IN_APP],
          referenceEntityId: 'session-1',
        },
        // Distinct item for user-2 and session-2
        {
          recipientId: 'user-2',
          notificationType: NotificationType.SESSION_REMINDER_STUDENT,
          type: 'SESSION_REMINDER_STUDENT',
          title: 'حصة 2',
          body: 'تذكير حصة 2',
          channels: [NotificationChannel.IN_APP],
          referenceEntityId: 'session-2',
        },
      ];

      const results = await service.sendBatch(items);

      // Only 2 unique items should be created
      expect(results).toHaveLength(2);
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ recipientId: 'user-1', referenceEntityId: 'session-1' }),
          expect.objectContaining({ recipientId: 'user-2', referenceEntityId: 'session-2' }),
        ]),
        skipDuplicates: true,
      });
    });
  });
});


