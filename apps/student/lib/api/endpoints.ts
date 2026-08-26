/**
 * Canonical API Endpoints for the Public Platform
 *
 * Aligned with the backend at apps/backend/src and
 * the existing contract in apps/web/src/lib/api/endpoints.ts.
 *
 * Endpoints are grouped by domain. Public endpoints are called
 * without authentication; protected endpoints require a JWT.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const API_ENDPOINTS = {
  // ── Authentication (all @Public) ─────────────────────────
  AUTH: {
    LOGIN: '/auth/login',
    PARENT_ACCESS: '/auth/parent-access',
    REGISTER_STUDENT: '/auth/student-registration/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },

  // ── User Profile (protected) ─────────────────────────────
  USERS: {
    ME: '/users/me',
  },

  // ── Public Catalog (existing @Public endpoint) ───────────
  COURSES: {
    CATALOG: '/courses/catalog',
    DETAIL: (id: string) => `/courses/${id}`,
    MY_COURSES: '/courses/my-courses',
    ENROLL: (id: string) => `/courses/${id}/enroll`,
    LESSON_VIEWER: (lessonId: string) => `/courses/lessons/${lessonId}`,
    LESSON_PROGRESS: (lessonId: string) => `/courses/lessons/${lessonId}/progress`,
  },

  // ── Public Teachers (FUTURE — endpoints to be built) ─────
  TEACHERS: {
    LIST: '/public/teachers',
    PROFILE: (slug: string) => `/public/teachers/${slug}`,
  },

  // ── Student Dashboard (protected — STUDENT role) ─────────
  STUDENT: {
    DASHBOARD: '/students/dashboard',
    ATTENDANCE: '/attendance/student',
    ASSESSMENTS: '/assessments/student',
    GROUP: '/groups/student',
    PAYMENTS: '/subscriptions/student',
  },

  // ── Parent Portal (protected — PARENT role) ──────────────
  PARENT: {
    LINKED_STUDENTS: '/parent-portal/students',
    CHILD_OVERVIEW: (id: string) => `/parent-portal/students/${id}/overview`,
  },

  // ── Notifications (protected) ────────────────────────────
  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
  },
} as const;
