import { describe, it, expect } from 'vitest';
import {
  formatJoiningDate,
  formatJoiningTime,
  formatJoiningDateTime,
  getJoiningRelativeTime,
  resolveJoiningMethod,
} from '../studentJoiningHelpers';

describe('studentJoiningHelpers', () => {
  describe('formatJoiningDate', () => {
    it('returns "—" for falsy or invalid dates', () => {
      expect(formatJoiningDate(null)).toBe('—');
      expect(formatJoiningDate(undefined)).toBe('—');
      expect(formatJoiningDate('invalid-date')).toBe('—');
    });

    it('formats a valid date into Arabic format', () => {
      const formatted = formatJoiningDate('2026-10-25T10:30:00Z');
      expect(formatted).toBeDefined();
      expect(formatted).not.toBe('—');
    });
  });

  describe('formatJoiningTime', () => {
    it('returns empty string for falsy dates', () => {
      expect(formatJoiningTime(null)).toBe('');
      expect(formatJoiningTime('')).toBe('');
    });

    it('formats time in Arabic 12h format', () => {
      const formatted = formatJoiningTime('2026-10-25T10:30:00Z');
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('formatJoiningDateTime', () => {
    it('combines date and time', () => {
      const formatted = formatJoiningDateTime('2026-10-25T10:30:00Z');
      expect(formatted).toBeDefined();
      expect(formatted).not.toBe('—');
    });
  });

  describe('getJoiningRelativeTime', () => {
    it('returns relative time for recent timestamps', () => {
      const now = new Date();
      expect(getJoiningRelativeTime(now.toISOString())).toBe('الآن');

      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(getJoiningRelativeTime(fiveMinutesAgo.toISOString())).toBe('منذ 5 دقيقة');
    });
  });

  describe('resolveJoiningMethod', () => {
    it('identifies group link joins from createdByName', () => {
      const result = resolveJoiningMethod({
        createdByName: 'رابط انضمام: مجموعة الثانوية العامة أ',
      });
      expect(result.type).toBe('GROUP_LINK');
      expect(result.isGroupLink).toBe(true);
      expect(result.label).toBe('انضمام عبر رابط المجموعة');
      expect(result.groupName).toBe('مجموعة الثانوية العامة أ');
    });

    it('identifies manual registrations from creator name', () => {
      const result = resolveJoiningMethod({
        createdByName: 'أ. أحمد غريب',
      });
      expect(result.type).toBe('MANUAL');
      expect(result.isGroupLink).toBe(false);
      expect(result.label).toContain('أ. أحمد غريب');
    });

    it('defaults to SYSTEM when creator is missing', () => {
      const result = resolveJoiningMethod({});
      expect(result.type).toBe('SYSTEM');
      expect(result.isGroupLink).toBe(false);
    });
  });
});
