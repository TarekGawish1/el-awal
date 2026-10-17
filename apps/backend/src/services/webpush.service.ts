import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/database/prisma.service';
import * as webpush from 'web-push';
import { App } from 'firebase-admin/app';
import { Messaging, MulticastMessage } from 'firebase-admin/messaging';
import {
  PushSubscriptionDto,
  PushPayload,
  SubscriptionDeliveryOutcome,
  WebPushBatchResult,
  SendBatchOptions,
} from './webpush-types';
import { initFirebaseAdmin } from './firebase-admin.helper';
import { dispatchLegacyWebPush } from './webpush-legacy.helper';

export * from './webpush-types';

/**
 * WebPushService — High-performance unified Push Notification Dispatcher.
 *
 * Supports:
 * 1. Firebase Cloud Messaging (FCM) Multicast: Single-request broadcast ($O(1)$) up to 500 tokens per call.
 * 2. VAPID Web Push fallback: Bounded-concurrency dispatch for legacy browser endpoints.
 * 3. Batch pruning: Auto-removes unregistered / expired tokens in a single database query.
 */
@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private readonly appUrl: string;
  private firebaseApp?: App;
  private messaging?: Messaging;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL', 'https://elawal.app');
  }

  onModuleInit() {
    this.initFirebase();
    this.initVapid();
  }

  /**
   * Initializes Firebase Admin SDK with Service Account credentials.
   */
  private initFirebase() {
    const { app, messaging } = initFirebaseAdmin(this.config, this.logger);
    this.firebaseApp = app;
    this.messaging = messaging;
  }

  /**
   * Initializes VAPID details for fallback Web Push.
   */
  private initVapid() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT', 'mailto:admin@elawal.com');

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.logger.log('✅ Web Push (VAPID) initialized');
      } catch (err: any) {
        this.logger.warn(`WebPush VAPID note: ${err.message}`);
      }
    }
  }

  /**
   * Returns the VAPID/Firebase public key for client-side subscription setup.
   */
  getPublicKey(): string {
    return (
      this.config.get<string>('NEXT_PUBLIC_FIREBASE_VAPID_KEY') ||
      this.config.get<string>('FIREBASE_VAPID_KEY') ||
      this.config.get<string>('VAPID_PUBLIC_KEY', '')
    );
  }

  /**
   * Exposes messaging instance for testing or direct access.
   */
  getMessagingInstance(): Messaging | undefined {
    return this.messaging;
  }

  /**
   * Allows setting messaging instance directly (useful in unit tests).
   */
  setMessagingInstance(messaging: Messaging | undefined) {
    this.messaging = messaging;
  }

  /**
   * Saves or updates a device push subscription / FCM registration token for a user.
   */
  async subscribe(
    userId: string,
    subscription: PushSubscriptionDto,
    userAgent?: string,
  ): Promise<void> {
    const p256dh = subscription.keys?.p256dh || 'fcm';
    const auth = subscription.keys?.auth || 'fcm';

    await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        userAgent,
      },
      update: {
        userId,
        p256dh,
        auth,
        userAgent,
      },
    });
    this.logger.log(`📲 Push subscription / FCM token saved for user [${userId}]`);
  }

  /**
   * Removes a push subscription by endpoint / token.
   */
  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription
      .deleteMany({ where: { userId, endpoint } })
      .catch(() => undefined);
    this.logger.log(`🗑️ Push subscription removed for user [${userId}]`);
  }

  /**
   * Sends an immediate test Web Push notification to all active devices of a user.
   */
  async sendTestPushToUser(userId: string) {
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subs.length === 0) {
      return {
        success: false,
        totalDevices: 0,
        deliveredCount: 0,
        message: 'لا يوجد أي جهاز مسجل في خدمة الإشعارات الفورية لهذا الحساب حالياً.',
      };
    }

    const payload: PushPayload = {
      title: 'منصة الأول التعليمية 🔔',
      body: 'إشعار تجريبي: الإشعارات الفورية تعمل بنجاح وبسرعة على جهازك!',
      url: '/teacher/dashboard',
      data: {
        type: 'TEST_PUSH',
        timestamp: Date.now(),
      },
    };

    const result = await this.sendBatchSubscriptions(subs, payload);

    return {
      success: result.successCount > 0,
      totalDevices: result.totalSubscriptions,
      deliveredCount: result.successCount,
      failedCount: result.failureCount,
      expiredCount: result.expiredCount,
      message:
        result.successCount > 0
          ? `تم إرسال الإشعار التجريبي بنجاح إلى ${result.successCount} جهاز.`
          : 'تعذر تسليم الإشعار للأجهزة المسجلة (ربما انتهت صلاحية إذن المتصفح).',
    };
  }

  /**
   * Dispatches a notification payload to multiple subscriptions.
   *
   * Automatically groups subscriptions:
   * - FCM Tokens: Dispatched via Firebase Multicast (`sendEachForMulticast`) in single-request chunks of 500 ($O(1)$).
   * - Legacy WebPush: Dispatched via bounded concurrency workers.
   *
   * Prunes all expired / unregistered tokens in a SINGLE batch database query.
   */
  async sendBatchSubscriptions(
    subscriptions: Array<{
      endpoint: string;
      p256dh: string;
      auth: string;
      userId?: string;
    }>,
    payload: PushPayload,
    options?: SendBatchOptions,
  ): Promise<WebPushBatchResult> {
    if (!subscriptions || subscriptions.length === 0) {
      return {
        totalSubscriptions: 0,
        successCount: 0,
        failureCount: 0,
        expiredCount: 0,
        successfulUserIds: [],
        failedUserIds: [],
        partialUserIds: [],
        deviceOutcomes: [],
      };
    }

    const expiredEndpoints: string[] = [];
    const successfulUserIdsSet = new Set<string>();
    const failedUserIdsSet = new Set<string>();
    const deviceOutcomes: SubscriptionDeliveryOutcome[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Partition between FCM tokens and legacy HTTP endpoints
    const fcmSubs: typeof subscriptions = [];
    const legacySubs: typeof subscriptions = [];

    for (const sub of subscriptions) {
      if (
        this.messaging &&
        !sub.endpoint.startsWith('http://') &&
        !sub.endpoint.startsWith('https://')
      ) {
        fcmSubs.push(sub);
      } else {
        legacySubs.push(sub);
      }
    }

    // ── 1. Dispatch FCM Tokens in Multicast Batches of 500 ($O(1) per chunk) ───
    if (fcmSubs.length > 0 && this.messaging) {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < fcmSubs.length; i += CHUNK_SIZE) {
        const chunk = fcmSubs.slice(i, i + CHUNK_SIZE);
        const tokens = chunk.map((s) => s.endpoint);

        const dataRecord: Record<string, string> = {};
        if (payload.data) {
          for (const [key, val] of Object.entries(payload.data)) {
            dataRecord[key] = typeof val === 'string' ? val : JSON.stringify(val);
          }
        }
        if (payload.url) {
          dataRecord['url'] = payload.url;
        }

        const message: MulticastMessage = {
          tokens,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: dataRecord,
          webpush: {
            notification: {
              icon: payload.icon || '/icons/icon-192x192.png',
              badge: payload.badge || '/icons/badge-72x72.png',
              dir: 'rtl',
              lang: 'ar',
            },
            fcmOptions: {
              link: payload.url || this.appUrl,
            },
          },
        };

        try {
          const response = await this.messaging.sendEachForMulticast(message);

          response.responses.forEach((resp, idx) => {
            const sub = chunk[idx];
            if (resp.success) {
              successCount++;
              if (sub.userId) {
                successfulUserIdsSet.add(sub.userId);
              }
              deviceOutcomes.push({
                endpoint: sub.endpoint,
                userId: sub.userId,
                status: 'SENT',
                statusCode: 200,
              });
            } else {
              failureCount++;
              const errorCode = resp.error?.code || '';
              const isExpired =
                errorCode === 'messaging/registration-token-not-registered' ||
                errorCode === 'messaging/invalid-registration-token';

              if (isExpired) {
                expiredEndpoints.push(sub.endpoint);
                deviceOutcomes.push({
                  endpoint: sub.endpoint,
                  userId: sub.userId,
                  status: 'EXPIRED',
                  statusCode: 404,
                  error: resp.error?.message || 'Token unregistered or expired',
                });
              } else {
                deviceOutcomes.push({
                  endpoint: sub.endpoint,
                  userId: sub.userId,
                  status: 'FAILED',
                  statusCode: 500,
                  error: resp.error?.message || errorCode,
                });
              }

              if (sub.userId) {
                failedUserIdsSet.add(sub.userId);
              }
            }
          });
        } catch (fcmError: any) {
          this.logger.error(`FCM Multicast batch call failed: ${fcmError.message}`);
          chunk.forEach((sub) => {
            failureCount++;
            if (sub.userId) failedUserIdsSet.add(sub.userId);
            deviceOutcomes.push({
              endpoint: sub.endpoint,
              userId: sub.userId,
              status: 'FAILED',
              statusCode: 500,
              error: fcmError.message,
            });
          });
        }
      }
    }

    // ── 2. Dispatch Legacy WebPush Endpoints (Fallback Bounded Concurrency) ───
    if (legacySubs.length > 0) {
      const legacyResult = await dispatchLegacyWebPush(
        legacySubs,
        payload,
        this.appUrl,
        options,
        this.logger,
      );

      successCount += legacyResult.successCount;
      failureCount += legacyResult.failureCount;
      expiredEndpoints.push(...legacyResult.expiredEndpoints);
      deviceOutcomes.push(...legacyResult.deviceOutcomes);
      legacyResult.successfulUserIds.forEach((uid) => successfulUserIdsSet.add(uid));
      legacyResult.failedUserIds.forEach((uid) => failedUserIdsSet.add(uid));
    }

    // ── 3. Prune all expired endpoints in ONE single database query ───────────
    if (expiredEndpoints.length > 0) {
      await this.prisma.pushSubscription
        .deleteMany({
          where: { endpoint: { in: expiredEndpoints } },
        })
        .catch((err) => this.logger.error('Failed to prune expired subscriptions', err));

      this.logger.log(
        `🗑️ Removed ${expiredEndpoints.length} expired push subscription(s) / FCM token(s) in batch`,
      );
    }

    this.logger.log(
      `📩 Push batch complete: ${successCount} sent, ${failureCount} failed (${expiredEndpoints.length} expired) across ${subscriptions.length} subscriptions`,
    );

    const successfulUserIds = Array.from(successfulUserIdsSet);
    const partialUserIds = successfulUserIds.filter((uid) => failedUserIdsSet.has(uid));
    const failedWithoutAnySuccess = Array.from(failedUserIdsSet).filter(
      (uid) => !successfulUserIdsSet.has(uid),
    );

    return {
      totalSubscriptions: subscriptions.length,
      successCount,
      failureCount,
      expiredCount: expiredEndpoints.length,
      successfulUserIds,
      failedUserIds: failedWithoutAnySuccess,
      partialUserIds,
      deviceOutcomes,
    };
  }

  /**
   * Sends a push notification to ALL active subscriptions for a given user.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`No push subscriptions found for user [${userId}]`);
      return 0;
    }

    const result = await this.sendBatchSubscriptions(subscriptions, payload, {
      concurrencyLimit: 5,
    });
    return result.successCount;
  }
}
