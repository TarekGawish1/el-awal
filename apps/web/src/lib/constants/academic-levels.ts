export type AcademicStageKey = 'PRIMARY' | 'MIDDLE' | 'PREPARATORY' | 'SECONDARY';

export interface GradeOption {
  id?: string;
  name?: string;
  label: string;
  value: string;
}

export interface AcademicStageOption {
  id: string;
  name: string;
  label: string;
  shortLabel: string;
  grades: GradeOption[];
}

/**
 * Canonical academic stages & grade levels mapping shared across the platform
 * so that student self-registration, secretary student creation, groups, link generators,
 * and finance filters use the same complete, standardized values.
 */
export const ACADEMIC_STAGES: readonly AcademicStageOption[] = [
  {
    id: 'SECONDARY',
    name: 'المرحلة الثانوية',
    label: 'المرحلة الثانوية',
    shortLabel: 'الثانوية',
    grades: [
      { id: 'SEC_1', name: 'الصف الأول الثانوي', label: 'الصف الأول الثانوي', value: 'الصف الأول الثانوي' },
      { id: 'SEC_2', name: 'الصف الثاني الثانوي', label: 'الصف الثاني الثانوي', value: 'الصف الثاني الثانوي' },
      { id: 'SEC_3', name: 'الصف الثالث الثانوي', label: 'الصف الثالث الثانوي', value: 'الصف الثالث الثانوي' },
    ],
  },
  {
    id: 'PREPARATORY',
    name: 'المرحلة الإعدادية',
    label: 'المرحلة الإعدادية',
    shortLabel: 'الإعدادية',
    grades: [
      { id: 'PREP_1', name: 'الصف الأول الإعدادي', label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
      { id: 'PREP_2', name: 'الصف الثاني الإعدادي', label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
      { id: 'PREP_3', name: 'الصف الثالث الإعدادي', label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
    ],
  },
  {
    id: 'PRIMARY',
    name: 'المرحلة الابتدائية',
    label: 'المرحلة الابتدائية',
    shortLabel: 'الابتدائية',
    grades: [
      { id: 'PRIM_1', name: 'الصف الأول الابتدائي', label: 'الصف الأول الابتدائي', value: 'الصف الأول الابتدائي' },
      { id: 'PRIM_2', name: 'الصف الثاني الابتدائي', label: 'الصف الثاني الابتدائي', value: 'الصف الثاني الابتدائي' },
      { id: 'PRIM_3', name: 'الصف الثالث الابتدائي', label: 'الصف الثالث الابتدائي', value: 'الصف الثالث الابتدائي' },
      { id: 'PRIM_4', name: 'الصف الرابع الابتدائي', label: 'الصف الرابع الابتدائي', value: 'الصف الرابع الابتدائي' },
      { id: 'PRIM_5', name: 'الصف الخامس الابتدائي', label: 'الصف الخامس الابتدائي', value: 'الصف الخامس الابتدائي' },
      { id: 'PRIM_6', name: 'الصف السادس الابتدائي', label: 'الصف السادس الابتدائي', value: 'الصف السادس الابتدائي' },
    ],
  },
] as const;

export const GRADE_LEVELS: Record<string, GradeOption[]> = {
  PRIMARY: [
    { id: 'PRIM_1', name: 'الصف الأول الابتدائي', label: 'الصف الأول الابتدائي', value: 'الصف الأول الابتدائي' },
    { id: 'PRIM_2', name: 'الصف الثاني الابتدائي', label: 'الصف الثاني الابتدائي', value: 'الصف الثاني الابتدائي' },
    { id: 'PRIM_3', name: 'الصف الثالث الابتدائي', label: 'الصف الثالث الابتدائي', value: 'الصف الثالث الابتدائي' },
    { id: 'PRIM_4', name: 'الصف الرابع الابتدائي', label: 'الصف الرابع الابتدائي', value: 'الصف الرابع الابتدائي' },
    { id: 'PRIM_5', name: 'الصف الخامس الابتدائي', label: 'الصف الخامس الابتدائي', value: 'الصف الخامس الابتدائي' },
    { id: 'PRIM_6', name: 'الصف السادس الابتدائي', label: 'الصف السادس الابتدائي', value: 'الصف السادس الابتدائي' },
  ],
  PREPARATORY: [
    { id: 'PREP_1', name: 'الصف الأول الإعدادي', label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
    { id: 'PREP_2', name: 'الصف الثاني الإعدادي', label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
    { id: 'PREP_3', name: 'الصف الثالث الإعدادي', label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
  ],
  MIDDLE: [
    { id: 'PREP_1', name: 'الصف الأول الإعدادي', label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
    { id: 'PREP_2', name: 'الصف الثاني الإعدادي', label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
    { id: 'PREP_3', name: 'الصف الثالث الإعدادي', label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
  ],
  SECONDARY: [
    { id: 'SEC_1', name: 'الصف الأول الثانوي', label: 'الصف الأول الثانوي', value: 'الصف الأول الثانوي' },
    { id: 'SEC_2', name: 'الصف الثاني الثانوي', label: 'الصف الثاني الثانوي', value: 'الصف الثاني الثانوي' },
    { id: 'SEC_3', name: 'الصف الثالث الثانوي', label: 'الصف الثالث الثانوي', value: 'الصف الثالث الثانوي' },
  ],
};

export function isAcademicStageKey(value: string): value is AcademicStageKey {
  return value === 'PRIMARY' || value === 'MIDDLE' || value === 'PREPARATORY' || value === 'SECONDARY';
}
