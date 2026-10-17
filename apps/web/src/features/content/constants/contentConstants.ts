export const ALL_GRADE_LEVELS = [
  { value: 'الصف الأول الثانوي', label: 'الصف الأول الثانوي' },
  { value: 'الصف الثاني الثانوي', label: 'الصف الثاني الثانوي' },
  { value: 'الصف الثالث الثانوي', label: 'الصف الثالث الثانوي' },
  { value: 'الصف الأول الإعدادي', label: 'الصف الأول الإعدادي' },
  { value: 'الصف الثاني الإعدادي', label: 'الصف الثاني الإعدادي' },
  { value: 'الصف الثالث الإعدادي', label: 'الصف الثالث الإعدادي' },
  { value: 'الصف الأول الابتدائي', label: 'الصف الأول الابتدائي' },
  { value: 'الصف الثاني الابتدائي', label: 'الصف الثاني الابتدائي' },
  { value: 'الصف الثالث الابتدائي', label: 'الصف الثالث الابتدائي' },
  { value: 'الصف الرابع الابتدائي', label: 'الصف الرابع الابتدائي' },
  { value: 'الصف الخامس الابتدائي', label: 'الصف الخامس الابتدائي' },
  { value: 'الصف السادس الابتدائي', label: 'الصف السادس الابتدائي' },
];

export const STAGE_GRADES_MAP: Record<string, string[]> = {
  'المرحلة الابتدائية': [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ],
  'المرحلة الإعدادية': [
    'الصف الأول الإعدادي',
    'الصف الثاني الإعدادي',
    'الصف الثالث الإعدادي',
  ],
  'المرحلة الثانوية': [
    'الصف الأول الثانوي',
    'الصف الثاني الثانوي',
    'الصف الثالث الثانوي',
  ],
};

export const STAGE_OPTIONS = [
  { value: '', label: '-- جميع المراحل الدراسية --' },
  { value: 'المرحلة الابتدائية', label: 'المرحلة الابتدائية' },
  { value: 'المرحلة الإعدادية', label: 'المرحلة الإعدادية' },
  { value: 'المرحلة الثانوية', label: 'المرحلة الثانوية' },
];

export function getStageFromGrade(grade?: string | null): string {
  if (!grade) return '';
  if (grade.includes('الابتدائي')) return 'المرحلة الابتدائية';
  if (grade.includes('الإعدادي')) return 'المرحلة الإعدادية';
  if (grade.includes('الثانوي')) return 'المرحلة الثانوية';
  return '';
}

export const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
