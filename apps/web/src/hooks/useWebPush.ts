'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

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

let globalSubscribedState: boolean | null = null;
const stateListeners = new Set<(subscribed: boolean) => void>();

export function isBraveBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (navigator as any).brave ||
    navigator.userAgent.includes('Brave')
  );
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
      return false;
    }
    if (globalSubscribedState !== null) {
      return globalSubscribedState;
    }
    const cached = localStorage.getItem(PUSH_STORAGE_KEY) === 'true';
    globalSubscribedState = cached;
    return cached;
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
 */
async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('المتصفح لا يدعم تقنية Service Worker');
  }

  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  // Await ready with a 3-second safety timeout to avoid hanging indefinitely
  const readyRegistration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((resolve) => {
      setTimeout(() => resolve(registration!), 3000);
    }),
  ]);

  return readyRegistration || registration;
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
 * useWebPush — React hook for managing Web Push subscription lifecycle.
 *
 * Handles:
 * - Browser support detection
 * - Permission state tracking
 * - Subscribe: requests permission → SW registration → VAPID key → PushManager → backend sync
 * - Unsubscribe: removes from browser + backend
 * - Persistent caching: avoids visual flicker/reset when drawer opens
 */
export function useWebPush(): UseWebPushReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(getInitialSubscribed);
  const [isLoading, setIsLoading] = useState(false);
  const [isBrave, setIsBrave] = useState(false);

  // Synchronize state across multiple hook instances
  useEffect(() => {
    const listener = (val: boolean) => setIsSubscribed(val);
    stateListeners.add(listener);
    return () => {
      stateListeners.delete(listener);
    };
  }, []);

  // Check initial state on mount
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'PushManager' in window &&
      'serviceWorker' in navigator &&
      'Notification' in window;

    setIsSupported(supported);
    setIsBrave(isBraveBrowser());
    if (!supported) return;

    const currentPerm = Notification.permission as PushPermissionState;
    setPermission(currentPerm);

    if (currentPerm === 'denied') {
      setGlobalSubscribed(false);
      setIsSubscribed(false);
      return;
    }

    let cancelled = false;

    // PwaRegister can still be registering the worker when this hook mounts.
    // Wait briefly for that registration before checking the persisted browser subscription.
    const syncExistingSubscription = async () => {
      try {
        const existingRegistration = await navigator.serviceWorker.getRegistration();
        const registration =
          existingRegistration ||
          (await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<ServiceWorkerRegistration | null>((resolve) =>
              setTimeout(() => resolve(null), 3000),
            ),
          ]));

        if (!registration) return;

        const subscription = await registration.pushManager.getSubscription();
        if (cancelled) return;

        const hasSub = Boolean(subscription);
        setGlobalSubscribed(hasSub);
        setIsSubscribed(hasSub);

        // Keep the backend record alive if the browser retained the subscription.
        if (subscription) {
          await postSubscription(subscription.toJSON()).catch(() => undefined);
        }
      } catch {
        if (!cancelled && Notification.permission !== 'granted') {
          setGlobalSubscribed(false);
          setIsSubscribed(false);
        }
      }
    };

    void syncExistingSubscription();

    return () => {
      cancelled = true;
    };
  }, []);

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
        setPermission(perm as PushPermissionState);
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

      // 3. Fetch VAPID public key from backend
      const vapidKey = await fetchVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // 4. Subscribe via PushManager (reuse existing if already subscribed)
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
