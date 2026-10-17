/**
 * Computes the exact UTC Date corresponding to a sessionDate (Date or YYYY-MM-DD string)
 * and a startTime ("HH:mm") in the 'Africa/Cairo' timezone.
 */
export function getSessionUtcDate(sessionDate: Date | string, startTime: string): Date {
  const dateStr =
    sessionDate instanceof Date
      ? sessionDate.toISOString().split('T')[0]
      : String(sessionDate).split('T')[0];

  const [hours, minutes] = (startTime || '00:00').split(':').map(Number);

  const refDate = new Date(`${dateStr}T12:00:00Z`);
  const cairoHourStr = refDate.toLocaleTimeString('en-US', {
    timeZone: 'Africa/Cairo',
    hour12: false,
    hour: 'numeric',
  });
  const cairoHour = parseInt(cairoHourStr, 10);
  const diffHours = cairoHour - 12;

  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hours - diffHours, minutes, 0, 0));
}

/**
 * Returns today's YYYY-MM-DD date string in 'Africa/Cairo'.
 */
export function getCairoTodayString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

/**
 * Returns the start (00:00:00.000) and end (23:59:59.999) of today in 'Africa/Cairo' as UTC Date objects.
 */
export function getCairoTodayBounds(): { start: Date; end: Date; dateStr: string } {
  const dateStr = getCairoTodayString();
  const [y, m, d] = dateStr.split('-').map(Number);

  const refDate = new Date(`${dateStr}T12:00:00Z`);
  const cairoHourStr = refDate.toLocaleTimeString('en-US', {
    timeZone: 'Africa/Cairo',
    hour12: false,
    hour: 'numeric',
  });
  const diffHours = parseInt(cairoHourStr, 10) - 12;

  const start = new Date(Date.UTC(y, m - 1, d, 0 - diffHours, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 23 - diffHours, 59, 59, 999));
  return { start, end, dateStr };
}
