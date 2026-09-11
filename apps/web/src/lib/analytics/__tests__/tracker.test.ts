import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isLandingPath, trackPageView } from '../tracker';

describe('Analytics Client Tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isLandingPath', () => {
    it('identifies root / as landing page', () => {
      expect(isLandingPath('/')).toBe(true);
      expect(isLandingPath('')).toBe(true);
      expect(isLandingPath('/#features')).toBe(true);
    });

    it('identifies public marketing / legal routes as landing', () => {
      expect(isLandingPath('/privacy')).toBe(true);
      expect(isLandingPath('/terms')).toBe(true);
      expect(isLandingPath('/parent-access')).toBe(true);
    });

    it('identifies internal dashboard routes as non-landing', () => {
      expect(isLandingPath('/teacher/dashboard')).toBe(false);
      expect(isLandingPath('/student/courses')).toBe(false);
      expect(isLandingPath('/teacher/groups')).toBe(false);
    });
  });

  describe('trackPageView execution', () => {
    it('dispatches beacon using navigator.sendBeacon when available', () => {
      const mockSendBeacon = vi.fn().mockReturnValue(true);
      vi.stubGlobal('navigator', {
        ...globalThis.navigator,
        onLine: true,
        sendBeacon: mockSendBeacon,
      });

      trackPageView({
        path: '/teacher/analytics',
        isLandingPage: false,
      });

      expect(mockSendBeacon).toHaveBeenCalledTimes(1);
      const [url, blob] = mockSendBeacon.mock.calls[0];
      expect(url).toContain('/analytics/track');
      expect(blob).toBeInstanceOf(Blob);
    });
  });
});
