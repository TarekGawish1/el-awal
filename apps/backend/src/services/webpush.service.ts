import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/database/prisma.service';
import * as webpush from 'web-push';

export interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface SubscriptionDeliveryOutcome {
  endpoint: string;
  userId?: string;
  status: 'SENT' | 'FAILED' | 'EXPIRED';
  statusCode?: number;
  error?: string;
}

export interface WebPushBatchResult {
  totalSubscriptions: number;
  successCount: number;
  failureCount: number;
  expiredCount: number;
  successfulUserIds: string[];
  failedUserIds: string[];
  partialUserIds: string[];
  deviceOutcomes: SubscriptionDeliveryOutcome[];
}

export interface SendBatchOptions {
  concurrencyLimit?: number;
}

/**
 * WebPushService — handles VAPID-authenticated Web Push notifications.
 *
 * Subscriptions are stored in the push_subscriptions table.
 * Expired subscriptions (HTTP 404/410 from push gateway) are auto-removed
 * to keep the table clean.
 */
@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL', 'https://elawal.app');
  }

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT', 'mailto:admin@elawal.com');

    if (!publicKey || !privateKey) {
      this.logger.warn(
        '⚠️ VAPID keys not configured. Web Push notifications will be disabled.',
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.logger.log('✅ Web Push (VAPID) initialized');
  }

  /**
   * Returns the VAPID public key for client-side subscription setup.
   */
  getPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY', '');
  }

  /**
   * Saves or updates a browser push subscription for a user.
   * Uses the endpoint as the unique identifier (one device per endpoint).
   */
  async subscribe(
    userId: string,
    subscription: PushSubscriptionDto,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      },
    });
    this.logger.log(`📲 Push subscription saved for user [${userId}]`);
  }

  /**
   * Removes a push subscription by endpoint.
   */
  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription
      .deleteMany({ where: { userId, endpoint } })
      .catch(() => undefined);
    this.logger.log(`🗑️ Push subscription removed for user [${userId}]`);
  }

  /**
   * Dispatches a Web Push notification payload to multiple subscriptions with bounded concurrency.
   * Auto-removes 404/410 expired subscriptions in a single batch query.
   *
   * External push delivery concurrency is strictly bounded by `concurrencyLimit` (default 15).
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

    const concurrencyLimit = Math.max(1, options?.concurrencyLimit ?? 15);

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      url: payload.url || this.appUrl,
      data: payload.data || {},
    });

    const expiredEndpoints: string[] = [];
    const successfulUserIdsSet = new Set<string>();
    const failedUserIdsSet = new Set<string>();
    const deviceOutcomes: SubscriptionDeliveryOutcome[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Bounded concurrency pool: at most `concurrencyLimit` active promises in flight
    let currentIndex = 0;
    const workerCount = Math.min(concurrencyLimit, subscriptions.length);

    const workers = Array.from({ length: workerCount }, async () => {
      while (currentIndex < subscriptions.length) {
        const index = currentIndex++;
        const sub = subscriptions[index];

        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload,
          );
          successCount++;
          if (sub.userId) {
            successfulUserIdsSet.add(sub.userId);
          }
          deviceOutcomes.push({
            endpoint: sub.endpoint,
            userId: sub.userId,
            status: 'SENT',
            statusCode: 201,
          });
        } catch (error) {
          failureCount++;
          const err = error as { statusCode?: number; message?: string };
          const statusCode = err.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
            deviceOutcomes.push({
              endpoint: sub.endpoint,
              userId: sub.userId,
              status: 'EXPIRED',
              statusCode,
              error: 'Subscription expired or unregistered by browser gateway',
            });
          } else {
            this.logger.warn(
              `Push failed for endpoint [${sub.endpoint.slice(0, 50)}...]: ${statusCode}`,
            );
            deviceOutcomes.push({
              endpoint: sub.endpoint,
              userId: sub.userId,
              status: 'FAILED',
              statusCode,
              error: err.message,
            });
          }
          if (sub.userId) {
            failedUserIdsSet.add(sub.userId);
          }
        }
      }
    });

    await Promise.all(workers);

    // Prune expired endpoints in one batch
    if (expiredEndpoints.length > 0) {
      await this.prisma.pushSubscription
        .deleteMany({
          where: { endpoint: { in: expiredEndpoints } },
        })
        .catch((err) => this.logger.error('Failed to prune expired subscriptions', err));

      this.logger.log(
        `🗑️ Removed ${expiredEndpoints.length} expired push subscription(s) in batch`,
      );
    }

    this.logger.log(
      `📩 Web Push batch complete: ${successCount} sent, ${failureCount} failed (${expiredEndpoints.length} expired) across ${subscriptions.length} subscriptions`,
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
   * Auto-removes subscriptions that return 404/410 (expired/revoked).
   * Reuses sendBatchSubscriptions with bounded concurrency (default 5 for single user).
   *
   * @returns number of successful sends
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
