import { ACADEMIC_STAGES } from '@/lib/constants/academic-levels';

/**
 * Shared stage/grade derivation for academic groups.
 * Standardized across GroupList, Link Generator Modal, and platform filters.
 */
export const STAGE_ORDER = ['المرحلة الثانوية', 'المرحلة الإعدادية', 'المرحلة الابتدائية', 'أخرى'];

export const ALL_CANONICAL_STAGES = ['المرحلة الثانوية', 'المرحلة الإعدادية', 'المرحلة الابتدائية'];

export const STAGE_GRADES_MAP: Record<string, string[]> = {
  'المرحلة الثانوية': [
    'الصف الأول الثانوي',
    'الصف الثاني الثانوي',
    'الصف الثالث الثانوي',
  ],
  'المرحلة الإعدادية': [
    'الصف الأول الإعدادي',
    'الصف الثاني الإعدادي',
    'الصف الثالث الإعدادي',
  ],
  'المرحلة الابتدائية': [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ],
};

export const getStageName = (gradeLevel: string) => {
  if (!gradeLevel) return 'أخرى';
  if (gradeLevel.includes('الثانوي')) return 'المرحلة الثانوية';
  if (gradeLevel.includes('الإعدادي')) return 'المرحلة الإعدادية';
  if (gradeLevel.includes('الابتدائي')) return 'المرحلة الابتدائية';
  return 'أخرى';
};
