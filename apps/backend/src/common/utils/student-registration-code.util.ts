import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * One-time high-entropy student self-registration activation code utilities.
 *
 * Rationale: studentCode is sequential (STU-YYYY-NNNN) and therefore guessable,
 * and dateOfBirth is nullable / low entropy. Neither is safe as the sole
 * verification factor for claiming an authentication account. The school-issued
 * activation code below carries ~50 bits of entropy (10 Crockford base32
 * characters) and is stored only as a SHA-256 hash, single-use.
 */

const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32 (no I, L, O, U)
const CODE_LENGTH = 10;

/** Generates a human-friendly one-time activation code in the format XXXX-XXXX-XX. */
export function generateStudentRegistrationCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  const chars: string[] = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    chars.push(CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]);
  }
  const raw = chars.join('');
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

/** SHA-256 hex digest of the normalized (uppercase, separators stripped) code. */
export function hashStudentRegistrationCode(code: string): string {
  return createHash('sha256').update(normalizeStudentRegistrationCode(code)).digest('hex');
}

/** Constant-time comparison of two SHA-256 hex digests. */
export function registrationCodeHashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length || bufA.length === 0) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** Uppercases and strips separators/whitespace so entry format does not matter. */
export function normalizeStudentRegistrationCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}
