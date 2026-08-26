import { describe, it, expect } from 'vitest';
import {
  formatArabicTime12H,
  formatArabicTimeRange12H,
  formatArabicTimeRangeCompact,
  parseTimeToMinutes,
  doTimeIntervalsOverlap,
  findSessionConflict,
  findSameDayGroupSession,
  calculateOverlappingColumns,
  getGradeLevelTheme,
  toLocalDateStr,
} from '../utils/time.utils';

describe('time.utils', () => {
  describe('formatArabicTime12H', () => {
    it('formats 24-hour time to Arabic 12-hour format', () => {
      expect(formatArabicTime12H('17:00')).toBe('5:00 م');
      expect(formatArabicTime12H('09:30')).toBe('9:30 ص');
      expect(formatArabicTime12H('12:00')).toBe('12:00 م');
      expect(formatArabicTime12H('00:00')).toBe('12:00 ص');
    });

    it('returns empty string for null or empty input', () => {
      expect(formatArabicTime12H(null)).toBe('');
      expect(formatArabicTime12H('')).toBe('');
      expect(formatArabicTime12H(undefined)).toBe('');
    });
  });

  describe('formatArabicTimeRangeCompact', () => {
    it('omits repeated meridian when both times are in the same period', () => {
      expect(formatArabicTimeRangeCompact('17:00', '19:30')).toBe('5:00 - 7:30 م');
      expect(formatArabicTimeRangeCompact('08:00', '09:30')).toBe('8:00 - 9:30 ص');
    });

    it('keeps both meridians when times span different periods', () => {
      expect(formatArabicTimeRangeCompact('11:00', '13:00')).toBe('11:00 ص - 1:00 م');
    });

    it('handles single time values gracefully', () => {
      expect(formatArabicTimeRangeCompact('17:00', null)).toBe('5:00 م');
      expect(formatArabicTimeRangeCompact(null, '19:30')).toBe('7:30 م');
      expect(formatArabicTimeRangeCompact(null, null)).toBe('');
    });
  });

  describe('parseTimeToMinutes', () => {
    it('converts time strings to total minutes from midnight', () => {
      expect(parseTimeToMinutes('08:00')).toBe(480);
      expect(parseTimeToMinutes('16:30')).toBe(990);
      expect(parseTimeToMinutes('05:00 م')).toBe(1020);
      expect(parseTimeToMinutes('09:00 ص')).toBe(540);
    });
  });

  describe('doTimeIntervalsOverlap', () => {
    it('detects partial and full overlaps correctly', () => {
      // 15:00 - 17:00 (3pm - 5pm) and 16:00 - 18:00 (4pm - 6pm) overlap!
      expect(doTimeIntervalsOverlap('15:00', '17:00', '16:00', '18:00')).toBe(true);
      expect(doTimeIntervalsOverlap('16:00', '18:00', '15:00', '17:00')).toBe(true);

      // Back-to-back sessions: 15:00-17:00 and 17:00-19:00 do NOT overlap
      expect(doTimeIntervalsOverlap('15:00', '17:00', '17:00', '19:00')).toBe(false);

      // Completely separate sessions
      expect(doTimeIntervalsOverlap('09:00', '11:00', '14:00', '16:00')).toBe(false);

      // Nested session
      expect(doTimeIntervalsOverlap('14:00', '18:00', '15:00', '16:00')).toBe(true);
    });

    it('handles Arabic formatted times and missing end times', () => {
      // 03:00 م (15:00) with default 90m (until 16:30) overlaps with 04:00 م (16:00)
      expect(doTimeIntervalsOverlap('03:00 م', null, '04:00 م', '06:00 م')).toBe(true);
      // 08:00 ص with default 90m (until 09:30) does not overlap with 10:00 ص
      expect(doTimeIntervalsOverlap('08:00 ص', null, '10:00 ص', null)).toBe(false);
    });
  });

  describe('findSessionConflict', () => {
    const sampleSessions = [
      {
        id: 's1',
        sessionDate: '2026-10-31',
        startTime: '15:00',
        endTime: '17:00',
        topic: 'حصة تالته ثانوي',
        isCancelled: false,
      },
      {
        id: 's2',
        sessionDate: '2026-10-31',
        startTime: '18:00',
        endTime: '20:00',
        topic: 'حصة تانية ثانوي',
        isCancelled: false,
      },
      {
        id: 's3',
        sessionDate: '2026-10-31',
        startTime: '16:00',
        endTime: '17:30',
        topic: 'حصة ملغاة',
        isCancelled: true,
      },
    ];

    it('finds conflicting non-cancelled sessions on same date', () => {
      // Trying to add 16:00 - 18:00 on 2026-10-31 collides with s1 (15:00 - 17:00)
      const conflict = findSessionConflict(sampleSessions, '2026-10-31', '16:00', '18:00');
      expect(conflict).not.toBeNull();
      expect(conflict?.id).toBe('s1');
    });

    it('ignores cancelled sessions when checking conflict', () => {
      // 16:30 - 17:15 only overlaps with s1 (15:00-17:00), but 17:00-17:30 only overlaps with cancelled s3
      const conflict = findSessionConflict(sampleSessions, '2026-10-31', '17:00', '17:30');
      expect(conflict).toBeNull();
    });

    it('excludes current session id during updates', () => {
      // s1 updating its own time within 15:00 - 16:30 should not conflict with itself
      const conflict = findSessionConflict(sampleSessions, '2026-10-31', '15:00', '16:30', 's1');
      expect(conflict).toBeNull();
    });
  });

  describe('findSameDayGroupSession', () => {
    const sampleSessions = [
      {
        id: 'g1',
        groupId: 'group-1',
        sessionDate: '2026-10-31',
        startTime: '15:00',
        endTime: '17:00',
        topic: 'حصة أولى ثانوي',
        isCancelled: false,
      },
      {
        id: 'g2',
        groupId: 'group-2',
        sessionDate: '2026-10-31',
        startTime: '18:00',
        endTime: '20:00',
        topic: 'حصة تانية ثانوي',
        isCancelled: false,
      },
      {
        id: 'g3',
        groupId: 'group-1',
        sessionDate: '2026-10-31',
        startTime: '10:00',
        topic: 'حصة ملغاة',
        isCancelled: true,
      },
      {
        id: 'g4',
        groupId: 'group-1',
        sessionDate: '2026-11-01',
        startTime: '15:00',
        topic: 'حصة اليوم التالي',
        isCancelled: false,
      },
    ];

    it('finds an existing session for the same group on the same day regardless of time', () => {
      const found = findSameDayGroupSession(sampleSessions, '2026-10-31', 'group-1');
      expect(found?.id).toBe('g1');
    });

    it('ignores sessions of other groups and other days', () => {
      const found = findSameDayGroupSession(sampleSessions, '2026-10-31', 'group-2');
      expect(found?.id).toBe('g2');
      const nextDay = findSameDayGroupSession(sampleSessions, '2026-11-01', 'group-1');
      expect(nextDay?.id).toBe('g4');
    });

    it('ignores cancelled sessions', () => {
      const found = findSameDayGroupSession(
        [sampleSessions[2]],
        '2026-10-31',
        'group-1',
      );
      expect(found).toBeNull();
    });

    it('excludes the current session id during updates', () => {
      const found = findSameDayGroupSession(sampleSessions, '2026-10-31', 'group-1', 'g1');
      expect(found).toBeNull();
    });
  });

  describe('calculateOverlappingColumns', () => {
    it('assigns separate columns to concurrent overlapping sessions', () => {
      const daySessions = [
        {
          id: 'session-1',
          sessionDate: '2026-10-31',
          startTime: '15:00',
          endTime: '17:00',
        },
        {
          id: 'session-2',
          sessionDate: '2026-10-31',
          startTime: '16:00',
          endTime: '18:00',
        },
      ];

      const layout = calculateOverlappingColumns(daySessions);
      expect(layout.size).toBe(2);

      const info1 = layout.get('session-1');
      const info2 = layout.get('session-2');

      expect(info1?.colCount).toBe(2);
      expect(info2?.colCount).toBe(2);
      expect(info1?.colIndex).not.toBe(info2?.colIndex);
      expect(info1?.hasConflict).toBe(true);
      expect(info2?.hasConflict).toBe(true);
    });

    it('assigns single column when sessions do not overlap', () => {
      const daySessions = [
        {
          id: 's1',
          sessionDate: '2026-10-31',
          startTime: '09:00',
          endTime: '11:00',
        },
        {
          id: 's2',
          sessionDate: '2026-10-31',
          startTime: '13:00',
          endTime: '15:00',
        },
      ];

      const layout = calculateOverlappingColumns(daySessions);
      expect(layout.get('s1')?.colCount).toBe(1);
      expect(layout.get('s2')?.colCount).toBe(1);
      expect(layout.get('s1')?.hasConflict).toBe(false);
      expect(layout.get('s2')?.hasConflict).toBe(false);
    });
  });

  describe('getGradeLevelTheme', () => {
    it('returns consistent predefined theme for recognized grade levels', () => {
      const theme3rd = getGradeLevelTheme('الصف الثالث الثانوي');
      const theme2nd = getGradeLevelTheme('الصف الثاني الثانوي');
      expect(theme3rd.bg).toContain('indigo');
      expect(theme2nd.bg).toContain('purple');
    });
  });
});

