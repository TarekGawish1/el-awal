/**
 * Shared Egyptian mobile phone normalization utilities.
 * Centralizes phone handling so storage, uniqueness checks and matching all
 * use the same canonical E.164-ish form (`+20XXXXXXXXXX`).
 */

/**
 * Shared Egyptian mobile phone normalization and strict NTRA operator validation.
 * Operators:
 * - Vodafone (010): all ranges
 * - Orange (012): 0120, 0121, 0122, 0127, 0128
 * - Etisalat (011): 0110, 0111, 0112, 0114, 0115
 * - WE (015): 0150, 0155 only (rejecting invalid/unallocated 0159, 0151, etc.)
 */
export const STRICT_EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|20|0)?1(0\d|1[01245]|2[01278]|5[05])\d{7}$/;

/** Validates an Egyptian mobile number strictly in accordance with NTRA allocations. */
export function isEgyptianPhone(value: string): boolean {
  if (typeof value !== 'string') return false;

  const normalized = value
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[\s-]/g, '')
    .trim();

  if (!STRICT_EGYPTIAN_PHONE_REGEX.test(normalized)) {
    return false;
  }

  let local = normalized;
  if (local.startsWith('+20')) local = '0' + local.slice(3);
  else if (local.startsWith('0020')) local = '0' + local.slice(4);
  else if (local.startsWith('20') && local.length === 12) local = '0' + local.slice(2);

  // Reject dummy repeated numbers (e.g. 01000000000, 01111111111)
  if (/^01[0125](\d)\1{7}$/.test(local)) {
    return false;
  }

  // Reject dummy sequential numbers
  if (local === '01234567890' || local === '01012345678' || local === '01000000000') {
    return false;
  }

  return true;
}

/**
 * Normalizes an Egyptian mobile number to the canonical form `+20XXXXXXXXXX`.
 * Accepts `01012345678`, `+201012345678`, `00201012345678`, `201012345678`, and variants with
 * spaces/dashes.
 */
export function normalizeEgyptianPhone(value: string): string {
  const normalized = value.replace(/[\s-]/g, '').trim();

  const nationalNumber = normalized.startsWith('+20')
    ? normalized.slice(3)
    : normalized.startsWith('0020')
      ? normalized.slice(4)
      : normalized.startsWith('20') && (normalized.length === 12 || normalized.startsWith('201'))
        ? normalized.slice(2)
        : normalized.startsWith('0')
          ? normalized.slice(1)
          : normalized;

  return `+20${nationalNumber}`;
}

/**
 * Returns phone variants used for tolerant lookups (exact, national, +20, 0020, 20),
 * matching the existing auth lookup behavior.
 */
export function getPhoneVariants(value: string): string[] {
  const normalized = value.replace(/[\s-]/g, '').trim();
  const nationalNumber = normalized.startsWith('+20')
    ? normalized.slice(3)
    : normalized.startsWith('0020')
      ? normalized.slice(4)
      : normalized.startsWith('20') && (normalized.length === 12 || normalized.startsWith('201'))
        ? normalized.slice(2)
        : normalized.startsWith('0')
          ? normalized.slice(1)
          : normalized;

  return [...new Set([
    normalized,
    `0${nationalNumber}`,
    `+20${nationalNumber}`,
    `0020${nationalNumber}`,
    `20${nationalNumber}`,
    nationalNumber,
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

/**
 * Checks if two phone numbers are suspiciously similar (e.g., student mimicking parent phone
 * by changing only the telecom prefix or an initial digit).
 * Egyptian local subscriber numbers are the last 8 digits.
 */
export function arePhonesTooSimilar(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB) return false;
  const digitsA = phoneA.replace(/\D/g, '');
  const digitsB = phoneB.replace(/\D/g, '');
  if (digitsA.length < 8 || digitsB.length < 8) return false;
  return digitsA.slice(-8) === digitsB.slice(-8);
}
