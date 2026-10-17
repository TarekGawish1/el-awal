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

export interface UseWebPushOptions {
  enabled?: boolean;
}

export const PUSH_STORAGE_KEY = 'elawal_web_push_subscribed';
export const FCM_TOKEN_STORAGE_KEY = 'elawal_fcm_token';

export function isBraveBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (navigator as any).brave ||
    navigator.userAgent.includes('Brave')
  );
}
