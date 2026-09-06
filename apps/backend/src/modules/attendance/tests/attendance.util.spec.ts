import { parseTimeToMinutes, isSessionEndedPlusOneHour } from '../utils/attendance.util';

describe('Attendance Utilities - Session End & 1-Hour Grace Period', () => {
  describe('parseTimeToMinutes', () => {
    it('should parse 24-hour time strings correctly', () => {
      expect(parseTimeToMinutes('16:00')).toBe(16 * 60);
      expect(parseTimeToMinutes('08:30')).toBe(8 * 60 + 30);
      expect(parseTimeToMinutes('00:00')).toBe(0);
    });

    it('should parse 12-hour Arabic time strings correctly', () => {
      expect(parseTimeToMinutes('04:00 م')).toBe(16 * 60);
      expect(parseTimeToMinutes('04:00 ص')).toBe(4 * 60);
      expect(parseTimeToMinutes('12:00 م')).toBe(12 * 60);
      expect(parseTimeToMinutes('12:00 ص')).toBe(0);
    });

    it('should parse 12-hour English AM/PM strings correctly', () => {
      expect(parseTimeToMinutes('04:00 PM')).toBe(16 * 60);
      expect(parseTimeToMinutes('04:00 AM')).toBe(4 * 60);
    });

    it('should return null for invalid or empty inputs', () => {
      expect(parseTimeToMinutes(null)).toBeNull();
      expect(parseTimeToMinutes(undefined)).toBeNull();
      expect(parseTimeToMinutes('')).toBeNull();
    });
  });

  describe('isSessionEndedPlusOneHour', () => {
    const sessionDate = '2026-09-06';
    const startTime = '16:00';
    const endTime = '18:00';

    it('returns false when session is upcoming or ongoing', () => {
      const duringSession = new Date(2026, 8, 6, 17, 0, 0); // 17:00
      expect(isSessionEndedPlusOneHour(sessionDate, startTime, endTime, duringSession)).toBe(false);
    });

    it('returns false during the 1-hour grace period after session end', () => {
      // Session ends at 18:00. At 18:30 (30 mins after end), students should NOT be absent yet
      const thirtyMinsAfter = new Date(2026, 8, 6, 18, 30, 0);
      expect(isSessionEndedPlusOneHour(sessionDate, startTime, endTime, thirtyMinsAfter)).toBe(false);

      // Exactly at 19:00 (1 hour after end)
      const exactlyOneHourAfter = new Date(2026, 8, 6, 19, 0, 0);
      expect(isSessionEndedPlusOneHour(sessionDate, startTime, endTime, exactlyOneHourAfter)).toBe(false);
    });

    it('returns true when more than 1 hour has elapsed after session end', () => {
      // 1 hour and 1 minute after session end (19:01)
      const pastGracePeriod = new Date(2026, 8, 6, 19, 1, 0);
      expect(isSessionEndedPlusOneHour(sessionDate, startTime, endTime, pastGracePeriod)).toBe(true);

      // 3 hours after session end (21:00)
      const laterThatNight = new Date(2026, 8, 6, 21, 0, 0);
      expect(isSessionEndedPlusOneHour(sessionDate, startTime, endTime, laterThatNight)).toBe(true);
    });

    it('returns true for past sessions from previous days', () => {
      const yesterdaySession = '2026-09-05';
      const today = new Date(2026, 8, 6, 10, 0, 0);
      expect(isSessionEndedPlusOneHour(yesterdaySession, startTime, endTime, today)).toBe(true);
    });

    it('returns false for future sessions', () => {
      const tomorrowSession = '2026-09-07';
      const today = new Date(2026, 8, 6, 10, 0, 0);
      expect(isSessionEndedPlusOneHour(tomorrowSession, startTime, endTime, today)).toBe(false);
    });
  });
});
