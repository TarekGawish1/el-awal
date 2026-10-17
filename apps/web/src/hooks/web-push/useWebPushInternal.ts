'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getFirebaseMessaging, getFcmToken } from '@/lib/firebase/config';
import {
  PushPermissionState,
  UseWebPushReturn,
  UseWebPushOptions,
  FCM_TOKEN_STORAGE_KEY,
  isBraveBrowser,
} from './web-push.types';
import {
  globalPermissionState,
  stateListeners,
  permissionListeners,
  getInitialSupported,
  getInitialPermission,
  setGlobalPermission,
  setGlobalSubscribed,
  getInitialSubscribed,
  fetchVapidPublicKey,
  urlBase64ToUint8Array,
  getOrRegisterServiceWorker,
  postSubscription,
  deleteSubscription,
  runSyncExistingSubscription,
} from './web-push.helpers';

/**
 * useWebPush — React hook for managing Web Push subscription lifecycle.
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
