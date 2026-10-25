import { APP_CONFIG } from '@/config/app.config';
import { AuthTokensResponse, AuthUser } from '../types/auth.types';

const STORAGE_KEYS = {
  ACCESS_TOKEN: APP_CONFIG.storageKeys.authToken, // 'el_awal_token'
  REFRESH_TOKEN: 'el_awal_refresh_token',
  USER_SESSION: APP_CONFIG.storageKeys.teacherSession, // 'el_awal_teacher_session'
  USER_PROFILE: 'el_awal_user',
};

// In-Memory RAM Storage (OWASP / OAuth 2.0 Best Practice)
// The sensitive short-lived JWT Access Token resides in application memory (RAM) ONLY.
// It is never written to localStorage to protect against XSS exfiltration.
// The long-lived Refresh Token is stored in an HttpOnly, Secure cookie managed by the browser.
let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

/**
 * Persists user session: stores access token in in-memory RAM only,
 * keeps non-sensitive user profile in localStorage for layout/UI hydration,
 * and strips any legacy tokens from localStorage.
 */
export function setStoredTokens(session: AuthTokensResponse): void {
  inMemoryAccessToken = session.accessToken;
  inMemoryRefreshToken = session.refreshToken || null;

  if (typeof window === 'undefined') return;

  try {
    // Purge tokens from localStorage to prevent XSS exfiltration
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

    // Save non-sensitive user profile for fast optimistic UI rendering
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(session.user));
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session.user));
  } catch (error) {
    console.error('Failed to persist authentication profile to storage:', error);
  }
}

/**
 * Updates in-memory access and fallback refresh tokens without modifying the stored user profile
 */
export function updateStoredTokens(tokens: { accessToken: string; refreshToken?: string }): void {
  inMemoryAccessToken = tokens.accessToken;
  if (tokens.refreshToken) {
    inMemoryRefreshToken = tokens.refreshToken;
  }

  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Failed to purge tokens from storage:', error);
  }
}

/**
 * Checks if a session exists (either access token in RAM, in-memory refresh token, or stored user profile)
 */
export function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    localStorage.getItem(STORAGE_KEYS.USER_PROFILE) ||
    localStorage.getItem(STORAGE_KEYS.USER_SESSION) ||
    localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
    localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  );
}

/**
 * Retrieves the in-memory JWT access token from RAM.
 * Falls back to legacy localStorage (and immediately migrates it to RAM while wiping storage).
 */
export function getStoredAccessToken(): string | null {
  if (typeof window !== 'undefined' && !hasStoredSession()) {
    inMemoryAccessToken = null;
    return null;
  }
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window === 'undefined') return null;

  // Migration guard: If legacy token exists in localStorage, migrate to RAM and purge from disk
  const legacyToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (legacyToken) {
    inMemoryAccessToken = legacyToken;
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {}
    return inMemoryAccessToken;
  }

  return null;
}

/**
 * Retrieves the in-memory JWT refresh token if present (or legacy localStorage fallback)
 */
export function getStoredRefreshToken(): string | null {
  if (typeof window !== 'undefined' && !hasStoredSession()) {
    inMemoryRefreshToken = null;
    return null;
  }
  if (inMemoryRefreshToken) return inMemoryRefreshToken;
  if (typeof window === 'undefined') return null;

  const legacyRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (legacyRefreshToken) {
    inMemoryRefreshToken = legacyRefreshToken;
    try {
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {}
    return inMemoryRefreshToken;
  }

  return null;
}

/**
 * Retrieves the stored user profile
 */
export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || localStorage.getItem(STORAGE_KEYS.USER_SESSION);
  if (!userJson) return null;

  try {
    return JSON.parse(userJson) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Persists an updated user profile into localStorage
 */
export function setStoredUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to persist updated user profile to storage:', error);
  }
}

/**
 * Clears all authentication tokens from in-memory RAM and cached profiles from localStorage
 */
export function clearStoredTokens(): void {
  inMemoryAccessToken = null;
  inMemoryRefreshToken = null;

  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    sessionStorage.clear();
  } catch (error) {
    console.error('Failed to clear authentication tokens from storage:', error);
  }

  // SEC-17: Purge Service Worker runtime and RSC caches
  purgeServiceWorkerUserCache().catch(() => {});
}

/**
 * SEC-17: Purges Service Worker runtime and RSC caches to isolate user sessions
 * and prevent cross-account cache exposure on shared devices.
 */
export async function purgeServiceWorkerUserCache(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // 1. Post message to active Service Worker controller
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_USER_SESSION' });
    }

    // 2. Direct browser cache purge as reliable fallback
    if ('caches' in window) {
      const names = await window.caches.keys();
      await Promise.all(
        names
          .filter((name) => name.includes('runtime') || name.includes('rsc'))
          .map((name) => window.caches.delete(name).catch(() => false)),
      );
    }
  } catch (error) {
    console.debug('Service Worker cache purge notice:', error);
  }
}
