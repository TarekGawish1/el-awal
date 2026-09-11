/**
 * Client-side lightweight geographic detection helper.
 * Provides governorate and country hints to telemetry ingestion endpoints
 * ensuring high precision even if reverse proxies or CDNs mask client subnets.
 */

export interface ClientGeoHint {
  city: string;
  country: string;
  countryCode: string;
}

const STORAGE_KEY = 'elawal_client_geo_hint';
let inMemoryHint: ClientGeoHint | null = null;
let activeFetchPromise: Promise<ClientGeoHint | null> | null = null;

/**
 * Reads cached geo hint from memory or sessionStorage synchronously without network delay.
 */
export function getCachedGeoHint(): ClientGeoHint | null {
  if (inMemoryHint) return inMemoryHint;
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached) {
      inMemoryHint = JSON.parse(cached);
      return inMemoryHint;
    }
  } catch {
    // SessionStorage might be unavailable in private browsing
  }
  return null;
}

/**
 * Asynchronously detects client location using secure HTTPS IP geo endpoints
 * and saves into session cache so subsequent pageviews and pings have 0ms latency.
 */
export async function getClientGeoHint(): Promise<ClientGeoHint | null> {
  const existing = getCachedGeoHint();
  if (existing) return existing;
  if (typeof window === 'undefined') return null;
  if (activeFetchPromise) return activeFetchPromise;

  activeFetchPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('https://ipwho.is/', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success !== false) {
          const hint: ClientGeoHint = {
            city: data.city || data.region || '',
            country: data.country || 'مصر',
            countryCode: data.country_code || 'EG',
          };
          inMemoryHint = hint;
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(hint));
          } catch {}
          return hint;
        }
      }
    } catch {
      // Non-blocking, fails gracefully
    } finally {
      activeFetchPromise = null;
    }
    return null;
  })();

  return activeFetchPromise;
}

// Automatically trigger background prefetch on client load
if (typeof window !== 'undefined') {
  void getClientGeoHint();
}
