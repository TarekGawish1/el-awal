import { describe, it, expect } from 'vitest';
import { formatPercentage, formatNumber, formatArabicTime } from './formatters';

describe('Formatters Utilities', () => {
  describe('formatPercentage', () => {
    it('formats numbers to 1 decimal place with % symbol', () => {
      expect(formatPercentage(92.423)).toBe('92.4%');
      expect(formatPercentage(100)).toBe('100.0%');
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('handles undefined or null gracefully', () => {
      expect(formatPercentage(undefined)).toBe('—');
      expect(formatPercentage(null)).toBe('—');
      expect(formatPercentage(NaN)).toBe('—');
    });
  });

  describe('formatNumber', () => {
    it('formats thousands with commas', () => {
      expect(formatNumber(1284)).toBe('1,284');
      expect(formatNumber(50)).toBe('50');
      expect(formatNumber(0)).toBe('0');
    });

    it('handles null/undefined gracefully', () => {
      expect(formatNumber(null)).toBe('—');
      expect(formatNumber(undefined)).toBe('—');
    });
  });

  describe('formatArabicTime', () => {
    it('formats 24-hour string into 12-hour Arabic time with AM/PM indicator', () => {
      expect(formatArabicTime('17:00')).toBe('5:00 م');
      expect(formatArabicTime('09:30')).toBe('9:30 ص');
      expect(formatArabicTime('12:00')).toBe('12:00 م');
    });

    it('handles empty input gracefully', () => {
      expect(formatArabicTime('')).toBe('—');
      expect(formatArabicTime(null)).toBe('—');
    });
  });
});
