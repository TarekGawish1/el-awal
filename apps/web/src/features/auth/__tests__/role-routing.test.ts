import { describe, it, expect } from 'vitest';
import { getRoleLandingRoute, sanitizeRedirectUrl, isRouteAllowedForRole } from '../utils/role-routing';

describe('Role Routing Utilities', () => {
  describe('getRoleLandingRoute', () => {
    it('should map TEACHER to /teacher/dashboard', () => {
      expect(getRoleLandingRoute('TEACHER')).toBe('/teacher/dashboard');
    });

    it('should map SECRETARIAT to /teacher/dashboard', () => {
      expect(getRoleLandingRoute('SECRETARIAT')).toBe('/teacher/dashboard');
    });

    it('should map STUDENT to /student/dashboard', () => {
      expect(getRoleLandingRoute('STUDENT')).toBe('/student/dashboard');
    });

    it('should map PARENT to /parent/dashboard', () => {
      expect(getRoleLandingRoute('PARENT')).toBe('/parent/dashboard');
    });
  });

  describe('isRouteAllowedForRole', () => {
    it('allows TEACHER to access teacher routes, learning preview routes, and assessment solving preview', () => {
      expect(isRouteAllowedForRole('/teacher/dashboard', 'TEACHER')).toBe(true);
      expect(isRouteAllowedForRole('/teacher/courses/c-1/preview', 'TEACHER')).toBe(true);
      expect(isRouteAllowedForRole('/student/courses/c-1/learn', 'TEACHER')).toBe(true);
      expect(isRouteAllowedForRole('/student/courses/c-1/learn?lessonId=les-1', 'TEACHER')).toBe(true);
      expect(isRouteAllowedForRole('/student/assessments?id=exam-1', 'TEACHER')).toBe(true);
      expect(isRouteAllowedForRole('/student/homework?id=hw-1', 'TEACHER')).toBe(true);
      expect(isRouteAllowedForRole('/student/dashboard', 'TEACHER')).toBe(false);
      expect(isRouteAllowedForRole('/student/attendance', 'TEACHER')).toBe(false);
    });

    it('allows SECRETARIAT to access teacher portal routes while blocking assistants and activity-log', () => {
      expect(isRouteAllowedForRole('/teacher/dashboard', 'SECRETARIAT')).toBe(true);
      expect(isRouteAllowedForRole('/teacher/students', 'SECRETARIAT')).toBe(true);
      expect(isRouteAllowedForRole('/teacher/courses', 'SECRETARIAT')).toBe(true);
      expect(isRouteAllowedForRole('/student/courses/c-1/learn', 'SECRETARIAT')).toBe(true);
      expect(isRouteAllowedForRole('/student/assessments?id=exam-1', 'SECRETARIAT')).toBe(true);
      expect(isRouteAllowedForRole('/student/homework?id=hw-1', 'SECRETARIAT')).toBe(true);
      expect(isRouteAllowedForRole('/teacher/assistants', 'SECRETARIAT')).toBe(false);
      expect(isRouteAllowedForRole('/teacher/activity-log', 'SECRETARIAT')).toBe(false);
      expect(isRouteAllowedForRole('/parent/dashboard', 'SECRETARIAT')).toBe(false);
    });

    it('allows STUDENT to access student courses and learning room', () => {
      expect(isRouteAllowedForRole('/student/dashboard', 'STUDENT')).toBe(true);
      expect(isRouteAllowedForRole('/student/courses/c-1/learn', 'STUDENT')).toBe(true);
      expect(isRouteAllowedForRole('/teacher/courses', 'STUDENT')).toBe(false);
    });
  });

  describe('sanitizeRedirectUrl', () => {
    it('should allow valid relative paths', () => {
      expect(sanitizeRedirectUrl('/teacher/attendance')).toBe('/teacher/attendance');
      expect(sanitizeRedirectUrl('/courses/123/lessons/456')).toBe('/courses/123/lessons/456');
    });

    it('should reject null or empty string', () => {
      expect(sanitizeRedirectUrl(null)).toBeNull();
      expect(sanitizeRedirectUrl('')).toBeNull();
      expect(sanitizeRedirectUrl(undefined)).toBeNull();
    });

    it('should reject protocol-relative and external URLs (open redirect defense)', () => {
      expect(sanitizeRedirectUrl('//evil.com')).toBeNull();
      expect(sanitizeRedirectUrl('https://evil.com')).toBeNull();
      expect(sanitizeRedirectUrl('http://evil.com/path')).toBeNull();
    });

    it('should reject backslashes and redirects to /login', () => {
      expect(sanitizeRedirectUrl('/\\evil.com')).toBeNull();
      expect(sanitizeRedirectUrl('/login')).toBeNull();
      expect(sanitizeRedirectUrl('/login?redirect=/foo')).toBeNull();
    });

    it('should reject redirect URLs that do not belong to the authenticated role', () => {
      expect(sanitizeRedirectUrl('/student/dashboard', 'TEACHER')).toBeNull();
      expect(sanitizeRedirectUrl('/teacher/dashboard', 'STUDENT')).toBeNull();
      expect(sanitizeRedirectUrl('/teacher/finance', 'PARENT')).toBeNull();
      expect(sanitizeRedirectUrl('/teacher/finance', 'TEACHER')).toBe('/teacher/finance');
      expect(sanitizeRedirectUrl('/student/dashboard', 'STUDENT')).toBe('/student/dashboard');
      expect(sanitizeRedirectUrl('/student/courses/c-1/learn', 'TEACHER')).toBe('/student/courses/c-1/learn');
    });
  });
});

