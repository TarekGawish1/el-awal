/**
 * Canonical API Endpoints Constants
 * Aligned with docs/03-Architecture/api-design.md
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    PARENT_ACCESS: '/auth/parent-access',
    STUDENT_REGISTRATION_REGISTER: '/auth/student-registration/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/users/me',
  },
  USERS: {
    ME: '/users/me',
  },
  TEACHER: {
    DASHBOARD_OVERVIEW: '/teachers/dashboard/overview', // Recommended server aggregation contract
    ACADEMIC_PERIOD: '/teachers/academic-period',
  },
  GROUPS: {
    LIST: '/groups',
    CREATE: '/groups',
    DETAIL: (id: string) => `/groups/${id}`,
    UPDATE: (id: string) => `/groups/${id}`,
    DELETE: (id: string) => `/groups/${id}`,
    STUDENTS: (id: string) => `/groups/${id}/students`,
    ENROLL: (id: string) => `/groups/${id}/students`,
    REMOVE_STUDENT: (groupId: string, studentId: string) => `/groups/${groupId}/students/${studentId}`,
    SCHEDULES: (id: string) => `/schedules/group/${id}`,
    SESSIONS: (id: string) => `/schedules/group/${id}/sessions`,
  },
  SCHEDULES: {
    TODAY_SESSIONS: '/schedules/today-sessions',
    CREATE_SESSION: '/schedules/session',
    UPDATE_SESSION: (id: string) => `/schedules/session/${id}`,
    DELETE_SESSION: (id: string) => `/schedules/session/${id}`,
    GENERATE_SESSIONS: (groupId: string) => `/schedules/group/${groupId}/generate-sessions`,
  },
  STUDENTS: {
    LIST: '/students',
    CREATE: '/students',
    DETAIL: (id: string) => `/students/${id}`,
    QR_CODE: (id: string) => `/students/${id}/qr-code`,
    REGENERATE_QR: (id: string) => `/students/${id}/regenerate-qr-token`,
  },
  ATTENDANCE: {
    MANUAL: (sessionId: string) => `/attendance/sessions/${sessionId}/manual`,
    SCAN_QR: (sessionId: string) => `/attendance/sessions/${sessionId}/scan-qr`,
    REPORTS: (sessionId: string) => `/attendance/sessions/${sessionId}/report`,
  },
  ASSESSMENTS: {
    LIST: '/assessments',
    CREATE: '/assessments',
    DETAIL: (id: string) => `/assessments/${id}`,
    UPDATE: (id: string) => `/assessments/${id}`,
    SUBMISSIONS: (id: string) => `/assessments/${id}/submissions`,
    SUBMISSION_DETAIL: (submissionId: string) => `/assessments/submissions/${submissionId}`,
    GRADE_SUBMISSION: (submissionId: string) => `/assessments/submissions/${submissionId}/grade`,
    SUBMIT: (id: string) => `/assessments/${id}/submit`,
  },
  COURSES: {
    CATALOG: '/courses/catalog',
    MY_COURSES: '/courses/my-courses',
    CREATE: '/courses',
    DETAIL: (id: string) => `/courses/${id}`,
    ENROLL: (id: string) => `/courses/${id}/enroll`,
    LESSON_VIEWER: (lessonId: string) => `/courses/lessons/${lessonId}`,
    LESSON_PROGRESS: (lessonId: string) => `/courses/lessons/${lessonId}/progress`,
  },
  SUBSCRIPTIONS: {
    RECORD_PAYMENT: '/subscriptions/record',
    STUDENT_HISTORY: (studentId: string) => `/subscriptions/student/${studentId}`,
    SCAN_QR: '/subscriptions/scan-qr',
  },
  BOOKLETS: {
    LIST: '/booklets',
    CREATE: '/booklets',
    DETAIL: (id: string) => `/booklets/${id}`,
    UPDATE: (id: string) => `/booklets/${id}`,
    DELETE: (id: string) => `/booklets/${id}`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },
  SYNC: {
    BOOTSTRAP: '/sync/bootstrap',
    DIFF: '/sync/diff',
    ATTENDANCE: '/sync/attendance',
    PAYMENTS: '/sync/payments',
    PROGRESS: '/sync/progress',
    ASSESSMENTS: '/sync/assessments',
    BATCH: '/sync/batch',
  },
  PARENT_PORTAL: {
    LINKED_STUDENTS: '/parent-portal/students',
    CHILD_OVERVIEW: (id: string) => `/parent-portal/students/${id}/overview`,
  },
} as const;
