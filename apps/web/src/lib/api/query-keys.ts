/**
 * Centralized React Query Keys
 * 
 * Provides canonical, strongly-typed query keys across the entire web application
 * to ensure request deduplication, cache sharing, and scoped invalidation.
 */

export const QUERY_KEYS = {
  auth: {
    me: () => ['users', 'me'] as const,
  },
  users: {
    me: () => ['users', 'me'] as const,
  },
  courses: {
    all: ['courses'] as const,
    teacherCourses: () => ['courses', 'teacher-courses'] as const,
    teacherSubscriptions: (filters?: any) =>
      filters !== undefined
        ? (['courses', 'teacher-subscriptions', filters] as const)
        : (['courses', 'teacher-subscriptions'] as const),
    detail: (id: string) => ['courses', 'detail', id] as const,
    catalog: (filters?: any) =>
      filters !== undefined
        ? (['courses', 'catalog', filters] as const)
        : (['courses', 'catalog'] as const),
  },
  groups: {
    all: ['groups'] as const,
    list: (filters?: any) =>
      filters !== undefined
        ? (['groups', filters] as const)
        : (['groups'] as const),
    detail: (id: string) => ['groups', id] as const,
    students: (id: string) => ['groups', id, 'students'] as const,
    pendingReservations: (filters?: any) =>
      filters !== undefined
        ? (['courses', 'teacher-subscriptions', filters] as const)
        : (['courses', 'teacher-subscriptions'] as const),
  },
  academicPeriods: {
    all: ['academic-periods'] as const,
    active: () => ['academic-periods', 'active'] as const,
    teacherPeriod: () => ['teacher', 'academic-period'] as const,
  },
  public: {
    centers: () => ['public', 'centers'] as const,
    testimonials: () => ['public', 'testimonials'] as const,
    catalog: (filters?: any) =>
      filters !== undefined
        ? (['public', 'catalog', filters] as const)
        : (['public', 'catalog'] as const),
    siteSettings: () => ['public', 'site-settings'] as const,
  },
  contactMessages: {
    all: ['contact-messages'] as const,
    unreadCount: () => ['contact-messages', 'unread-count'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
} as const;
