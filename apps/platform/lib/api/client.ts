/**
 * API Client for the Public Platform
 *
 * A simplified fetch wrapper for making requests to the El Awal backend.
 * Inspired by apps/web/src/lib/api/client.ts but without the offline-first
 * sync engine, PWA complexity, or mutation queue.
 *
 * Features:
 * - Automatic JWT Bearer token attachment
 * - Standard API response envelope unwrapping
 * - Query parameter serialization
 * - Error normalization
 * - Type-safe generic return
 *
 * Silent token refresh and auth state management will be added in Phase 6
 * when authentication is implemented.
 */

import { API_BASE_URL } from './endpoints';

// ── Types ────────────────────────────────────────────────────

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
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: ApiErrorDetail[];
  correlationId?: string;

  constructor(opts: {
    statusCode: number;
    message: string;
    code?: string;
    details?: ApiErrorDetail[];
    correlationId?: string;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.details = opts.details;
    this.correlationId = opts.correlationId;
  }
}

// ── Request Options ──────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Query parameters appended to the URL */
  params?: Record<string, string | number | boolean | undefined>;
  /** Override the Bearer token (otherwise uses stored token) */
  token?: string;
  /** Request body — automatically stringified if object */
  body?: RequestInit['body'] | Record<string, unknown>;
}

// ── Token Storage (placeholder — will be expanded in Phase 6) ──

let storedAccessToken: string | null = null;

/** Set the in-memory access token (will be replaced with persistent storage in Phase 6) */
export function setAccessToken(token: string | null): void {
  storedAccessToken = token;
}

/** Get the current access token */
export function getAccessToken(): string | null {
  return storedAccessToken;
}

// ── API Client ───────────────────────────────────────────────

/**
 * Centralized fetch wrapper for the El Awal backend API.
 *
 * @example
 * // Public endpoint (no auth needed)
 * const courses = await apiClient<Course[]>(API_ENDPOINTS.COURSES.CATALOG, {
 *   params: { gradeLevel: 'grade_10', page: '1' },
 * });
 *
 * @example
 * // Protected endpoint (requires prior setAccessToken)
 * const me = await apiClient<User>(API_ENDPOINTS.USERS.ME);
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, token, headers, body, ...fetchConfig } = options;

  // Build URL
  let url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  // Append query params
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Build headers
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  // Set Content-Type for JSON bodies (not FormData)
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // Attach Bearer token if available
  const authToken = token || storedAccessToken;
  if (authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  // Serialize body
  let serializedBody: RequestInit['body'] | undefined;
  if (body !== undefined) {
    serializedBody = isFormData
      ? (body as FormData)
      : typeof body === 'object'
        ? JSON.stringify(body)
        : (body as RequestInit['body']);
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      ...fetchConfig,
      headers: requestHeaders,
      body: serializedBody,
    });

    // No-content response
    if (response.status === 204) {
      return {} as T;
    }

    const json = await response.json();

    if (!response.ok) {
      throw new ApiError({
        statusCode: response.status,
        message: json.message || `Request failed with status ${response.status}`,
        code: json.code,
        details: json.details,
        correlationId: json.correlationId,
      });
    }

    // Unwrap paginated responses (keep meta intact)
    if (json && typeof json === 'object' && 'meta' in json) {
      return json as T;
    }

    // Unwrap standard response envelope { success, data }
    const apiResponse = json as ApiResponse<T>;
    return (apiResponse.data !== undefined ? apiResponse.data : json) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network / connection error
    throw new ApiError({
      statusCode: 0,
      message: 'تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى',
    });
  }
}
