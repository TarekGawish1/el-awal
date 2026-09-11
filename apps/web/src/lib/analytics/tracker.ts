import { API_BASE_URL, API_ENDPOINTS } from '../api/endpoints';
import { getCachedGeoHint, getClientGeoHint } from './geo-client';

export interface TrackPageViewOptions {
  path: string;
  referrer?: string;
  isLandingPage?: boolean;
  tenantId?: string;
  metadata?: Record<string, any>;
  city?: string;
  country?: string;
}

/**
 * Checks if a given pathname belongs to the public landing / marketing surfaces.
 */
export function isLandingPath(pathname: string): boolean {
  if (!pathname || pathname === '/' || pathname.startsWith('/#')) return true;
  const publicLandingRoutes = ['/terms', '/privacy', '/parent-access'];
  return publicLandingRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Non-blocking client-side telemetry dispatcher using navigator.sendBeacon
 * with keepalive fetch fallback. Never introduces latency or blocks UI threads.
 */
export function trackPageView({
  path,
  referrer,
  isLandingPage,
  tenantId,
  metadata,
  city,
  country,
}: TrackPageViewOptions): void {
  if (typeof window === 'undefined') return;

  // Do not track offline sessions or disabled environments
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  // Ensure background geo hint is warming up
  void getClientGeoHint();

  try {
    const isLanding = isLandingPage ?? isLandingPath(path);
    const resolvedReferrer = referrer ?? (document.referrer ? document.referrer.slice(0, 500) : undefined);
    const geoHint = getCachedGeoHint();

    const payload = {
      path: path || window.location.pathname || '/',
      referrer: resolvedReferrer,
      isLandingPage: isLanding,
      tenantId: tenantId || undefined,
      city: city || geoHint?.city || undefined,
      country: country || geoHint?.country || undefined,
      metadata: {
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        language: navigator.language,
        timestamp: Date.now(),
        ...metadata,
      },
    };

    const endpoint = `${API_BASE_URL}${API_ENDPOINTS.ANALYTICS.TRACK}`;
    const payloadStr = JSON.stringify(payload);

    // Primary: navigator.sendBeacon (most resilient for page navigations)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payloadStr], { type: 'application/json' });
      const queued = navigator.sendBeacon(endpoint, blob);
      if (queued) return;
    }

    // Fallback: non-blocking fetch with keepalive: true
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payloadStr,
      keepalive: true,
      credentials: 'include',
    }).catch(() => {
      // Intentionally silent: telemetry failure must never bubble up
    });
  } catch {
    // Intentionally silent
  }
}
