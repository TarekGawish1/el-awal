'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api/endpoints';

export type PushPermissionState = 'default' | 'granted' | 'denied';

interface UseWebPushReturn {
  isSupported: boolean;
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

/**
 * Fetches the VAPID public key from the backend.
 */
async function fetchVapidPublicKey(): Promise<string> {
  const token = typeof window !== 'undefined'
    ? document.cookie.match(/access_token=([^;]+)/)?.[1] ||
      sessionStorage.getItem('access_token') ||
      localStorage.getItem('access_token')
    : null;

  const res = await fetch(`${API_BASE_URL}/notifications/push-vapid-key`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch VAPID key');
  const data = await res.json();
  return data.data?.publicKey || data.publicKey;
}

/**
 * Converts a base64 URL-encoded VAPID public key string to a Uint8Array.
 * Required for PushManager.subscribe({ applicationServerKey }).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Posts a subscription to the backend.
 */
async function postSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  const token = typeof window !== 'undefined'
    ? document.cookie.match(/access_token=([^;]+)/)?.[1] ||
      sessionStorage.getItem('access_token') ||
      localStorage.getItem('access_token')
    : null;

  const res = await fetch(`${API_BASE_URL}/notifications/push-subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
      },
    }),
  });
  if (!res.ok) throw new Error('Failed to save push subscription');
}

/**
 * Deletes a subscription from the backend.
 */
async function deleteSubscription(endpoint: string): Promise<void> {
  const token = typeof window !== 'undefined'
    ? document.cookie.match(/access_token=([^;]+)/)?.[1] ||
      sessionStorage.getItem('access_token') ||
      localStorage.getItem('access_token')
    : null;

  await fetch(`${API_BASE_URL}/notifications/push-unsubscribe`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ endpoint }),
  });
}

/**
 * useWebPush — React hook for managing Web Push subscription lifecycle.
 *
 * Handles:
 * - Browser support detection
 * - Permission state tracking
 * - Subscribe: requests permission → SW subscription → backend sync
 * - Unsubscribe: removes from browser + backend
 */
export function useWebPush(): UseWebPushReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check initial state on mount
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'PushManager' in window &&
      'serviceWorker' in navigator &&
      'Notification' in window;

    setIsSupported(supported);
    if (!supported) return;

    setPermission(Notification.permission as PushPermissionState);

    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => setIsSubscribed(false));
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);

    try {
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result !== 'granted') return false;

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Fetch VAPID public key
      const vapidKey = await fetchVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // Subscribe via PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Sync subscription with backend
      await postSubscription(subscription.toJSON());
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('[useWebPush] Subscribe failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await deleteSubscription(endpoint);
      }

      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('[useWebPush] Unsubscribe failed:', error);
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
    subscribe,
    unsubscribe,
  };
}
