export const GRADE_LEVELS_BY_STAGE: Record<string, string[]> = {
  PRIMARY: [
    'الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي',
  ],
  PREPARATORY: ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'],
  SECONDARY: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
};

export function inferStageFromGrade(gradeLevel?: string | null) {
  if (!gradeLevel) return '';
  return Object.entries(GRADE_LEVELS_BY_STAGE).find(([, grades]) => grades.includes(gradeLevel))?.[0] || '';
}