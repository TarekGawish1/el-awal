/**
 * Canonical API Endpoints Constants
 * Aligned with docs/03-Architecture/api-design.md
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  TEACHER: {
    DASHBOARD_OVERVIEW: '/teachers/dashboard/overview', // Recommended server aggregation contract
  },
  GROUPS: {
    LIST: '/groups',
    DETAIL: (id: string) => `/groups/${id}`,
    STUDENTS: (id: string) => `/groups/${id}/students`,
    SCHEDULES: (id: string) => `/groups/${id}/schedules`,
  },
  STUDENTS: {
    LIST: '/students',
    DETAIL: (id: string) => `/students/${id}`,
    REGENERATE_QR: (id: string) => `/students/${id}/regenerate-qr-token`,
  },
  ATTENDANCE: {
    MANUAL: (sessionId: string) => `/attendance/sessions/${sessionId}/manual`,
    SCAN_QR: (sessionId: string) => `/attendance/sessions/${sessionId}/scan-qr`,
    REPORTS: '/attendance/reports',
  },
  ASSESSMENTS: {
    LIST: '/assessments',
    DETAIL: (id: string) => `/assessments/${id}`,
    SUBMISSIONS: (id: string) => `/assessments/${id}/submissions`,
  },
  PARENT_PORTAL: {
    CHILD_OVERVIEW: (id: string) => `/parent-portal/students/${id}/overview`,
  },
} as const;
