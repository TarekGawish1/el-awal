export interface ProrationResult {
  dayOfMonth: number;
  rateMultiplier: number; // 1.0 (Full), 0.5 (Half), 0.0 (Exempt)
  expectedAmount: number;
  calculationReason: string; // e.g., 'اشتراك كامل', 'نصف اشتراك (انضمام منتصف الشهر)'
}

/**
 * Calculates prorated tuition fee for a student based on enrollment date:
 * - Days 1-9: 100% full monthly fee
 * - Days 10-20: 50% half monthly fee
 * - Days 21+: 0% exempt for current month
 */
export function calculateProratedTuition(
  baseMonthlyFee: number,
  enrollmentDate: Date = new Date(),
): ProrationResult {
  const fee = Math.max(0, Number(baseMonthlyFee) || 0);
  const date = enrollmentDate instanceof Date && !isNaN(enrollmentDate.getTime())
    ? enrollmentDate
    : new Date();
  const day = date.getDate();

  if (day >= 1 && day <= 9) {
    return {
      dayOfMonth: day,
      rateMultiplier: 1.0,
      expectedAmount: fee,
      calculationReason: 'اشتراك شهر كامل (انضمام قبل يوم 10)',
    };
  }

  if (day >= 10 && day <= 20) {
    return {
      dayOfMonth: day,
      rateMultiplier: 0.5,
      expectedAmount: Math.round(fee * 0.5),
      calculationReason: 'نصف شهر (انضمام بين يوم 10 و 20 في الشهر)',
    };
  }

  // Day 21 onwards
  return {
    dayOfMonth: day,
    rateMultiplier: 0.0,
    expectedAmount: 0,
    calculationReason: 'معفى من اشتراك الشهر الحالي (انضمام بعد يوم 20)',
  };
}

/**
 * Checks whether the given enrollment date falls strictly within the specified billing month & year.
 */
export function isEnrolledInPeriod(
  enrollmentDate: Date | string | null | undefined,
  periodYear: number,
  periodMonth: number,
): boolean {
  if (!enrollmentDate) return false;
  const d = new Date(enrollmentDate);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === periodYear && (d.getMonth() + 1) === periodMonth;
}

/**
 * Checks whether the billing period is before the student's enrollment date.
 */
export function isPeriodBeforeEnrollment(
  enrollmentDate: Date | string | null | undefined,
  periodYear: number,
  periodMonth: number,
): boolean {
  if (!enrollmentDate) return false;
  const d = new Date(enrollmentDate);
  if (isNaN(d.getTime())) return false;
  const enrollYear = d.getFullYear();
  const enrollMonth = d.getMonth() + 1;
  return periodYear < enrollYear || (periodYear === enrollYear && periodMonth < enrollMonth);
}
