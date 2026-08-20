export type AcademicStageKey = 'PRIMARY' | 'MIDDLE' | 'SECONDARY';

export interface AcademicStageOption {
  id: AcademicStageKey;
  label: string;
  shortLabel: string;
}

export interface GradeOption {
  label: string;
  value: string;
}

/**
 * Canonical academic stage → grade mapping shared across the platform so that
 * student self-registration, secretary student creation and groups use the same
 * values (single source of truth — no second academic-stage system).
 */
export const ACADEMIC_STAGES: AcademicStageOption[] = [
  { id: 'PRIMARY', label: 'المرحلة الابتدائية', shortLabel: 'الابتدائية' },
  { id: 'MIDDLE', label: 'المرحلة الإعدادية', shortLabel: 'الإعدادية' },
  { id: 'SECONDARY', label: 'المرحلة الثانوية', shortLabel: 'الثانوية' },
];

export const GRADE_LEVELS: Record<AcademicStageKey, GradeOption[]> = {
  PRIMARY: [
    { label: 'الصف الأول الابتدائي', value: 'الصف الأول الابتدائي' },
    { label: 'الصف الثاني الابتدائي', value: 'الصف الثاني الابتدائي' },
    { label: 'الصف الثالث الابتدائي', value: 'الصف الثالث الابتدائي' },
    { label: 'الصف الرابع الابتدائي', value: 'الصف الرابع الابتدائي' },
    { label: 'الصف الخامس الابتدائي', value: 'الصف الخامس الابتدائي' },
    { label: 'الصف السادس الابتدائي', value: 'الصف السادس الابتدائي' },
  ],
  MIDDLE: [
    { label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
    { label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
    { label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
  ],
  SECONDARY: [
    { label: 'الصف الأول الثانوي', value: 'الصف الأول الثانوي' },
    { label: 'الصف الثاني الثانوي', value: 'الصف الثاني الثانوي' },
    { label: 'الصف الثالث الثانوي', value: 'الصف الثالث الثانوي' },
  ],
};

export function isAcademicStageKey(value: string): value is AcademicStageKey {
  return value === 'PRIMARY' || value === 'MIDDLE' || value === 'SECONDARY';
}
