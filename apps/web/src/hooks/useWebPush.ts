'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { getFirebaseMessaging, getFcmToken } from '@/lib/firebase/config';

export type PushPermissionState = 'default' | 'granted' | 'denied';

export interface UseWebPushReturn {
  isSupported: boolean;
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  isBrave: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

const PUSH_STORAGE_KEY = 'elawal_web_push_subscribed';
const FCM_TOKEN_STORAGE_KEY = 'elawal_fcm_token';

let globalSubscribedState: boolean | null = null;
const stateListeners = new Set<(subscribed: boolean) => void>();

let globalPermissionState: PushPermissionState | null = null;
const permissionListeners = new Set<(perm: PushPermissionState) => void>();

let activeSyncPromise: Promise<boolean> | null = null;

export function isBraveBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (navigator as any).brave ||
    navigator.userAgent.includes('Brave')
  );
}

function getInitialSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'serviceWorker' in navigator &&
    'Notification' in window
  );
}

function getInitialPermission(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission as PushPermissionState;
}

function setGlobalPermission(perm: PushPermissionState) {
  globalPermissionState = perm;
  permissionListeners.forEach((listener) => listener(perm));
}

function setGlobalSubscribed(subscribed: boolean) {
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

function getInitialSubscribed(): boolean {
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
async function fetchVapidPublicKey(): Promise<string> {
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
function urlBase64ToUint8Array(base64String: string): Uint8Array {
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
async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
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
async function postSubscription(subscription: PushSubscriptionJSON): Promise<void> {
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
async function deleteSubscription(endpoint: string): Promise<void> {
  await apiClient(API_ENDPOINTS.NOTIFICATIONS.PUSH_UNSUBSCRIBE, {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
}

/**
 * Silently auto-repairs subscription without showing prompts if permission is already granted.
 */
async function subscribeSilently(registration: ServiceWorkerRegistration): Promise<boolean> {
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
async function runSyncExistingSubscription(): Promise<boolean> {
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
      // If permission is 'granted' AND the user previously opted-in, but the browser
      // subscription was temporarily missing or recycled, automatically re-establish it.
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

export interface UseWebPushOptions {
  enabled?: boolean;
}

/**
 * useWebPush — React hook for managing Web Push subscription lifecycle.
 *
 * Handles:
 * - Browser support detection with zero initial render flicker
 * - Permission state tracking synchronized across all hook instances
 * - Subscribe: requests permission → SW registration → VAPID key → PushManager → backend sync
 * - Unsubscribe: removes from browser + backend
 * - Persistent caching & Auto-repair: avoids visual flicker/accidental turn-off
 * - Concurrency mutex to prevent duplicate network syncs during client navigation
 */
export function useWebPush(options?: UseWebPushOptions): UseWebPushReturn {
  const enabled = options?.enabled ?? true;
  const [isSupported, setIsSupported] = useState<boolean>(getInitialSupported);
  const [permission, setPermission] = useState<PushPermissionState>(() => globalPermissionState ?? getInitialPermission());
  const [isSubscribed, setIsSubscribed] = useState<boolean>(getInitialSubscribed);
  const [isLoading, setIsLoading] = useState(false);
  const [isBrave, setIsBrave] = useState(isBraveBrowser);

  // Synchronize state across multiple hook instances
  useEffect(() => {
    const subListener = (val: boolean) => setIsSubscribed(val);
    stateListeners.add(subListener);

    const permListener = (val: PushPermissionState) => setPermission(val);
    permissionListeners.add(permListener);

    return () => {
      stateListeners.delete(subListener);
      permissionListeners.delete(permListener);
    };
  }, []);

  // Check initial state on mount and sync when enabled
  useEffect(() => {
    const supported = getInitialSupported();
    setIsSupported(supported);
    setIsBrave(isBraveBrowser());
    if (!supported || !enabled) return;

    const currentPerm = getInitialPermission();
    setGlobalPermission(currentPerm);

    if (currentPerm === 'denied') {
      setGlobalSubscribed(false);
      return;
    }

    void runSyncExistingSubscription();
  }, [enabled]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('الإشعارات غير مدعومة في هذا المتصفح');
      return false;
    }
    setIsLoading(true);

    try {
      // 1. Request notification permission
      let perm = Notification.permission;
      if (perm !== 'granted') {
        perm = await Notification.requestPermission();
        setGlobalPermission(perm as PushPermissionState);
      }

      if (perm !== 'granted') {
        if (perm === 'denied') {
          toast.error('تم رفض إذن الإشعارات في المتصفح. يرجى تفعيلها من إعدادات الموقع بالمتصفح.');
        } else {
          toast.error('لم يتم منح إذن تفعيل الإشعارات');
        }
        return false;
      }

      // 2. Ensure Service Worker registration is active
      const registration = await getOrRegisterServiceWorker();

      // 3. Try Firebase Cloud Messaging (FCM) first
      let fcmToken: string | null = null;
      try {
        const messaging = await getFirebaseMessaging();
        const vapidKey =
          process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
          (await fetchVapidPublicKey().catch(() => ''));

        if (messaging && vapidKey) {
          fcmToken = await getFcmToken(messaging, {
            serviceWorkerRegistration: registration,
            vapidKey,
          });
        }
      } catch (fcmErr) {
        console.warn('[useWebPush] FCM registration notice, falling back to standard push:', fcmErr);
      }

      if (fcmToken) {
        await postSubscription({
          endpoint: fcmToken,
          keys: { p256dh: 'fcm', auth: 'fcm' },
        });
        try {
          localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);
        } catch {
          // ignore storage error
        }
        setGlobalSubscribed(true);
        setIsSubscribed(true);
        toast.success('تم تفعيل الإشعارات الفورية بنجاح');
        return true;
      }

      // 4. Fallback to standard VAPID push if FCM token was not generated
      const vapidKey = await fetchVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // Subscribe via PushManager (reuse existing if already subscribed)
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      }

      // 5. Sync subscription with backend
      await postSubscription(subscription.toJSON());
      setGlobalSubscribed(true);
      setIsSubscribed(true);
      toast.success('تم تفعيل الإشعارات الفورية بنجاح');
      return true;
    } catch (error: any) {
      console.error('[useWebPush] Subscribe failed:', error);
      let msg = error?.message || 'تعذر تفعيل الإشعارات';

      const isBraveUser = isBraveBrowser();

      if (
        msg.includes('push service error') ||
        msg.includes('Registration failed') ||
        msg.includes('AbortError') ||
        isBraveUser
      ) {
        if (isBraveUser) {
          msg =
            'في متصفح Brave: يرجى تفعيل "Use Google services for push messaging" من إعدادات الخصوصية (brave://settings/privacy) ثم إعادة تشغيل المتصفح.';
        } else {
          msg =
            'تعذر الاتصال بخدمة الإشعارات الفورية في المتصفح. تأكد من اتصال الإنترنت وعدم حظر خدمات الإشعارات.';
        }
      }

      toast.error(msg, { duration: 7000 });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          try {
            await deleteSubscription(endpoint);
          } catch (err) {
            console.warn('[useWebPush] Failed to remove subscription on backend:', err);
          }
        }
      }

      let cachedFcmToken: string | null = null;
      try {
        cachedFcmToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      } catch {
        // ignore
      }

      if (cachedFcmToken) {
        try {
          await deleteSubscription(cachedFcmToken);
          localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
        } catch (err) {
          console.warn('[useWebPush] Failed to remove FCM token on backend:', err);
        }
      }

      setGlobalSubscribed(false);
      setIsSubscribed(false);
      toast.success('تم إيقاف الإشعارات الفورية');
      return true;
    } catch (error: any) {
      console.error('[useWebPush] Unsubscribe failed:', error);
      toast.error('تعذر إيقاف الإشعارات');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isBrave,
    subscribe,
    unsubscribe,
  };
}
