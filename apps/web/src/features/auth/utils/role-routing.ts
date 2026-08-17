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

/**
 * Sanitizes a redirect query parameter to prevent open redirect vulnerabilities
 */
export function sanitizeRedirectUrl(redirectUrl: string | null | undefined): string | null {
  if (!redirectUrl) return null;

  // Ensure it is a relative path starting with '/' and not a protocol-relative '//'
  if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') && !redirectUrl.includes('\\')) {
    // Disallow redirecting back to /login
    if (redirectUrl === '/login' || redirectUrl.startsWith('/login?')) {
      return null;
    }
    return redirectUrl;
  }

  return null;
}
