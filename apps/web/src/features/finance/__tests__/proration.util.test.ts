import { describe, it, expect } from 'vitest';
import {
  calculateProratedTuition,
  isEnrolledInPeriod,
  isPeriodBeforeEnrollment,
} from '../utils/proration.util';

describe('Frontend calculateProratedTuition', () => {
  const baseMonthlyFee = 200;

  it('charges full 100% fee for enrollment between day 1 and 9', () => {
    const d1 = new Date(2026, 8, 1);
    const d9 = new Date(2026, 8, 9);
    expect(calculateProratedTuition(baseMonthlyFee, d1)).toMatchObject({
      rateMultiplier: 1.0,
      expectedAmount: 200,
      calculationReason: 'اشتراك شهر كامل (انضمام قبل يوم 10)',
    });
    expect(calculateProratedTuition(baseMonthlyFee, d9)).toMatchObject({
      rateMultiplier: 1.0,
      expectedAmount: 200,
    });
  });

  it('charges half 50% fee for enrollment between day 10 and 20', () => {
    const d10 = new Date(2026, 8, 10);
    const d15 = new Date(2026, 8, 15);
    const d20 = new Date(2026, 8, 20);
    expect(calculateProratedTuition(baseMonthlyFee, d10)).toMatchObject({
      rateMultiplier: 0.5,
      expectedAmount: 100,
      calculationReason: 'نصف شهر (انضمام بين يوم 10 و 20 في الشهر)',
    });
    expect(calculateProratedTuition(baseMonthlyFee, d15).expectedAmount).toBe(100);
    expect(calculateProratedTuition(baseMonthlyFee, d20).expectedAmount).toBe(100);
  });

  it('exempts students enrolling on day 21 onwards', () => {
    const d21 = new Date(2026, 8, 21);
    const d30 = new Date(2026, 8, 30);
    expect(calculateProratedTuition(baseMonthlyFee, d21)).toMatchObject({
      rateMultiplier: 0.0,
      expectedAmount: 0,
      calculationReason: 'معفى من اشتراك الشهر الحالي (انضمام بعد يوم 20)',
    });
    expect(calculateProratedTuition(baseMonthlyFee, d30).expectedAmount).toBe(0);
  });

  it('handles period validation helpers', () => {
    const d = new Date('2026-09-14T00:00:00Z');
    expect(isEnrolledInPeriod(d, 2026, 9)).toBe(true);
    expect(isEnrolledInPeriod(d, 2026, 8)).toBe(false);
    expect(isPeriodBeforeEnrollment(d, 2026, 8)).toBe(true);
    expect(isPeriodBeforeEnrollment(d, 2026, 9)).toBe(false);
  });
});
