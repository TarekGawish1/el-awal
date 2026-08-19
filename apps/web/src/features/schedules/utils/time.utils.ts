/**
 * Converts any time string (HH:MM 24h or HH:MM AM/PM 12h) to Arabic 12-hour format (e.g. 05:00 م).
 */
export function formatArabicTime12H(timeStr?: string | null): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();

  // If already in Arabic format, normalize
  if (clean.includes('ص') || clean.includes('م')) return clean;

  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (!match) return clean;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && h < 12) h += 12;
  if (meridian === 'AM' && h === 12) h = 0;

  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const hStr = h12 < 10 ? `0${h12}` : `${h12}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;

  return `${hStr}:${mStr} ${period}`;
}

/**
 * Returns formatted 12-hour Arabic time range e.g. "05:00 م - 07:30 م"
 */
export function formatArabicTimeRange12H(
  startTime?: string | null,
  endTime?: string | null,
): string {
  const start = formatArabicTime12H(startTime);
  const end = formatArabicTime12H(endTime);
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
}

/**
 * Returns a compact formatted Arabic time range for constrained cards/pills:
 * e.g. "05:00 - 07:30 م" (omits repeated period if same meridian) or "05:00 م"
 */
export function formatArabicTimeRangeCompact(
  startTime?: string | null,
  endTime?: string | null,
): string {
  const start = formatArabicTime12H(startTime);
  const end = formatArabicTime12H(endTime);

  if (!start && !end) return '';
  if (start && !end) return start;
  if (!start && end) return end;

  // Extract periods
  const startPeriod = start.includes('م') ? 'م' : start.includes('ص') ? 'ص' : null;
  const endPeriod = end.includes('م') ? 'م' : end.includes('ص') ? 'ص' : null;

  if (startPeriod && endPeriod && startPeriod === endPeriod) {
    // Strip period from start: "05:00 م" -> "05:00"
    const startClean = start.replace(/\s*(م|ص)/, '').trim();
    return `${startClean} - ${end}`;
  }

  return `${start} - ${end}`;
}

/**
 * Parses time string to total minutes from midnight for calendar position calculations.
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();

  // Check Arabic format (e.g. 05:00 م)
  if (clean.includes('م') || clean.includes('ص')) {
    const match = clean.match(/(\d{1,2}):(\d{2})\s*(م|ص)?/);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const isPM = match[3] === 'م';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  }

  // Check standard 24h or AM/PM format
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && h < 12) h += 12;
  if (meridian === 'AM' && h === 12) h = 0;

  return h * 60 + m;
}

/**
 * Safely formats any Date or date string to local YYYY-MM-DD without UTC timezone drift.
 */
export function toLocalDateStr(d?: Date | string | null): string {
  if (!d) return '';
  if (typeof d === 'string') {
    if (d.includes('T')) return d.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return d;
    d = parsed;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

