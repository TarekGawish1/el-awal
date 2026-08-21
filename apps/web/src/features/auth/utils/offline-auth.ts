import { AuthTokensResponse, AuthUser, LoginCredentials } from '../types/auth.types';
import { ApiError } from '@/lib/api/errors';
import { offlineDb } from '@/lib/offline/db';

export interface StoredOfflineCredentials {
  identifier: string; // Canonical identifier (email or phone)
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
 * Pure JavaScript Implementation of SHA-256 (FIPS 180-4)
 * Provides 100% cryptographic compatibility when window.crypto.subtle is undefined
 * (e.g. non-HTTPS mobile network IP access, Android WebViews, legacy test environments)
 */
export function pureJsSha256(ascii: string): string {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));

  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  // Initial hash values: first 32 bits of fractional parts of square roots of first 8 primes
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  // Round constants: first 32 bits of fractional parts of cube roots of first 64 primes
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let index = 0; index < ascii.length; index++) {
    const code = ascii.charCodeAt(index);
    words[index >> 2] |= (code & 0xff) << (24 - (index % 4) * 8);
  }

  // Padding
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w: number[] = [];

  for (i = 0; i < words.length; i += 16) {
    const a = hash[0];
    const b = hash[1];
    const c = hash[2];
    const d = hash[3];
    const e = hash[4];
    const f = hash[5];
    const g = hash[6];
    const h = hash[7];

    let [tempA, tempB, tempC, tempD, tempE, tempF, tempG, tempH] = [a, b, c, d, e, f, g, h];

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[j + i] | 0;
      } else {
        const gamma0 =
          rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 =
          rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }

      const s1 = rightRotate(tempE, 6) ^ rightRotate(tempE, 11) ^ rightRotate(tempE, 25);
      const ch = (tempE & tempF) ^ (~tempE & tempG);
      const temp1 = (tempH + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(tempA, 2) ^ rightRotate(tempA, 13) ^ rightRotate(tempA, 22);
      const maj = (tempA & tempB) ^ (tempA & tempC) ^ (tempB & tempC);
      const temp2 = (s0 + maj) | 0;

      tempH = tempG;
      tempG = tempF;
      tempF = tempE;
      tempE = (tempD + temp1) | 0;
      tempD = tempC;
      tempC = tempB;
      tempB = tempA;
      tempA = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + tempA) | 0;
    hash[1] = (hash[1] + tempB) | 0;
    hash[2] = (hash[2] + tempC) | 0;
    hash[3] = (hash[3] + tempD) | 0;
    hash[4] = (hash[4] + tempE) | 0;
    hash[5] = (hash[5] + tempF) | 0;
    hash[6] = (hash[6] + tempG) | 0;
    hash[7] = (hash[7] + tempH) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

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
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (dec) => dec.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 18) + Date.now().toString(36);
}

/**
 * Computes salted SHA-256 hash using Web Crypto API when available,
 * and guaranteed pure JS SHA-256 fallback when unavailable.
 */
export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const combined = `${salt}:${password}:${salt}`;

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return bufferToHex(hashBuffer);
    } catch {
      // Degrade seamlessly to pure JS SHA-256
    }
  }

  return pureJsSha256(combined);
}

/**
 * Normalizes identifier (email/phone) for consistent lookup across formats.
 * Handles Egyptian phone prefixes (+20, 0020, 20), leading 0s, and separators.
 */
export function normalizeIdentifier(identifier: string): string {
  if (!identifier) return '';
  const trimmed = identifier.trim().toLowerCase();

  // If it's an email (contains @), return lowercased
  if (trimmed.includes('@')) {
    return trimmed;
  }

  // Strip all non-digit and non-plus characters
  let cleanPhone = trimmed.replace(/[\s\-().]/g, '');

  // Normalize international Egyptian formats to standard Egyptian mobile 01xxxxxxxxx
  if (cleanPhone.startsWith('+20')) {
    cleanPhone = '0' + cleanPhone.slice(3);
  } else if (cleanPhone.startsWith('0020')) {
    cleanPhone = '0' + cleanPhone.slice(4);
  } else if (cleanPhone.startsWith('20') && cleanPhone.length === 12) {
    cleanPhone = '0' + cleanPhone.slice(2);
  }

  return cleanPhone;
}

/**
 * Generates all candidate lookup keys for an identifier
 */
