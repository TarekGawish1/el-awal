import { Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import {
  PushPayload,
  SendBatchOptions,
  SubscriptionDeliveryOutcome,
} from './webpush-types';

export interface LegacyDispatchResult {
  successCount: number;
  failureCount: number;
  expiredEndpoints: string[];
  deviceOutcomes: SubscriptionDeliveryOutcome[];
  successfulUserIds: string[];
  failedUserIds: string[];
}

/**
 * Dispatches push notifications to legacy WebPush endpoints with bounded concurrency.
 */
export async function dispatchLegacyWebPush(
  legacySubs: Array<{
    endpoint: string;
    p256dh: string;
    auth: string;
    userId?: string;
  }>,
  payload: PushPayload,
  appUrl: string,
  options?: SendBatchOptions,
  logger?: Logger,
): Promise<LegacyDispatchResult> {
  const expiredEndpoints: string[] = [];
  const successfulUserIdsSet = new Set<string>();
  const failedUserIdsSet = new Set<string>();
  const deviceOutcomes: SubscriptionDeliveryOutcome[] = [];
  let successCount = 0;
  let failureCount = 0;

  const concurrencyLimit = Math.max(1, options?.concurrencyLimit ?? 15);
  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    url: payload.url || appUrl,
    data: payload.data || {},
  });

  let currentIndex = 0;
  const workerCount = Math.min(concurrencyLimit, legacySubs.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (currentIndex < legacySubs.length) {
      const index = currentIndex++;
      const sub = legacySubs[index];

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
          logger?.warn(
            `Push failed for legacy endpoint [${sub.endpoint.slice(0, 50)}...]: ${statusCode}`,
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

  return {
    successCount,
    failureCount,
    expiredEndpoints,
    deviceOutcomes,
    successfulUserIds: Array.from(successfulUserIdsSet),
    failedUserIds: Array.from(failedUserIdsSet),
  };
}
