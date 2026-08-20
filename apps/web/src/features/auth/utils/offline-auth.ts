import { AuthTokensResponse, AuthUser, LoginCredentials } from '../types/auth.types';
import { ApiError } from '@/lib/api/errors';

export interface StoredOfflineCredentials {
  identifier: string; // Lowercased email or phone
  salt: string;
  hash: string;
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType?: string;
    expiresIn?: number;
  };
  cachedAt: number;
}

const OFFLINE_CREDS_KEY_PREFIX = 'el_awal_offline_cred_';
const LAST_OFFLINE_USER_KEY = 'el_awal_last_offline_user';

/**
 * Converts ArrayBuffer to hexadecimal string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a random cryptographic salt string
 */
function generateSalt(length = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (dec) => dec.toString(16).padStart(2, '0')).join('');
  }
  // Fallback
  return Math.random().toString(36).substring(2, 18) + Date.now().toString(36);
}

/**
 * Computes salted SHA-256 hash using Web Crypto API or fallback
 */
export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const combined = `${salt}:${password}:${salt}`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return bufferToHex(hashBuffer);
  }

  // Fallback for non-subtle crypto test environments
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}

/**
 * Normalizes identifier (email/phone) for consistent lookup
 */
export function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

/**
 * Saves user offline credentials upon successful online login
 */
export async function saveOfflineCredentials(
  identifier: string,
  password: string,
  session: AuthTokensResponse,
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const normId = normalizeIdentifier(identifier);
    const salt = generateSalt();
    const hash = await hashPasswordWithSalt(password, salt);

    const record: StoredOfflineCredentials = {
      identifier: normId,
      salt,
      hash,
      user: session.user,
      tokens: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        tokenType: session.tokenType || 'Bearer',
        expiresIn: session.expiresIn || 86400,
      },
      cachedAt: Date.now(),
    };

    localStorage.setItem(`${OFFLINE_CREDS_KEY_PREFIX}${normId}`, JSON.stringify(record));

    // Also index by user's email and phone if available
    if (session.user.email) {
      const emailId = normalizeIdentifier(session.user.email);
      if (emailId !== normId) {
        localStorage.setItem(`${OFFLINE_CREDS_KEY_PREFIX}${emailId}`, JSON.stringify(record));
      }
    }
    if (session.user.phone) {
      const phoneId = normalizeIdentifier(session.user.phone);
      if (phoneId !== normId) {
        localStorage.setItem(`${OFFLINE_CREDS_KEY_PREFIX}${phoneId}`, JSON.stringify(record));
      }
    }

    localStorage.setItem(LAST_OFFLINE_USER_KEY, normId);
  } catch (error) {
    console.warn('Failed to save offline credentials:', error);
  }
}

/**
 * Retrieves cached credentials by identifier
 */
export function getOfflineCredentials(identifier: string): StoredOfflineCredentials | null {
  if (typeof window === 'undefined') return null;

  try {
    const normId = normalizeIdentifier(identifier);
    const json = localStorage.getItem(`${OFFLINE_CREDS_KEY_PREFIX}${normId}`);
    if (json) {
      return JSON.parse(json) as StoredOfflineCredentials;
    }

    // Try finding by scanning all cached offline creds if identifier is partial
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(OFFLINE_CREDS_KEY_PREFIX)) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '') as StoredOfflineCredentials;
          if (
            normalizeIdentifier(item.identifier) === normId ||
            (item.user.email && normalizeIdentifier(item.user.email) === normId) ||
            (item.user.phone && normalizeIdentifier(item.user.phone) === normId)
          ) {
            return item;
          }
        } catch {}
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Verifies credentials offline against stored salted hash
 */
export async function verifyOfflineLogin(credentials: LoginCredentials): Promise<AuthTokensResponse> {
  const normId = normalizeIdentifier(credentials.identifier);
  const record = getOfflineCredentials(normId);

  if (!record) {
    throw new ApiError({
      statusCode: 401,
      message:
        'تعذر تسجيل الدخول بدون إنترنت: لم يتم تسجيل الدخول من هذا الجهاز مسبقاً أثناء الاتصال بالإنترنت.',
      code: 'OFFLINE_NO_PREVIOUS_SESSION',
    });
  }

  const computedHash = await hashPasswordWithSalt(credentials.password, record.salt);

  if (computedHash !== record.hash) {
    throw new ApiError({
      statusCode: 401,
      message: 'كلمة المرور غير صحيحة (وضع العمل بدون إنترنت).',
      code: 'OFFLINE_INVALID_CREDENTIALS',
    });
  }

  return {
    accessToken: record.tokens.accessToken,
    refreshToken: record.tokens.refreshToken,
    tokenType: record.tokens.tokenType || 'Bearer',
    expiresIn: record.tokens.expiresIn || 86400,
    user: record.user,
  };
}
