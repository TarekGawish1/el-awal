import { APP_CONFIG } from '@/config/app.config';
import { AuthTokensResponse, AuthUser } from '../types/auth.types';

const STORAGE_KEYS = {
  ACCESS_TOKEN: APP_CONFIG.storageKeys.authToken, // 'el_awal_token'
  REFRESH_TOKEN: 'el_awal_refresh_token',
  USER_SESSION: APP_CONFIG.storageKeys.teacherSession, // 'el_awal_teacher_session'
  USER_PROFILE: 'el_awal_user',
};

/**
 * Persists session tokens and user profile to localStorage safely
 */
export function setStoredTokens(session: AuthTokensResponse): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(session.user));
    // For backward-compatibility with dashboard layout
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session.user));
  } catch (error) {
    console.error('Failed to persist authentication tokens to storage:', error);
  }
}

/**
 * Retrieves the stored JWT access token
 */
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Retrieves the stored JWT refresh token
 */
export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
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
 * Clears all authentication tokens and cached profiles from localStorage
 */
export function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
  } catch (error) {
    console.error('Failed to clear authentication tokens from storage:', error);
  }
}
