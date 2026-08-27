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
   * Sends a push notification to ALL active subscriptions for a given user.
   * Auto-removes subscriptions that return 404/410 (expired/revoked).
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

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      url: payload.url || this.appUrl,
      data: payload.data || {},
    });

    let successCount = 0;
    const expiredEndpoints: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload,
          );
          successCount++;
        } catch (error) {
          const err = error as { statusCode?: number };
          if (err.statusCode === 404 || err.statusCode === 410) {
            // Subscription expired or was revoked by the browser
            expiredEndpoints.push(sub.endpoint);
          } else {
            this.logger.warn(
              `Push failed for endpoint [${sub.endpoint.slice(0, 50)}...]: ${err.statusCode}`,
            );
          }
        }
      }),
    );

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: expiredEndpoints } },
      });
      this.logger.log(
        `🗑️ Removed ${expiredEndpoints.length} expired push subscription(s) for user [${userId}]`,
      );
    }

    this.logger.log(
      `📩 Push sent to ${successCount}/${subscriptions.length} subscriptions for user [${userId}]`,
    );
    return successCount;
  }
}
