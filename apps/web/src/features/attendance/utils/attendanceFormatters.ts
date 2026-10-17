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

export const getStageName = (gradeLevel?: string): string => {
  if (!gradeLevel) return 'أخرى';
  if (gradeLevel.includes('الابتدائي')) return 'المرحلة الابتدائية';
  if (gradeLevel.includes('الإعدادي')) return 'المرحلة الإعدادية';
  if (gradeLevel.includes('الثانوي')) return 'المرحلة الثانوية';
  return 'أخرى';
};

export function formatTime12h(time24?: string): string {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  if (isNaN(h)) return time24;
  const ampm = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function isSessionTooEarly(activeSessionObj: any): boolean {
  if (!activeSessionObj?.sessionDate || !activeSessionObj?.startTime) return false;
  const dateStr = activeSessionObj.sessionDate.includes('T')
    ? activeSessionObj.sessionDate.split('T')[0]
    : activeSessionObj.sessionDate;
  const timePart =
    activeSessionObj.startTime.split(':').length === 2
      ? `${activeSessionObj.startTime}:00`
      : activeSessionObj.startTime;
  const sessionDateTime = new Date(`${dateStr}T${timePart}`);
  if (isNaN(sessionDateTime.getTime())) return false;
  const now = new Date();
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  return now.getTime() < sessionDateTime.getTime() - FIFTEEN_MINUTES;
}

export function isSessionEnded(activeSessionObj: any): boolean {
  if (!activeSessionObj?.sessionDate || !activeSessionObj?.endTime) return false;
  const dateStr = activeSessionObj.sessionDate.includes('T')
    ? activeSessionObj.sessionDate.split('T')[0]
    : activeSessionObj.sessionDate;
  const timePart =
    activeSessionObj.endTime.split(':').length === 2
      ? `${activeSessionObj.endTime}:00`
      : activeSessionObj.endTime;
  const sessionEndDateTime = new Date(`${dateStr}T${timePart}`);
  if (isNaN(sessionEndDateTime.getTime())) return false;
  const now = new Date();
  return now.getTime() > sessionEndDateTime.getTime();
}
