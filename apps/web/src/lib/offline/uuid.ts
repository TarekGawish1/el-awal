/**
 * RFC 9562-compliant UUIDv7 Generator for Client-Side Offline Entity Creation
 *
 * Layout:
 * - 48-bit UNIX timestamp (milliseconds)
 * - 4-bit version (0b0111 = 7)
 * - 12-bit pseudo-random / sequence
 * - 2-bit variant (0b10 = RFC 4122 / 9562)
 * - 62-bit pseudo-random
 *
 * Total: 128 bits represented in canonical 8-4-4-4-12 hexadecimal format.
 */

function getRandomBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    window.crypto.getRandomValues(bytes);
    return bytes;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  // Math.random fallback for non-crypto test/Node contexts
  for (let i = 0; i < count; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

let lastTimestamp = -1;
let sequence = 0;

/**
 * Generates a monotonic, time-sortable RFC 9562 UUIDv7 string.
 */
export function generateUUIDv7(): string {
  const now = Date.now();

  if (now === lastTimestamp) {
    sequence = (sequence + 1) & 0xfff;
  } else {
    lastTimestamp = now;
    sequence = 0;
  }

  const randomBytes = getRandomBytes(10);

  // 1. 48-bit Timestamp
  const timeHex = now.toString(16).padStart(12, '0');

  // 2. 4-bit Version (7) + 12-bit sequence / random
  const seqPart = (sequence ^ ((randomBytes[0] << 8) | randomBytes[1])) & 0xfff;
  const verAndSeqHex = ((0x7 << 12) | seqPart).toString(16).padStart(4, '0');

  // 3. 2-bit Variant (0b10) + 14-bit random
  const varPart = (0x8000 | ((randomBytes[2] & 0x3f) << 8) | randomBytes[3])
    .toString(16)
    .padStart(4, '0');

  // 4. Remaining 48-bit random
  let restHex = '';
  for (let i = 4; i < 10; i++) {
    restHex += randomBytes[i].toString(16).padStart(2, '0');
  }

  return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-${verAndSeqHex}-${varPart}-${restHex}`.toLowerCase();
}
