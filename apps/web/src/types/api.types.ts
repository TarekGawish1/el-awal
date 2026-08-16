/**
 * Authoritative API Response Envelopes
 * Aligned with docs/03-Architecture/api-design.md
 */

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  timestamp?: string;
  correlationId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  statusCode: number;
  data: T[];
  meta: PaginationMeta;
  timestamp?: string;
  correlationId?: string;
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ProblemDetailsError {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  code?: string;
  details?: ApiErrorDetail[];
  timestamp?: string;
  path?: string;
  correlationId?: string;
}
