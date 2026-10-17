import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { getFirebaseMessaging, getFcmToken } from '@/lib/firebase/config';
import {
  PushPermissionState,
  PUSH_STORAGE_KEY,
  FCM_TOKEN_STORAGE_KEY,
} from './web-push.types';

export let globalSubscribedState: boolean | null = null;
export const stateListeners = new Set<(subscribed: boolean) => void>();

export let globalPermissionState: PushPermissionState | null = null;
export const permissionListeners = new Set<(perm: PushPermissionState) => void>();

export let activeSyncPromise: Promise<boolean> | null = null;

export function getInitialSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'serviceWorker' in navigator &&
    'Notification' in window
  );
}

export function getInitialPermission(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission as PushPermissionState;
}

export function setGlobalPermission(perm: PushPermissionState) {
  globalPermissionState = perm;
  permissionListeners.forEach((listener) => listener(perm));
}

export function setGlobalSubscribed(subscribed: boolean) {
  globalSubscribedState = subscribed;
  if (typeof window !== 'undefined') {
    try {
      if (subscribed) {
        localStorage.setItem(PUSH_STORAGE_KEY, 'true');
      } else {
        localStorage.removeItem(PUSH_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in private browsing modes
    }
  }
  stateListeners.forEach((listener) => listener(subscribed));
}

export function getInitialSubscribed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      globalSubscribedState = false;
      return false;
    }
    const cached = localStorage.getItem(PUSH_STORAGE_KEY) === 'true';
    const cachedToken = Boolean(localStorage.getItem(FCM_TOKEN_STORAGE_KEY));
    const isSub = cached || cachedToken || globalSubscribedState === true;
    globalSubscribedState = isSub;
    return isSub;
  } catch {
    return false;
  }
}

/**
 * Fetches the VAPID public key from the backend.
 */
export async function fetchVapidPublicKey(): Promise<string> {
  const res = await apiClient<{ publicKey: string }>(
    API_ENDPOINTS.NOTIFICATIONS.PUSH_VAPID_KEY,
    { method: 'GET' },
  );

  const key = res?.publicKey ? res.publicKey.trim() : '';
  if (!key) {
    throw new Error('مفتاح الإشعارات (VAPID) غير متوفر على الخادم حالياً');
  }
  return key;
}

/**
 * Converts a base64 URL-encoded VAPID public key string to a Uint8Array.
 * Required for PushManager.subscribe({ applicationServerKey }).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const clean = base64String.trim();
  const padding = '='.repeat((4 - (clean.length % 4)) % 4);
  const base64 = (clean + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Ensures a service worker is registered and returns its registration.
 * Checks for already-active worker first to avoid unnecessary race delays,
 * and allows up to 10 seconds for initial activation when precaching routes.
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('المتصفح لا يدعم تقنية Service Worker');
  }

  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  // Fast path: Worker is already active and ready to handle push events
  if (registration.active) {
    return registration;
  }

  // Await ready state with a 10-second safety guard to accommodate route precaching on cold installs
  try {
    const readyRegistration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<ServiceWorkerRegistration>((_, reject) => {
        setTimeout(() => reject(new Error('SW activation timeout')), 10000);
      }),
    ]);
    return readyRegistration;
  } catch {
    return registration;
  }
}

/**
 * Posts a subscription to the backend.
 */
export async function postSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  await apiClient(API_ENDPOINTS.NOTIFICATIONS.PUSH_SUBSCRIBE, {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
      },
    }),
  });
}

/**
 * Deletes a subscription from the backend.
 */
export async function deleteSubscription(endpoint: string): Promise<void> {
  await apiClient(API_ENDPOINTS.NOTIFICATIONS.PUSH_UNSUBSCRIBE, {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
}

/**
 * Silently auto-repairs subscription without showing prompts if permission is already granted.
 */
export async function subscribeSilently(registration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;

    // 1. Try FCM
    const messaging = await getFirebaseMessaging();
    const vapidKey =
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
      (await fetchVapidPublicKey().catch(() => ''));

    if (messaging && vapidKey) {
      const fcmToken = await getFcmToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey,
      }).catch(() => null);

      if (fcmToken) {
        await postSubscription({
          endpoint: fcmToken,
          keys: { p256dh: 'fcm', auth: 'fcm' },
        }).catch(() => undefined);
        try {
          localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);
        } catch {}
        setGlobalSubscribed(true);
        return true;
      }
    }

    // 2. Fallback to standard VAPID
    const standardVapidKey = await fetchVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(standardVapidKey);
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }
    if (subscription) {
      await postSubscription(subscription.toJSON()).catch(() => undefined);
      setGlobalSubscribed(true);
      return true;
    }
  } catch (err) {
    console.debug('[useWebPush] Silent auto-repair subscription notice:', err);
  }
  return false;
}

/**
 * Synchronizes and auto-repairs existing subscription with deduplication mutex.
 */
export async function runSyncExistingSubscription(): Promise<boolean> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      if (typeof Notification === 'undefined') return false;

      const currentPerm = Notification.permission as PushPermissionState;
      setGlobalPermission(currentPerm);

      // If permission was revoked or denied in browser settings, cleanly mark as unsubscribed
      if (currentPerm !== 'granted') {
        setGlobalSubscribed(false);
        return false;
      }

      const hasCachedSub =
        localStorage.getItem(PUSH_STORAGE_KEY) === 'true' ||
        Boolean(localStorage.getItem(FCM_TOKEN_STORAGE_KEY));

      // Permission is GRANTED: Maintain optimistic state if previously opted-in
      if (hasCachedSub) {
        setGlobalSubscribed(true);
      }

      // If cached FCM token exists, keep backend record alive immediately
      const cachedFcmToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      if (cachedFcmToken) {
        postSubscription({
          endpoint: cachedFcmToken,
          keys: { p256dh: 'fcm', auth: 'fcm' },
        }).catch(() => undefined);
      }

      const registration = await getOrRegisterServiceWorker();
      if (!registration) return false;

      // 1. Try FCM token sync
      let fcmSuccess = false;
      try {
        const messaging = await getFirebaseMessaging();
        const vapidKey =
          process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
          (await fetchVapidPublicKey().catch(() => ''));

        if (messaging && vapidKey) {
          const token = await getFcmToken(messaging, {
            serviceWorkerRegistration: registration,
            vapidKey,
          }).catch(() => null);

          if (token) {
            fcmSuccess = true;
            setGlobalSubscribed(true);
            try {
              localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
            } catch {}
            await postSubscription({
              endpoint: token,
              keys: { p256dh: 'fcm', auth: 'fcm' },
            }).catch(() => undefined);
            return true;
          }
        }
      } catch (err) {
        console.debug('[useWebPush] FCM check notice:', err);
      }

      // 2. Check standard PushManager subscription
      try {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setGlobalSubscribed(true);
          await postSubscription(subscription.toJSON()).catch(() => undefined);
          return true;
        }
      } catch (err) {
        console.debug('[useWebPush] PushManager getSubscription check notice:', err);
      }

      // 3. Self-Healing / Auto-Repair:
      if (hasCachedSub && !fcmSuccess) {
        console.debug('[useWebPush] Active permission detected; auto-repairing subscription in background...');
        const repaired = await subscribeSilently(registration);
        return repaired;
      } else if (!hasCachedSub) {
        setGlobalSubscribed(false);
      }

      return false;
    } catch (err) {
      console.warn('[useWebPush] Subscription sync note:', err);
      return false;
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}
