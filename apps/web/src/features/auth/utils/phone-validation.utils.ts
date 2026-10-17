const STRICT_EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|20|0)?1(0\d|1[01245]|2[01278]|5[05])\d{7}$/;

export function isEgyptianPhone(value: string): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[\s-]/g, '')
    .trim();

  if (!STRICT_EGYPTIAN_PHONE_REGEX.test(normalized)) {
    return false;
  }

  let local = normalized;
  if (local.startsWith('+20')) local = '0' + local.slice(3);
  else if (local.startsWith('0020')) local = '0' + local.slice(4);
  else if (local.startsWith('20') && local.length === 12) local = '0' + local.slice(2);

  // Reject dummy repeated numbers (e.g. 01000000000)
  if (/^01[0125](\d)\1{7}$/.test(local)) {
    return false;
  }
  if (local === '01234567890' || local === '01012345678' || local === '01000000000') {
    return false;
  }
  return true;
}

export function arePhonesTooSimilar(phoneA?: string, phoneB?: string): boolean {
  if (!phoneA || !phoneB) return false;
  const digitsA = phoneA.replace(/\D/g, '');
  const digitsB = phoneB.replace(/\D/g, '');
  if (digitsA.length < 8 || digitsB.length < 8) return false;
  return digitsA.slice(-8) === digitsB.slice(-8);
}

export function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, '').trim();
}
