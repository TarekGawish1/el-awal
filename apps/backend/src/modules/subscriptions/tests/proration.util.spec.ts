import {
  calculateProratedTuition,
  isEnrolledInPeriod,
  isPeriodBeforeEnrollment,
} from '../utils/proration.util';

describe('calculateProratedTuition', () => {
  const baseMonthlyFee = 200;

  describe('Day 1 to 9 (100% Full Fee)', () => {
    it('should charge full fee on day 1', () => {
      const date = new Date(2026, 8, 1); // Sept 1
      const result = calculateProratedTuition(baseMonthlyFee, date);
      expect(result).toEqual({
        dayOfMonth: 1,
        rateMultiplier: 1.0,
        expectedAmount: 200,
        calculationReason: 'اشتراك شهر كامل (انضمام قبل يوم 10)',
      });
    });

    it('should charge full fee on day 9', () => {
      const date = new Date(2026, 8, 9); // Sept 9
      const result = calculateProratedTuition(baseMonthlyFee, date);
      expect(result).toEqual({
        dayOfMonth: 9,
        rateMultiplier: 1.0,
        expectedAmount: 200,
        calculationReason: 'اشتراك شهر كامل (انضمام قبل يوم 10)',
      });
    });
  });

  describe('Day 10 to 20 (50% Half Fee)', () => {
    it('should charge half fee on day 10', () => {
      const date = new Date(2026, 8, 10); // Sept 10
      const result = calculateProratedTuition(baseMonthlyFee, date);
      expect(result).toEqual({
        dayOfMonth: 10,
        rateMultiplier: 0.5,
        expectedAmount: 100,
        calculationReason: 'نصف شهر (انضمام بين يوم 10 و 20 في الشهر)',
      });
    });

    it('should charge half fee on day 15', () => {
      const date = new Date(2026, 8, 15); // Sept 15
      const result = calculateProratedTuition(baseMonthlyFee, date);
      expect(result).toEqual({
        dayOfMonth: 15,
        rateMultiplier: 0.5,
        expectedAmount: 100,
        calculationReason: 'نصف شهر (انضمام بين يوم 10 و 20 في الشهر)',
      });
    });

    it('should charge half fee on day 20', () => {
      const date = new Date(2026, 8, 20); // Sept 20
      const result = calculateProratedTuition(baseMonthlyFee, date);
      expect(result).toEqual({
        dayOfMonth: 20,
        rateMultiplier: 0.5,
        expectedAmount: 100,
        calculationReason: 'نصف شهر (انضمام بين يوم 10 و 20 في الشهر)',
      });
    });

    it('should round half fee properly for odd amounts (e.g. 355 EGP -> 178 EGP)', () => {
      const date = new Date(2026, 8, 14);
      const result = calculateProratedTuition(355, date);
      expect(result.expectedAmount).toBe(178);
      expect(result.rateMultiplier).toBe(0.5);
    });
  });

  describe('Day 21 onwards (0% Exempt for current month)', () => {
    it('should exempt student enrolled on day 21', () => {
      const date = new Date(2026, 8, 21); // Sept 21
      const result = calculateProratedTuition(baseMonthlyFee, date);
      expect(result).toEqual({
        dayOfMonth: 21,
        rateMultiplier: 0.0,
        expectedAmount: 0,
        calculationReason: 'معفى من اشتراك الشهر الحالي (انضمام بعد يوم 20)',
      });
    });

    it('should exempt student enrolled on day 31', () => {
      const date = new Date(2026, 7, 31); // Aug 31
      const result = calculateProratedTuition(baseMonthlyFee, date);
      expect(result).toEqual({
        dayOfMonth: 31,
        rateMultiplier: 0.0,
        expectedAmount: 0,
        calculationReason: 'معفى من اشتراك الشهر الحالي (انضمام بعد يوم 20)',
      });
    });
  });

  describe('Edge cases and defaults', () => {
    it('should default to current date when enrollmentDate is omitted', () => {
      const result = calculateProratedTuition(baseMonthlyFee);
      expect(result.dayOfMonth).toBe(new Date().getDate());
      expect([1.0, 0.5, 0.0]).toContain(result.rateMultiplier);
    });

    it('should handle zero or negative base monthly fee safely', () => {
      const date = new Date(2026, 8, 5);
      const result = calculateProratedTuition(0, date);
      expect(result.expectedAmount).toBe(0);
      expect(result.rateMultiplier).toBe(1.0);
    });
  });
});

describe('Period helpers', () => {
  const enrollmentDate = new Date('2026-09-15T10:00:00Z');

  it('isEnrolledInPeriod should return true only for matching year and month', () => {
    expect(isEnrolledInPeriod(enrollmentDate, 2026, 9)).toBe(true);
    expect(isEnrolledInPeriod(enrollmentDate, 2026, 10)).toBe(false);
    expect(isEnrolledInPeriod(enrollmentDate, 2025, 9)).toBe(false);
    expect(isEnrolledInPeriod(null, 2026, 9)).toBe(false);
  });

  it('isPeriodBeforeEnrollment should return true for periods prior to enrollment', () => {
    expect(isPeriodBeforeEnrollment(enrollmentDate, 2026, 8)).toBe(true);
    expect(isPeriodBeforeEnrollment(enrollmentDate, 2025, 12)).toBe(true);
    expect(isPeriodBeforeEnrollment(enrollmentDate, 2026, 9)).toBe(false);
    expect(isPeriodBeforeEnrollment(enrollmentDate, 2026, 10)).toBe(false);
    expect(isPeriodBeforeEnrollment(null, 2026, 8)).toBe(false);
  });
});
