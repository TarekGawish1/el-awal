import { describe, it, expect } from 'vitest';
import { translateErrorMessage, ApiError, normalizeApiError } from '../errors';

describe('translateErrorMessage', () => {
  it('translates Access denied / RolesGuard English messages to Arabic', () => {
    const raw = 'Access denied. Requires one of roles: [TEACHER, SECRETARIAT]. Current role: STUDENT';
    expect(translateErrorMessage(raw)).toBe('عفواً، ليس لديك الصلاحية الكافية للقيام بهذا الإجراء');
  });

  it('translates forbidden and unauthorized messages to Arabic', () => {
    expect(translateErrorMessage('Forbidden resource')).toBe('عفواً، ليس لديك الصلاحية الكافية للقيام بهذا الإجراء');
    expect(translateErrorMessage('Unauthorized access')).toBe('يرجى تسجيل الدخول والمحاولة مرة أخرى');
    expect(translateErrorMessage('Invalid credentials')).toBe('يرجى تسجيل الدخول والمحاولة مرة أخرى');
  });

  it('translates network and server errors to Arabic', () => {
    expect(translateErrorMessage('NetworkError: Failed to fetch')).toBe('تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت');
    expect(translateErrorMessage('Internal server error')).toBe('حدث خطأ في الخادم، يرجى المحاولة مرة أخرى لاحقاً');
  });

  it('preserves Arabic messages as-is without modification', () => {
    const arabic = 'يرجى إرفاق صورة إيصال التحويل أو سكرين شوت المعاملة';
    expect(translateErrorMessage(arabic)).toBe(arabic);
  });

  it('translates English error in ApiError constructor automatically', () => {
    const err = new ApiError({
      statusCode: 403,
      message: 'Access denied. Requires one of roles: [TEACHER, SECRETARIAT]. Current role: STUDENT',
    });
    expect(err.message).toBe('عفواً، ليس لديك الصلاحية الكافية للقيام بهذا الإجراء');
  });

  it('translates English error in normalizeApiError automatically', () => {
    const normalized = normalizeApiError(new Error('Failed to fetch'));
    expect(normalized.message).toBe('تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت');
  });
});
