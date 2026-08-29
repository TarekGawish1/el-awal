import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../services/notifications.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { WebPushService } from '../../../services/webpush.service';
import { WhatsAppDispatcherService } from '../../whatsapp/services/whatsapp-dispatcher.service';
import { NotificationSettingsService } from '../services/notification-settings.service';
import { AttendanceStatus, NotificationChannel } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockWebPushService = {
    sendPush: jest.fn(),
    sendToUser: jest.fn().mockResolvedValue(1),
  };

  const mockWhatsAppDispatcher = {
    enqueueNotification: jest.fn(),
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
    }),
    isChannelAllowed: jest.fn().mockResolvedValue(true),
  };

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WebPushService, useValue: mockWebPushService },
        { provide: WhatsAppDispatcherService, useValue: mockWhatsAppDispatcher },
        { provide: NotificationSettingsService, useValue: mockNotificationSettings },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
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

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: 'parent-1',
            type: 'ABSENCE_ALERT_PARENT',
          }),
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

      // 1 notification for student + 1 for parent
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(2);
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
});

