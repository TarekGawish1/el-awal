/**
 * Normalizes various Egyptian phone formats to a WhatsApp JID.
 * Handles: 01XXXXXXXXX, 201XXXXXXXXX, +201XXXXXXXXX
 */
export function normalizePhoneToJid(phone: string): string {
  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('0') && digits.length === 11) {
    digits = '2' + digits; // 01X → 201X
  } else if (digits.startsWith('1') && digits.length === 10) {
    digits = '20' + digits; // 1X → 201X
  }

  return `${digits}@s.whatsapp.net`;
}

/** Returns a random integer between min and max (inclusive). */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Promise-based sleep. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
