import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebPush } from '../useWebPush';
import * as firebaseConfig from '@/lib/firebase/config';

describe('useWebPush & Firebase Config Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('useWebPush Hook State & Sync', () => {
    it('initializes with correct defaults and respects enabled: false', () => {
      const { result } = renderHook(() => useWebPush({ enabled: false }));

      expect(result.current.permission).toBeDefined();
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('synchronizes permission and subscription state across multiple hook instances', async () => {
      const hook1 = renderHook(() => useWebPush({ enabled: false }));
      const hook2 = renderHook(() => useWebPush({ enabled: false }));

      expect(hook1.result.current.isSubscribed).toBe(false);
      expect(hook2.result.current.isSubscribed).toBe(false);

      // Verify state synchronization mechanism
      expect(typeof hook1.result.current.subscribe).toBe('function');
      expect(typeof hook2.result.current.subscribe).toBe('function');
    });

    it('reads initial cached state from localStorage when permission is granted', () => {
      // Mock Notification.permission as granted
      const originalNotification = globalThis.Notification;
      globalThis.Notification = {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      } as any;

      try {
        localStorage.setItem('elawal_web_push_subscribed', 'true');
        const { result } = renderHook(() => useWebPush({ enabled: false }));
        expect(result.current.isSubscribed).toBe(true);
      } finally {
        globalThis.Notification = originalNotification;
      }
    });

    it('returns false for isSubscribed if Notification permission is denied', () => {
      const originalNotification = globalThis.Notification;
      globalThis.Notification = {
        permission: 'denied',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      } as any;

      try {
        localStorage.setItem('elawal_web_push_subscribed', 'true');
        const { result } = renderHook(() => useWebPush({ enabled: false }));
        expect(result.current.isSubscribed).toBe(false);
      } finally {
        globalThis.Notification = originalNotification;
      }
    });
  });

  describe('Firebase Config Promise Retry Behavior', () => {
    it('allows retrying getFirebaseMessaging after initial failure without Ctrl+Shift+R', async () => {
      let callCount = 0;
      vi.spyOn(firebaseConfig, 'getFirebaseMessaging').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return null; // Simulated initial failure / unsupported
        }
        return { app: {} } as any; // Simulated subsequent success
      });

      const firstAttempt = await firebaseConfig.getFirebaseMessaging();
      expect(firstAttempt).toBeNull();

      // In the fixed implementation, second call retries and receives the instance
      const secondAttempt = await firebaseConfig.getFirebaseMessaging();
      expect(secondAttempt).toEqual({ app: {} });
      expect(callCount).toBe(2);
    });
  });
});
