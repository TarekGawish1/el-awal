'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { startUserSession, pingUserSession } from '../api/analytics.api';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api/endpoints';
import { getCachedGeoHint, getClientGeoHint } from '@/lib/analytics/geo-client';
import { getOrCreateVisitorId } from '@/lib/analytics/tracker';

export function useActivityTracker() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionIdRef = useRef<string | null>(null);
  const lastPingTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Track authenticated activity sessions (student leaderboard strictly filters by STUDENT role on backend)
    if (!isAuthenticated || !user) return;

    let isMounted = true;
    const tenantId = user.teacherProfileId;

    // 1. Start User Session on mount with geo hint and device visitorId
    const initSession = async () => {
      let geoHint = getCachedGeoHint();
      if (!geoHint) {
        geoHint = await getClientGeoHint();
      }

      if (!isMounted) return;

      try {
        const vid = getOrCreateVisitorId();
        const res = await startUserSession(
          tenantId,
          geoHint ? { city: geoHint.city, country: geoHint.country } : undefined,
          vid || undefined,
        );
        if (isMounted && res?.sessionId) {
          sessionIdRef.current = res.sessionId;
          lastPingTimeRef.current = Date.now();
        }
      } catch {
        // Telemetry failure is intentionally silent
      }
    };

    void initSession();

    // 2. Periodic 30s Heartbeat Ping
    const interval = setInterval(() => {
      if (!sessionIdRef.current) return;

      // Only ping if tab is currently visible to prevent inflated time from stale tabs
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const now = Date.now();
        const elapsedSeconds = Math.round((now - lastPingTimeRef.current) / 1000);
        lastPingTimeRef.current = now;

        pingUserSession(sessionIdRef.current, Math.min(elapsedSeconds, 60)).catch(() => {});
      } else {
        // Update lastPingTime so we don't burst accumulated idle time upon tab reactivation
        lastPingTimeRef.current = Date.now();
      }
    }, 30 * 1000);

    // 3. Tab Teardown / Unload Beacon
    const handleUnload = () => {
      if (!sessionIdRef.current) return;
      const elapsedSeconds = Math.min(
        Math.max(Math.round((Date.now() - lastPingTimeRef.current) / 1000), 1),
        60,
      );

      const endpoint = `${API_BASE_URL}${API_ENDPOINTS.ANALYTICS.SESSION_PING}`;
      const payload = JSON.stringify({
        sessionId: sessionIdRef.current,
        elapsedSeconds,
      });

      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } else {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [isAuthenticated, user]);
}
