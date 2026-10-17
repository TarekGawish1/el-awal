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
  const mStr = m < 10 ? `0${m}` : `${m}`;

  return `${h12}:${mStr} ${period}`;
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
 * Checks whether two time intervals [startA, endA) and [startB, endB) overlap in time.
 * If end time is omitted or <= start time, defaults to a standard 90-minute session duration.
 */
export function doTimeIntervalsOverlap(
  startA?: string | null,
  endA?: string | null,
  startB?: string | null,
  endB?: string | null,
): boolean {
  const sA = parseTimeToMinutes(startA);
  const sB = parseTimeToMinutes(startB);
  if (sA === null || sB === null) return false;

  const eA = parseTimeToMinutes(endA);
  const eB = parseTimeToMinutes(endB);

  const resolvedEA = eA !== null && eA > sA ? eA : sA + 90;
  const resolvedEB = eB !== null && eB > sB ? eB : sB + 90;

  return sA < resolvedEB && sB < resolvedEA;
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

/**
 * Checks whether a lesson session has ended plus a 1-hour grace period.
 * Business Rule: Unrecorded students should only be recorded or counted as ABSENT
 * after the session has ended by at least one hour.
 * Before that time, unrecorded students remain pending (null status, not absent).
 */
export function isSessionEndedPlusOneHour(
  sessionDate?: Date | string | null,
  startTime?: string | null,
  endTime?: string | null,
  now: Date = new Date(),
): boolean {
  if (!sessionDate) return false;

  try {
    const dateStr =
      sessionDate instanceof Date
        ? sessionDate.toISOString().split('T')[0]
        : String(sessionDate).trim().split('T')[0];

    const parts = dateStr.split('-').map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return false;
    }
    const [y, m, d] = parts;

    let endMinutes = parseTimeToMinutes(endTime);
    if (endMinutes === null) {
      const startMinutes = parseTimeToMinutes(startTime);
      if (startMinutes !== null) {
        // Default session duration is 2 hours (120 minutes)
        endMinutes = startMinutes + 120;
      } else {
        // Fallback to end of the day
        endMinutes = 23 * 60 + 59;
      }
    }

    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const sessionEndTime = new Date(y, m - 1, d, endHour, endMin, 0, 0);

    const ONE_HOUR_MS = 60 * 60 * 1000;
    return now.getTime() > sessionEndTime.getTime() + ONE_HOUR_MS;
  } catch {
    return false;
  }
}
