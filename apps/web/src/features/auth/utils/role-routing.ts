import { AuthUser, UserRole } from '../types/auth.types';

/**
 * Maps authenticated user role to the canonical application landing route
 * Aligned with docs/03-Architecture/frontend-architecture.md
 */
export function getRoleLandingRoute(role: UserRole): string {
  switch (role) {
    case 'TEACHER':
    case 'SECRETARIAT':
      return '/teacher/dashboard';
    case 'STUDENT':
      return '/student/dashboard';
    case 'PARENT':
      return '/parent/dashboard';
    default:
      return '/teacher/dashboard';
  }
}

export function isRouteAllowedForRole(path: string, role: UserRole): boolean {
  if (role === 'TEACHER') {
    return (
      path.startsWith('/teacher') ||
      path.startsWith('/courses') ||
      /^\/student\/courses\/[^/]+\/learn/.test(path) ||
      path.startsWith('/student/assessments') ||
      path.startsWith('/student/homework')
    );
  }
  if (role === 'SECRETARIAT') {
    // Only Primary Teacher can manage assistants and view activity audit history
    if (
      path.startsWith('/teacher/assistants') ||
      path.startsWith('/teacher/activity-log')
    ) {
      return false;
    }
    return (
      path.startsWith('/teacher') ||
      path.startsWith('/courses') ||
      /^\/student\/courses\/[^/]+\/learn/.test(path) ||
      path.startsWith('/student/assessments') ||
      path.startsWith('/student/homework')
    );
  }
  if (role === 'STUDENT') {
    return (
      path.startsWith('/student') ||
      path.startsWith('/courses') ||
      path.startsWith('/exams') ||
      path.startsWith('/lessons')
    );
  }
  if (role === 'PARENT') {
    return path.startsWith('/parent') || path.startsWith('/parent-access');
  }
  return false;
}

/**
 * Sanitizes a redirect query parameter to prevent open redirect vulnerabilities
 * and enforces role boundary scoping so users never get bounced into another role's routes.
 */
export function sanitizeRedirectUrl(
  redirectUrl: string | null | undefined,
  userRole?: UserRole,
): string | null {
  if (!redirectUrl) return null;

  // Ensure it is a relative path starting with '/' and not a protocol-relative '//'
  if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') && !redirectUrl.includes('\\')) {
    // Disallow redirecting back to /login or /register
    if (
      redirectUrl === '/login' ||
      redirectUrl.startsWith('/login?') ||
      redirectUrl === '/register' ||
      redirectUrl.startsWith('/register/')
    ) {
      return null;
    }

    // If userRole is provided, verify the redirect route actually belongs to the user's role!
    if (userRole && !isRouteAllowedForRole(redirectUrl, userRole)) {
      return null;
    }

    return redirectUrl;
  }

  return null;
}

/**
 * Returns all available roles for a user based on which profile IDs are present.
 */
export function getAvailableRoles(user: AuthUser | null | undefined): UserRole[] {
  if (!user) return [];
  const roles: UserRole[] = [];
  if (user.teacherProfileId) roles.push('TEACHER');
  if (user.secretariatProfileId) roles.push('SECRETARIAT');
  if (user.studentProfileId) roles.push('STUDENT');
  if (user.parentProfileId) roles.push('PARENT');
  return roles;
}

/**
 * Returns true if the user has more than one profile (eligible for role-switching).
 */
export function hasMultipleRoles(user: AuthUser | null | undefined): boolean {
  return getAvailableRoles(user).length > 1;
}

/**
 * Maps a UserRole to a human-readable Arabic label.
 */
export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'TEACHER': return 'مدرس';
    case 'SECRETARIAT': return 'مساعد / سكرتارية';
    case 'STUDENT': return 'طالب';
    case 'PARENT': return 'ولي أمر';
    default: return 'مستخدم';
  }
}

/**
 * Maps a UserRole to an emoji/icon identifier for the role picker UI.
 */
export function getRoleIcon(role: UserRole): string {
  switch (role) {
    case 'TEACHER': return 'teacher';
    case 'SECRETARIAT': return 'secretariat';
    case 'STUDENT': return 'student';
    case 'PARENT': return 'parent';
    default: return 'user';
  }
}
