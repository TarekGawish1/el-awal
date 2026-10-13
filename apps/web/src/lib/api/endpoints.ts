/**
 * Canonical API Endpoints Constants
 * Aligned with docs/03-Architecture/api-design.md
 */

function getCanonicalApiBaseUrl(): string {
  const envUrl = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");

  // If unset, default based on NODE_ENV
  if (!envUrl) {
    return process.env.NODE_ENV === "production"
      ? "https://api.al-awal.online/api/v1"
      : "http://localhost:3000/api/v1";
  }

  // Guard against missing 'api.' subdomain prefix or relative paths in production
  if (
    envUrl === "https://al-awal.online/api/v1" ||
    envUrl === "https://al-awal.online" ||
    envUrl === "http://al-awal.online/api/v1" ||
    envUrl === "http://al-awal.online" ||
    envUrl === "/api/v1" ||
    envUrl === "/api"
  ) {
    return "https://api.al-awal.online/api/v1";
  }

  return envUrl;
}

export const API_BASE_URL = getCanonicalApiBaseUrl();

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    PARENT_ACCESS: "/auth/parent-access",
    STUDENT_REGISTRATION_REGISTER: "/auth/student-registration/register",
    GROUP_INVITE: (token: string) => `/auth/group-invite/${token}`,
    REGISTER_BY_GROUP: "/auth/register-by-group",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    SWITCH_ROLE: "/auth/switch-role",
    ME: "/users/me",
  },
  USERS: {
    ME: "/users/me",
    BADGES: "/users/me/badges",
  },
  TEACHER: {
    DASHBOARD_INIT: "/teachers/dashboard/init",
    DASHBOARD_OVERVIEW: "/teachers/dashboard/overview", // Recommended server aggregation contract
    ACADEMIC_PERIOD: "/teachers/academic-period",
    PROFILE: "/teachers/profile",
    SAVED_LOCATIONS: "/teachers/saved-locations",
    ASSISTANTS: {
      LIST: "/teachers/assistants",
      INVITE: "/teachers/assistants/invite",
      MANAGE: (id: string) => `/teachers/assistants/${id}`,
    },
  },
  ACADEMIC_PERIODS: {
    SWITCH: "/academic-periods/switch", // Password-gated switch of the active academic year/term
  },
  GROUPS: {
    LIST: "/groups",
    CREATE: "/groups",
    DETAIL: (id: string) => `/groups/${id}`,
    UPDATE: (id: string) => `/groups/${id}`,
    DELETE: (id: string) => `/groups/${id}`,
    STUDENTS: (id: string) => `/groups/${id}/students`,
    ENROLL: (id: string) => `/groups/${id}/students`,
    REMOVE_STUDENT: (groupId: string, studentId: string) =>
      `/groups/${groupId}/students/${studentId}`,
    REGISTRATION_LINK: (id: string) => `/groups/${id}/registration-link`,
    QR_CODES_PDF: (id: string) => `/groups/${id}/qr-codes-pdf`,
    SCHEDULES: (id: string) => `/schedules/group/${id}`,
    SESSIONS: (id: string) => `/schedules/group/${id}/sessions`,
  },
  SCHEDULES: {
    TODAY_SESSIONS: "/schedules/today-sessions",
    CREATE_SESSION: "/schedules/session",
    UPDATE_SESSION: (id: string) => `/schedules/session/${id}`,
    DELETE_SESSION: (id: string) => `/schedules/session/${id}`,
    GENERATE_SESSIONS: (groupId: string) =>
      `/schedules/group/${groupId}/generate-sessions`,
    PUBLIC_CENTERS: "/schedules/public/centers",
  },
  STUDENTS: {
    LIST: "/students",
    CREATE: "/students",
    DETAIL: (id: string) => `/students/${id}`,
    QR_CODE: (id: string) => `/students/${id}/qr-code`,
    REGENERATE_QR: (id: string) => `/students/${id}/regenerate-qr-token`,
    RESET_PASSWORD: (id: string) => `/students/${id}/reset-password`,
    RESET_PARENT_PASSWORD: (id: string) => `/students/${id}/reset-parent-password`,
    CREDENTIALS: (id: string) => `/students/${id}/credentials`,
  },
  ATTENDANCE: {
    MANUAL: (sessionId: string) => `/attendance/sessions/${sessionId}/manual`,
    SCAN_QR: (sessionId: string) => `/attendance/sessions/${sessionId}/scan-qr`,
    REPORTS: (sessionId: string) => `/attendance/sessions/${sessionId}/report`,
    HOMEWORK_ONSITE: (sessionId: string) =>
      `/attendance/sessions/${sessionId}/homework-onsite`,
    HISTORY: (studentId: string) => `/attendance/student/${studentId}`,
  },
  ASSESSMENTS: {
    LIST: "/assessments",
    CREATE: "/assessments",
    DETAIL: (id: string) => `/assessments/${id}`,
    UPDATE: (id: string) => `/assessments/${id}`,
    SUBMISSIONS: (id: string) => `/assessments/${id}/submissions`,
    SUBMISSION_DETAIL: (submissionId: string) =>
      `/assessments/submissions/${submissionId}`,
    GRADE_SUBMISSION: (submissionId: string) =>
      `/assessments/submissions/${submissionId}/grade`,
    SUBMIT: (id: string) => `/assessments/${id}/submit`,
    RE_EVALUATE: (id: string) => `/assessments/${id}/re-evaluate`,
  },
  COURSES: {
    CATALOG: "/courses/catalog",
    MY_COURSES: "/courses/my-courses",
    CREATE: "/courses",
    DETAIL: (id: string) => `/courses/${id}`,
    ENROLL: (id: string) => `/courses/${id}/enroll`,
    LESSON_VIEWER: (lessonId: string) => `/courses/lessons/${lessonId}`,
    LESSON_PROGRESS: (lessonId: string) =>
      `/courses/lessons/${lessonId}/progress`,
  },
  SUBSCRIPTIONS: {
    RECORD_PAYMENT: "/subscriptions/record",
    STUDENT_HISTORY: (studentId: string) =>
      `/subscriptions/student/${studentId}`,
    SCAN_QR: "/subscriptions/scan-qr",
    DELETE_PAYMENT: (paymentId: string) => `/subscriptions/${paymentId}`,
    REFUND_PAYMENT: (paymentId: string) => `/subscriptions/${paymentId}/refund`,
  },
  PAYMENTS: {
    INIT: "/payments/init",
    DASHBOARD_ANALYTICS: "/payments/dashboard-analytics",
    ANALYTICS: "/payments/analytics",
    MATRIX_LEDGER: "/payments/matrix-ledger",
    BILLING_CONFIG: "/payments/billing-config",
  },
  BOOKLETS: {
    LIST: "/booklets",
    CREATE: "/booklets",
    DETAIL: (id: string) => `/booklets/${id}`,
    UPDATE: (id: string) => `/booklets/${id}`,
    DELETE: (id: string) => `/booklets/${id}`,
  },
  NOTIFICATIONS: {
    LIST: "/notifications",
    UNREAD_COUNT: "/notifications/unread-count",
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: "/notifications/read-all",
    PUSH_VAPID_KEY: "/notifications/push-vapid-key",
    PUSH_SUBSCRIBE: "/notifications/push-subscribe",
    PUSH_UNSUBSCRIBE: "/notifications/push-unsubscribe",
    WHATSAPP_STATUS: "/notifications/whatsapp-status",
    WHATSAPP_OVERVIEW: "/notifications/whatsapp-overview",
    WHATSAPP_STATS: "/notifications/whatsapp-stats",
    WHATSAPP_QUEUE: "/notifications/whatsapp-queue",
    WHATSAPP_FAILED: "/notifications/whatsapp-failed",
    WHATSAPP_RETRY: (id: string) => `/notifications/whatsapp-retry/${id}`,
    WHATSAPP_RETRY_ALL: "/notifications/whatsapp-retry-all",
    WHATSAPP_DELETE_MESSAGE: (id: string) => `/notifications/whatsapp-message/${id}`,
    WHATSAPP_CLEAR_FAILED: "/notifications/whatsapp-failed/clear",
    WHATSAPP_CLEAR_QUEUE: "/notifications/whatsapp-queue/clear",
    WHATSAPP_DISPATCH_NOW: "/notifications/whatsapp-dispatch-now",
    SETTINGS: "/notifications/settings",
    TRIGGER_DAILY_SCHEDULE: "/notifications/trigger-daily-schedule",
  },
  SYNC: {
    BOOTSTRAP: "/sync/bootstrap",
    DIFF: "/sync/diff",
    ATTENDANCE: "/sync/attendance",
    HOMEWORK: "/sync/homework",
    PAYMENTS: "/sync/payments",
    PROGRESS: "/sync/progress",
    ASSESSMENTS: "/sync/assessments",
    BATCH: "/sync/batch",
  },
  PARENT_PORTAL: {
    DASHBOARD: (studentId?: string) => studentId ? `/parent-portal/dashboard?studentId=${studentId}` : '/parent-portal/dashboard',
    LINKED_STUDENTS: "/parent-portal/students",
    CHILD_OVERVIEW: (id: string) => `/parent-portal/students/${id}/overview`,
  },
  CONTACT_MESSAGES: {
    LIST: "/contact-messages",
    UNREAD_COUNT: "/contact-messages/unread-count",
    MARK_READ: (id: string) => `/contact-messages/${id}/read`,
    DELETE: (id: string) => `/contact-messages/${id}`,
  },
  ANALYTICS: {
    OVERVIEW: "/analytics/overview",
    TRACK: "/analytics/track",
    STATS: "/analytics/stats",
    LANDING: "/analytics/landing",
    GEO_RANKING: "/analytics/geo-ranking",
    STUDENT_RANKING: "/analytics/students/ranking",
    VISITORS: "/analytics/visitors",
    SESSION_START: "/analytics/session/start",
    SESSION_PING: "/analytics/session/ping",
    PAGE_PING: "/analytics/ping-page",
  },
  AUDIT_LOGS: {
    LIST: "/audit-logs",
    OVERVIEW: "/audit-logs/overview",
    STATS: "/audit-logs/stats",
    PERFORMERS: "/audit-logs/performers",
  },
  TESTIMONIALS: {
    PUBLIC: "/testimonials/public",
    MINE: "/testimonials/mine",
    LIST: "/testimonials",
    UPDATE: (id: string) => `/testimonials/${id}`,
  },
  SITE_SETTINGS: {
    PUBLIC: "/site-settings/public",
    LIST: "/site-settings",
  },
  CERTIFICATES: {
    PUBLIC: "/certificates/public",
    LIST: "/certificates",
    CREATE: "/certificates",
    DETAIL: (id: string) => `/certificates/${id}`,
    DELETE: (id: string) => `/certificates/${id}`,
    VISIBILITY: (id: string) => `/certificates/${id}/visibility`,
  },
} as const;
