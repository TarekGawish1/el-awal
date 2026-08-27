import { randomBytes, randomInt } from 'crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';

const ALL = UPPER + LOWER + DIGITS;

/**
 * Generates a simple, human-typeable random password without complex symbols.
 * Characters prone to visual confusion (I, l, O, 0, 1) are excluded.
 */
export function generateSecurePassword(length = 6): string {
  const chars: string[] = [];
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    chars.push(ALL[bytes[i] % ALL.length]);
  }
  return chars.join('');
}
