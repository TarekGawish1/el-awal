/**
 * Canonical API Endpoints Constants
 * Aligned with docs/03-Architecture/api-design.md
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/users/me',
  },
  USERS: {
    ME: '/users/me',
  },
  TEACHER: {
    DASHBOARD_OVERVIEW: '/teachers/dashboard/overview', // Recommended server aggregation contract
  },
  GROUPS: {
    LIST: '/groups',
    DETAIL: (id: string) => `/groups/${id}`,
    STUDENTS: (id: string) => `/groups/${id}/students`,
    SCHEDULES: (id: string) => `/schedules/group/${id}`,
    SESSIONS: (id: string) => `/schedules/group/${id}/sessions`,
  },
  STUDENTS: {
    LIST: '/students',
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
  },
  PARENT_PORTAL: {
    CHILD_OVERVIEW: (id: string) => `/parent-portal/students/${id}/overview`,
  },
} as const;
