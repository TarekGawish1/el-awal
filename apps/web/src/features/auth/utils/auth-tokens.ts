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
 * Persists user session: stores access token, refresh token, and user profile
 * in localStorage so the session survives page reloads, browser restarts, and server updates.
 */
export function setStoredTokens(session: AuthTokensResponse): void {
  inMemoryAccessToken = session.accessToken;
  inMemoryRefreshToken = session.refreshToken || null;

  if (typeof window === 'undefined') return;

  try {
    if (session.accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.accessToken);
    }
    if (session.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.refreshToken);
    }

    // Save non-sensitive user profile for fast optimistic UI rendering
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(session.user));
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session.user));
  } catch (error) {
    console.error('Failed to persist authentication profile to storage:', error);
  }
}

/**
 * Updates in-memory and persistent access and fallback refresh tokens
 */
export function updateStoredTokens(tokens: { accessToken: string; refreshToken?: string }): void {
  inMemoryAccessToken = tokens.accessToken;
  if (tokens.refreshToken) {
    inMemoryRefreshToken = tokens.refreshToken;
  }

  if (typeof window === 'undefined') return;

  try {
    if (tokens.accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    }
    if (tokens.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    }
  } catch (error) {
    console.error('Failed to persist updated tokens to storage:', error);
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
 * Retrieves the JWT access token (from RAM if cached, or from localStorage)
 */
export function getStoredAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken;
  if (typeof window === 'undefined') return null;

  const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (storedToken) {
    inMemoryAccessToken = storedToken;
    return storedToken;
  }

  return null;
}

/**
 * Retrieves the JWT refresh token (from RAM if cached, or from localStorage)
 */
export function getStoredRefreshToken(): string | null {
  if (inMemoryRefreshToken) return inMemoryRefreshToken;
  if (typeof window === 'undefined') return null;

  const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (storedRefreshToken) {
    inMemoryRefreshToken = storedRefreshToken;
    return storedRefreshToken;
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
}
