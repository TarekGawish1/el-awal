/**
 * Parses time string (HH:MM 24h, 12h AM/PM, or Arabic 12h م/ص) into total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
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
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3]?.toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Checks whether a lesson session has ended by at least one hour (grace period).
 * Students should only be recorded or counted as absent after session end + 1 hour.
 */
export function isSessionEndedPlusOneHour(
  sessionDate?: Date | string | null,
  startTime?: string | null,
  endTime?: string | null,
  now = new Date(),
): boolean {
  if (!sessionDate) return false;

  try {
    const dateStr = sessionDate instanceof Date
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
        // Fallback to end of day
        endMinutes = 23 * 60 + 59;
      }
    }

    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const sessionEndTime = new Date(y, m - 1, d, endHour, endMin, 0, 0);

    const ONE_HOUR = 60 * 60 * 1000;
    return now.getTime() > (sessionEndTime.getTime() + ONE_HOUR);
  } catch {
    return false;
  }
}
