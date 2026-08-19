import { describe, it, expect } from 'vitest';
import {
  formatArabicTime12H,
  formatArabicTimeRange12H,
  formatArabicTimeRangeCompact,
  parseTimeToMinutes,
} from '../utils/time.utils';

describe('time.utils', () => {
  describe('formatArabicTime12H', () => {
    it('formats 24-hour time to Arabic 12-hour format', () => {
      expect(formatArabicTime12H('17:00')).toBe('05:00 م');
      expect(formatArabicTime12H('09:30')).toBe('09:30 ص');
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
      expect(formatArabicTimeRangeCompact('17:00', '19:30')).toBe('05:00 - 07:30 م');
      expect(formatArabicTimeRangeCompact('08:00', '09:30')).toBe('08:00 - 09:30 ص');
    });

    it('keeps both meridians when times span different periods', () => {
      expect(formatArabicTimeRangeCompact('11:00', '13:00')).toBe('11:00 ص - 01:00 م');
    });

    it('handles single time values gracefully', () => {
      expect(formatArabicTimeRangeCompact('17:00', null)).toBe('05:00 م');
      expect(formatArabicTimeRangeCompact(null, '19:30')).toBe('07:30 م');
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
});
