/**
 * Shared Egyptian mobile phone normalization utilities.
 * Centralizes phone handling so storage, uniqueness checks and matching all
 * use the same canonical E.164-ish form (`+20XXXXXXXXXX`).
 */

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

/** Validates an Egyptian mobile number in any accepted input format. */
export function isEgyptianPhone(value: string): boolean {
  return typeof value === 'string' && EGYPTIAN_PHONE_REGEX.test(value.trim());
}

/**
 * Normalizes an Egyptian mobile number to the canonical form `+20XXXXXXXXXX`.
 * Accepts `01012345678`, `+201012345678`, `00201012345678`, and variants with
 * spaces/dashes.
 */
export function normalizeEgyptianPhone(value: string): string {
  const normalized = value.replace(/[\s-]/g, '').trim();

  const nationalNumber = normalized.startsWith('+20')
    ? normalized.slice(3)
    : normalized.startsWith('0020')
      ? normalized.slice(4)
      : normalized.startsWith('0')
        ? normalized.slice(1)
        : normalized;

  return `+20${nationalNumber}`;
}

/**
 * Returns phone variants used for tolerant lookups (exact, national, +20, 0020),
 * matching the existing auth lookup behavior.
 */
export function getPhoneVariants(value: string): string[] {
  const normalized = value.replace(/[\s-]/g, '').trim();
  const nationalNumber = normalized.startsWith('+20')
    ? normalized.slice(3)
    : normalized.startsWith('0020')
      ? normalized.slice(4)
      : normalized.startsWith('0')
        ? normalized.slice(1)
        : normalized;

  return [...new Set([
    normalized,
    `0${nationalNumber}`,
    `+20${nationalNumber}`,
    `0020${nationalNumber}`,
  ])];
}

/**
 * Returns a phone number in the digits-only format expected by WhatsApp.
 * Example: +201012345678 -> 201012345678.
 */
export function formatWhatsAppNumber(value: string): string {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `20${digits.slice(1)}`;
  }
  if (digits.startsWith('1') && digits.length === 10) {
    return `20${digits}`;
  }

  return digits;
}
