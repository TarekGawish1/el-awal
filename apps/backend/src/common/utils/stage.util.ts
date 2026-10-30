/**
 * Canonical Academic Stage Normalizer.
 * Standardizes all educational stages into:
 * - 'PRIMARY' (المرحلة الابتدائية)
 * - 'PREPARATORY' (المرحلة الإعدادية)
 * - 'SECONDARY' (المرحلة الثانوية)
 */
export function normalizeAcademicStage(stage?: string | null, gradeLevel?: string | null): string {
  if (stage) {
    const s = stage.trim();
    if (s === 'PREPARATORY' || s === 'MIDDLE' || s === 'المرحلة الإعدادية' || s.includes('إعدادي')) {
      return 'PREPARATORY';
    }
    if (s === 'PRIMARY' || s === 'المرحلة الابتدائية' || s.includes('ابتدائي')) {
      return 'PRIMARY';
    }
    if (s === 'SECONDARY' || s === 'المرحلة الثانوية' || s.includes('ثانوي')) {
      return 'SECONDARY';
    }
  }

  if (gradeLevel) {
    if (gradeLevel.includes('الابتدائي')) return 'PRIMARY';
    if (gradeLevel.includes('الإعدادي')) return 'PREPARATORY';
    if (gradeLevel.includes('الثانوي')) return 'SECONDARY';
  }

  return stage || '';
}

