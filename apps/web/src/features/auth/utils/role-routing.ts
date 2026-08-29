import { UserRole } from '../types/auth.types';

/**
 * Maps authenticated user role to the canonical application landing route
 * Aligned with docs/03-Architecture/frontend-architecture.md
 */
export function getRoleLandingRoute(role: UserRole): string {
  switch (role) {
    case 'TEACHER':
      return '/teacher/dashboard';
    case 'SECRETARIAT':
      return '/secretariat/dashboard';
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
      /^\/student\/courses\/[^/]+\/learn/.test(path)
    );
  }
  if (role === 'SECRETARIAT') {
    return (
      path.startsWith('/secretariat') ||
      path.startsWith('/teacher') ||
      path.startsWith('/courses') ||
      /^\/student\/courses\/[^/]+\/learn/.test(path)
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
