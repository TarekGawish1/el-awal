import { describe, it, expect } from 'vitest';
import { getRoleLandingRoute, sanitizeRedirectUrl } from '../utils/role-routing';

describe('Role Routing Utilities', () => {
  describe('getRoleLandingRoute', () => {
    it('should map TEACHER to /teacher/dashboard', () => {
      expect(getRoleLandingRoute('TEACHER')).toBe('/teacher/dashboard');
    });

    it('should map SECRETARIAT to /secretariat/dashboard', () => {
      expect(getRoleLandingRoute('SECRETARIAT')).toBe('/secretariat/dashboard');
    });

    it('should map STUDENT to /student/dashboard', () => {
      expect(getRoleLandingRoute('STUDENT')).toBe('/student/dashboard');
    });

    it('should map PARENT to /parent/dashboard', () => {
      expect(getRoleLandingRoute('PARENT')).toBe('/parent/dashboard');
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
  });
});
