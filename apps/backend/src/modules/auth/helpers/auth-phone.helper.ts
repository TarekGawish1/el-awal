/**
 * Generates all Egyptian phone formatting variants for flexible lookups.
 */
export function getPhoneVariants(phone: string): string[] {
  const normalized = phone.replace(/[\s-]/g, '').trim();
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

export function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}
