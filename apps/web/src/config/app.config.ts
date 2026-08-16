/**
 * Global Application Configuration & Metadata
 */

export const APP_CONFIG = {
  name: 'منصة الأول التعليمية',
  description: 'نظام إدارة التعليم وحصص الحضور الذكي والتقييمات للطلاب والمدرسين',
  locale: 'ar-EG',
  defaultAcademicYear: '2026-2027',
  storageKeys: {
    authToken: 'el_awal_token',
    teacherSession: 'el_awal_teacher_session',
  },
} as const;