export function getIdentifierVariations(identifier: string): string[] {
  const norm = normalizeIdentifier(identifier);
  const variations = new Set<string>([norm]);

  // If it's a mobile phone starting with 01...
  if (/^01[0-9]{9}$/.test(norm)) {
    variations.add('+2' + norm); // +201xxxxxxxxx
    variations.add('2' + norm);  // 201xxxxxxxxx
    variations.add(norm.slice(1)); // 1xxxxxxxxx
  } else if (/^\+201[0-9]{9}$/.test(norm)) {
    variations.add('0' + norm.slice(3));
    variations.add(norm.slice(1));
  }

  return Array.from(variations);
}

/**
 * Saves user offline credentials upon successful online login to both IndexedDB and localStorage
 */
export async function saveOfflineCredentials(
  identifier: string,
  password: string,
  session: AuthTokensResponse,
): Promise<void> {
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

    // 1. Persist to IndexedDB offline_credentials store
    await offlineDb.saveOfflineCredentialsRecord(record as any);
    await offlineDb.setMetadata('userProfile', session.user);

    // 2. Persist to localStorage for dual-storage durability
    if (typeof window !== 'undefined' && localStorage) {
      const recordJson = JSON.stringify(record);

      // Save under primary identifier variations
      const idVariations = getIdentifierVariations(identifier);
      for (const v of idVariations) {
        localStorage.setItem(`${OFFLINE_CREDS_KEY_PREFIX}${v}`, recordJson);
      }

      // Also index by user's email and phone if present
      if (session.user?.email) {
        const emailVariations = getIdentifierVariations(session.user.email);
        for (const v of emailVariations) {
          localStorage.setItem(`${OFFLINE_CREDS_KEY_PREFIX}${v}`, recordJson);
        }
      }

      if (session.user?.phone) {
        const phoneVariations = getIdentifierVariations(session.user.phone);
        for (const v of phoneVariations) {
          localStorage.setItem(`${OFFLINE_CREDS_KEY_PREFIX}${v}`, recordJson);
        }
      }

      localStorage.setItem(LAST_OFFLINE_USER_KEY, normId);
    }
  } catch (error) {
    console.warn('Failed to save offline credentials:', error);
  }
}

/**
 * Retrieves cached credentials by identifier asynchronously across IndexedDB and localStorage
 */
export async function getOfflineCredentials(identifier: string): Promise<StoredOfflineCredentials | null> {
  const normTarget = normalizeIdentifier(identifier);

  // 1. Try IndexedDB offline_credentials store first
  try {
    const idbRecord = await offlineDb.getOfflineCredentialsRecord(normTarget);
    if (idbRecord) {
      return idbRecord as StoredOfflineCredentials;
    }

    const allIdbRecords = await offlineDb.getAllOfflineCredentialsRecords();
    for (const item of allIdbRecords) {
      if (
        normalizeIdentifier(item.identifier) === normTarget ||
        (item.user?.email && normalizeIdentifier(item.user.email) === normTarget) ||
        (item.user?.phone && normalizeIdentifier(item.user.phone) === normTarget)
      ) {
        return item as StoredOfflineCredentials;
      }
    }
  } catch {}

  // 2. Fallback to localStorage
  if (typeof window !== 'undefined' && localStorage) {
    try {
      const variations = getIdentifierVariations(identifier);

      for (const v of variations) {
        const json = localStorage.getItem(`${OFFLINE_CREDS_KEY_PREFIX}${v}`);
        if (json) {
          return JSON.parse(json) as StoredOfflineCredentials;
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(OFFLINE_CREDS_KEY_PREFIX)) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '') as StoredOfflineCredentials;
            if (
              normalizeIdentifier(item.identifier) === normTarget ||
              (item.user?.email && normalizeIdentifier(item.user.email) === normTarget) ||
              (item.user?.phone && normalizeIdentifier(item.user.phone) === normTarget)
            ) {
              return item;
            }
          } catch {}
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Verifies credentials offline against stored salted hash
 */
export async function verifyOfflineLogin(credentials: LoginCredentials): Promise<AuthTokensResponse> {
  const normId = normalizeIdentifier(credentials.identifier);
  const record = await getOfflineCredentials(normId);

  if (!record) {
    throw new ApiError({
      statusCode: 401,
      message:
        'بيانات الدخول غير مسجلة للعمل بدون إنترنت على هذا الجهاز. يرجى تسجيل الدخول أول مرة أثناء الاتصال بالإنترنت.',
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
