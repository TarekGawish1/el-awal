import { describe, it, expect } from 'vitest';
import { normalizeAuthErrorMessage } from '../hooks/useAuth';
import { ApiError } from '@/lib/api/errors';

describe('useAuth & Error Normalization', () => {
  describe('normalizeAuthErrorMessage', () => {
    it('should map 400 validation error correctly', () => {
      const error = new ApiError({
        statusCode: 400,
        message: 'Validation failed',
        details: [
          { field: 'identifier', issue: 'identifier should not be empty' },
          { field: 'password', issue: 'password is required' },
        ],
      });

      expect(normalizeAuthErrorMessage(error)).toBe('identifier should not be empty، password is required');
    });

    it('should map 401 unauthorized to Arabic credentials error', () => {
      const error = new ApiError({
        statusCode: 401,
        message: 'Invalid credentials or account is inactive',
      });

      expect(normalizeAuthErrorMessage(error)).toBe('بيانات الدخول غير صحيحة أو الحساب غير مفعّل');
    });

    it('should map 403 forbidden to account permissions error', () => {
      const error = new ApiError({
        statusCode: 403,
        message: 'Forbidden',
      });

      expect(normalizeAuthErrorMessage(error)).toBe('الحساب غير مصرح له بتسجيل الدخول إلى النظام');
    });

    it('should map 429 rate limit to retry message', () => {
      const error = new ApiError({
        statusCode: 429,
        message: 'Too many requests',
      });

      expect(normalizeAuthErrorMessage(error)).toBe('تم تجاوز الحد المسموح من المحاولات، يرجى المحاولة بعد بضع دقائق');
    });

    it('should map 500 server error to friendly message', () => {
      const error = new ApiError({
        statusCode: 500,
        message: 'Internal Server Error',
      });

      expect(normalizeAuthErrorMessage(error)).toBe('حدث خطأ في خادم النظام، يرجى المحاولة مرة أخرى لاحقاً');
    });

    it('should map network error to connection failure message', () => {
      const error = new ApiError({
        statusCode: 0,
        message: 'Network failure',
      });

      expect(normalizeAuthErrorMessage(error)).toBe('Network failure');
    });
  });
});
