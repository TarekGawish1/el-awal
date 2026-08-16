import { ProblemDetailsError } from '@/types/api/api.types';

export class ApiError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: { field?: string; issue: string }[];
  public correlationId?: string;

  constructor(problem: Partial<ProblemDetailsError> & { message: string; statusCode: number }) {
    super(problem.message);
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
      message: (errObj.message as string) || 'حدث خطأ غير متوقع',
      code: errObj.code as string | undefined,
      details: errObj.details as { field?: string; issue: string }[] | undefined,
      correlationId: errObj.correlationId as string | undefined,
    });
  }

  if (error instanceof Error) {
    return new ApiError({
      statusCode: 500,
      message: error.message || 'حدث خطأ أثناء الاتصال بالخادم',
    });
  }

  return new ApiError({
    statusCode: 500,
    message: 'حدث خطأ غير متوقع',
  });
}
