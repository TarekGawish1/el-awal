import { ProblemDetailsError } from '@/types/api/api.types';

/**
 * Translates English / technical backend or network error messages into friendly Arabic text.
 */
export function translateErrorMessage(message?: string): string {
  if (!message || typeof message !== 'string') {
    return 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً';
  }

  const trimmed = message.trim();

  // If already Arabic (contains Arabic characters), keep it
  if (/[\u0600-\u06FF]/.test(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();

  // Access / Roles / Permissions
  if (
    lower.includes('access denied') ||
    lower.includes('requires one of roles') ||
    lower.includes('forbidden') ||
    lower.includes('not permitted')
  ) {
    return 'عفواً، ليس لديك الصلاحية الكافية للقيام بهذا الإجراء';
  }

  // Authentication
  if (
    lower.includes('unauthorized') ||
    lower.includes('unauthenticated') ||
    lower.includes('invalid token') ||
    lower.includes('jwt') ||
    lower.includes('invalid credentials')
  ) {
    return 'يرجى تسجيل الدخول والمحاولة مرة أخرى';
  }

  // Not Found
  if (lower.includes('not found')) {
    return 'العنصر أو الصفحة المطلوبة غير موجودة';
  }

  // Network / Connection
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('connection') ||
    lower.includes('timeout') ||
    lower.includes('econnrefused')
  ) {
    return 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت';
  }

  // Server error
  if (lower.includes('internal server error') || lower.includes('server error')) {
    return 'حدث خطأ في الخادم، يرجى المحاولة مرة أخرى لاحقاً';
  }

  // Validation / Bad Request
  if (lower.includes('bad request') || lower.includes('validation')) {
    return 'يرجى مراجعة البيانات المدخلة والمحاولة مجدداً';
  }

  // Conflict / Duplicate
  if (lower.includes('already exists') || lower.includes('conflict') || lower.includes('unique constraint')) {
    return 'البيانات المدخلة مسجلة مسبقاً بالفعل';
  }

  return 'حدث خطأ أثناء تنفيذ العملية، يرجى المحاولة لاحقاً';
}

export class ApiError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: { field?: string; issue: string }[];
  public correlationId?: string;

  constructor(problem: Partial<ProblemDetailsError> & { message: string; statusCode: number }) {
    const localizedMessage = translateErrorMessage(problem.message);
    super(localizedMessage);
    this.name = 'ApiError';
    this.statusCode = problem.statusCode;
    this.code = problem.code;
    this.details = problem.details;
    this.correlationId = problem.correlationId;
  }
}

/**
 * Normalizes any fetch/network or API error into a structured ApiError
 */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'statusCode' in error && 'message' in error) {
    const errObj = error as Record<string, unknown>;
    return new ApiError({
      statusCode: (errObj.statusCode as number) || 500,
      message: translateErrorMessage(errObj.message as string),
      code: errObj.code as string | undefined,
      details: errObj.details as { field?: string; issue: string }[] | undefined,
      correlationId: errObj.correlationId as string | undefined,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      statusCode: 500,
      message: translateErrorMessage(error.message),
    });
  }

  return new ApiError({
    statusCode: 500,
    message: 'حدث خطأ غير متوقع',
  });
}
