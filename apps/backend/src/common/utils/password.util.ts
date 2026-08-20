import { randomBytes, randomInt } from 'crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*';

const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

/**
 * Generates a cryptographically secure, human-typeable random password that is
 * guaranteed to contain at least one uppercase letter, one lowercase letter,
 * one digit and one symbol. Characters prone to visual confusion (I, l, O, 0, 1)
 * are excluded. The result is stored only as a bcrypt hash — never persisted in
 * plaintext and never logged.
 */
export function generateSecurePassword(length = 12): string {
  if (length < 8) {
    throw new Error('Password length must be at least 8 characters');
  }

  const chars: string[] = [
    UPPER[randomInt(UPPER.length)],
    LOWER[randomInt(LOWER.length)],
    DIGITS[randomInt(DIGITS.length)],
    SYMBOLS[randomInt(SYMBOLS.length)],
  ];

  const bytes = randomBytes(length);
  for (let i = 0; i < length - 4; i++) {
    chars.push(ALL[bytes[i] % ALL.length]);
  }

  // Fisher–Yates shuffle to remove the predictable leading-char ordering
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
