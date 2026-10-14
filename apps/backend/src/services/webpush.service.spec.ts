import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { WebPushService } from './webpush.service';
import { PrismaService } from '../core/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

describe('WebPushService — Bounded Concurrency & Batch Delivery', () => {
  let service: WebPushService;

  const mockPrismaService = {
    pushSubscription: {
      findMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn(),
    },
  };

  const mockConfigService = {
    get: vi.fn((key: string, defaultVal?: string) => {
      if (key === 'VAPID_PUBLIC_KEY') return 'test-public-key';
      if (key === 'VAPID_PRIVATE_KEY') return 'test-private-key';
      if (key === 'VAPID_SUBJECT') return 'mailto:admin@elawal.com';
      if (key === 'NEXT_PUBLIC_APP_URL') return 'https://elawal.app';
      return defaultVal;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebPushService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WebPushService>(WebPushService);
    service.onModuleInit();
  });

  describe('sendBatchSubscriptions concurrency bounding', () => {
    it('strictly enforces the concurrency limit and never exceeds it during delivery', async () => {
      const concurrencyLimit = 5;
      const totalSubscriptions = 25;
      let activeRequests = 0;
      let peakConcurrency = 0;

      // Mock webpush.sendNotification to simulate external network latency
      (webpush.sendNotification as any).mockImplementation(async () => {
        activeRequests++;
        if (activeRequests > peakConcurrency) {
          peakConcurrency = activeRequests;
        }
        // Small delay to simulate push gateway network round-trip
        await new Promise((resolve) => setTimeout(resolve, 20));
        activeRequests--;
        return { statusCode: 201 };
      });

      const subscriptions = Array.from({ length: totalSubscriptions }, (_, i) => ({
        endpoint: `https://push-service.example.com/sub-${i}`,
        p256dh: `p256dh-key-${i}`,
        auth: `auth-secret-${i}`,
        userId: `user-${i % 5}`,
      }));

      const result = await service.sendBatchSubscriptions(
        subscriptions,
        {
          title: 'تنبيه جماعي',
          body: 'رسالة اختبار للحد الأقصى للتزامن',
        },
        { concurrencyLimit },
      );

      // Verify peak concurrency never exceeded the configured limit of 5
      expect(peakConcurrency).toBeLessThanOrEqual(concurrencyLimit);
      expect(peakConcurrency).toBeGreaterThan(0);
      expect(result.totalSubscriptions).toBe(totalSubscriptions);
      expect(result.successCount).toBe(totalSubscriptions);
      expect(result.failureCount).toBe(0);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(totalSubscriptions);
    });

    it('prunes expired 404/410 subscriptions in a single batch query', async () => {
      const subscriptions = [
        { endpoint: 'https://push.com/active-1', p256dh: 'k1', auth: 'a1', userId: 'u1' },
        { endpoint: 'https://push.com/expired-404', p256dh: 'k2', auth: 'a2', userId: 'u2' },
        { endpoint: 'https://push.com/active-2', p256dh: 'k3', auth: 'a3', userId: 'u3' },
        { endpoint: 'https://push.com/expired-410', p256dh: 'k4', auth: 'a4', userId: 'u4' },
      ];

      (webpush.sendNotification as any).mockImplementation(async (sub: any) => {
        if (sub.endpoint.includes('expired-404')) {
          const err: any = new Error('Not Found');
          err.statusCode = 404;
          throw err;
        }
        if (sub.endpoint.includes('expired-410')) {
          const err: any = new Error('Gone');
          err.statusCode = 410;
          throw err;
        }
        return { statusCode: 201 };
      });

      const result = await service.sendBatchSubscriptions(subscriptions, {
        title: 'فحص الاشتراكات المنتهية',
        body: 'حذف الاشتراكات المنتهية في استعلام مجمع',
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(2);
      expect(result.expiredCount).toBe(2);
      expect(mockPrismaService.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          endpoint: {
            in: ['https://push.com/expired-404', 'https://push.com/expired-410'],
          },
        },
      });
    });

    it('handles empty subscription lists safely without errors', async () => {
      const result = await service.sendBatchSubscriptions([], {
        title: 'فارغ',
        body: 'لا توجد اشتراكات',
      });

      expect(result.totalSubscriptions).toBe(0);
      expect(result.successCount).toBe(0);
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendToUser reuse of batch delivery', () => {
    it('reuses sendBatchSubscriptions when delivering to a user', async () => {
      mockPrismaService.pushSubscription.findMany.mockResolvedValue([
        { endpoint: 'https://push.com/device-1', p256dh: 'k1', auth: 'a1', userId: 'user-1' },
        { endpoint: 'https://push.com/device-2', p256dh: 'k2', auth: 'a2', userId: 'user-1' },
      ]);

      (webpush.sendNotification as any).mockResolvedValue({ statusCode: 201 });

      const spy = vi.spyOn(service, 'sendBatchSubscriptions');

      const count = await service.sendToUser('user-1', {
        title: 'إشعار للمستخدم',
        body: 'مرحبا بك',
      });

      expect(count).toBe(2);
      expect(spy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ endpoint: 'https://push.com/device-1' }),
          expect.objectContaining({ endpoint: 'https://push.com/device-2' }),
        ]),
        expect.objectContaining({ title: 'إشعار للمستخدم' }),
        expect.objectContaining({ concurrencyLimit: 5 }),
      );
    });

    it('tracks multi-device users accurately with partial outcomes', async () => {
      const subscriptions = [
        { endpoint: 'https://push.com/u1-phone', p256dh: 'k1', auth: 'a1', userId: 'user-1' },
        { endpoint: 'https://push.com/u1-laptop', p256dh: 'k2', auth: 'a2', userId: 'user-1' },
        { endpoint: 'https://push.com/u2-tablet', p256dh: 'k3', auth: 'a3', userId: 'user-2' },
        { endpoint: 'https://push.com/u3-desktop', p256dh: 'k4', auth: 'a4', userId: 'user-3' },
      ];

      (webpush.sendNotification as any).mockImplementation(async (sub: any) => {
        if (sub.endpoint.includes('u1-laptop') || sub.endpoint.includes('u3-desktop')) {
          const err: any = new Error('Connection refused');
          err.statusCode = 500;
          throw err;
        }
        return { statusCode: 201 };
      });

      const result = await service.sendBatchSubscriptions(subscriptions, {
        title: 'متعدد الأجهزة',
        body: 'فحص التتبع الدقيق للأجهزة المتعددة',
      });

      expect(result.totalSubscriptions).toBe(4);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(2);
      // user-1 succeeded on phone and failed on laptop:
      expect(result.successfulUserIds).toContain('user-1');
      expect(result.partialUserIds).toContain('user-1');
      expect(result.failedUserIds).not.toContain('user-1'); // Not totally failed
      // user-2 succeeded completely:
      expect(result.successfulUserIds).toContain('user-2');
      expect(result.partialUserIds).not.toContain('user-2');
      // user-3 failed completely:
      expect(result.failedUserIds).toContain('user-3');
      expect(result.successfulUserIds).not.toContain('user-3');

      expect(result.deviceOutcomes).toHaveLength(4);
      const laptopOutcome = result.deviceOutcomes.find((o) => o.endpoint === 'https://push.com/u1-laptop');
      expect(laptopOutcome?.status).toBe('FAILED');
      expect(laptopOutcome?.statusCode).toBe(500);
    });
  });

  describe('FCM Multicast delivery', () => {
    it('dispatches FCM tokens in a single multicast call ($O(1)) and prunes expired tokens', async () => {
      const mockMessaging = {
        sendEachForMulticast: vi.fn().mockResolvedValue({
          successCount: 2,
          failureCount: 1,
          responses: [
            { success: true, messageId: 'msg-1' },
            {
              success: false,
              error: { code: 'messaging/registration-token-not-registered', message: 'Token unregistered' },
            },
            { success: true, messageId: 'msg-3' },
          ],
        }),
      };

      service.setMessagingInstance(mockMessaging as any);

      const subscriptions = [
        { endpoint: 'fcm-token-1', p256dh: 'fcm', auth: 'fcm', userId: 'user-1' },
        { endpoint: 'fcm-token-expired', p256dh: 'fcm', auth: 'fcm', userId: 'user-2' },
        { endpoint: 'fcm-token-3', p256dh: 'fcm', auth: 'fcm', userId: 'user-3' },
      ];

      const result = await service.sendBatchSubscriptions(subscriptions, {
        title: 'إشعار جماعي عبر فايربيس',
        body: 'تم الإرسال بطلب واحد فقط',
      });

      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['fcm-token-1', 'fcm-token-expired', 'fcm-token-3'],
          notification: expect.objectContaining({
            title: 'إشعار جماعي عبر فايربيس',
            body: 'تم الإرسال بطلب واحد فقط',
          }),
        }),
      );

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.expiredCount).toBe(1);
      expect(result.successfulUserIds).toEqual(['user-1', 'user-3']);
      expect(result.failedUserIds).toEqual(['user-2']);

      expect(mockPrismaService.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          endpoint: {
            in: ['fcm-token-expired'],
          },
        },
      });
    });
  });
});


