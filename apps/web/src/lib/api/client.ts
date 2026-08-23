import { ApiResponse, ProblemDetailsError } from '@/types/api/api.types';
import { API_BASE_URL, API_ENDPOINTS } from './endpoints';
import { ApiError } from './errors';
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  updateStoredTokens,
  clearStoredTokens,
} from '@/features/auth/utils/auth-tokens';
import { useAuthStore } from '@/features/auth/store/auth.store';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  token?: string;
  _isRetry?: boolean;
}

// Concurrency mutex: In-flight refresh promise shared across all simultaneous 401 requests
let refreshPromise: Promise<string | null> | null = null;

async function executeRefreshToken(): Promise<string | null> {
  const currentRefreshToken = getStoredRefreshToken();
  if (!currentRefreshToken) {
    return null;
  }

  // Do not attempt token refresh if device is offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const refreshUrl = `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`;
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Genuine refresh token invalidation from server
        handleAuthFailure(true);
      }
      return null;
    }

    const data = await response.json();
    const tokens = (data && data.data ? data.data : data) as { accessToken: string; refreshToken: string };

    if (tokens?.accessToken && tokens?.refreshToken) {
      updateStoredTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      // Synchronize in-memory auth store
      useAuthStore.getState().updateTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      return tokens.accessToken;
    }

    return null;
  } catch (error) {
    console.warn('Silent token refresh network error:', error);
    return null;
  }
}

async function getRefreshedAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = executeRefreshToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Decodes the stored JWT access token (without verifying the signature) and
 * returns true when it is already expired or will expire within `bufferSeconds`.
 * Returns true (treat as expired) when no token is present or the token is malformed.
 */
export function isAccessTokenExpiredOrExpiring(bufferSeconds = 90): boolean {
  const token = getStoredAccessToken();
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    // base64url → base64 → JSON
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((parts[1].length % 4) || 4);
    const payload = JSON.parse(atob(padded));
    if (!payload.exp) return false;
    return payload.exp - bufferSeconds < Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/**
 * Public wrapper around the internal refresh mutex, usable by the sync engine
 * to proactively acquire a fresh access token before starting a batch flush.
 */
export async function refreshAccessToken(): Promise<string | null> {
  return getRefreshedAccessToken();
}

function handleAuthFailure(isExplicitRejection: boolean = false): void {
  // Never log user out if device is offline or when network failure prevents verification
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  // If not explicitly rejected with 401/403 by server, don't clear offline-compatible session
  if (!isExplicitRejection) {
    return;
  }

  clearStoredTokens();
  useAuthStore.getState().clearSession();

  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    const currentPath = window.location.pathname + window.location.search;
    const redirectParam = currentPath && currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : '';
    window.location.href = `/login${redirectParam}`;
  }
}

/**
 * Centralized API Client
 * Wraps native fetch with JWT authorization, silent token refresh on 401, response unwrapping, and error normalization
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, token, headers, _isRetry = false, ...customConfig } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const isInternalApi = !endpoint.startsWith('http') || endpoint.startsWith(API_BASE_URL);
  const isAuthEndpoint =
    endpoint.includes(API_ENDPOINTS.AUTH.LOGIN) ||
    endpoint.includes(API_ENDPOINTS.AUTH.PARENT_ACCESS) ||
    endpoint.includes(API_ENDPOINTS.AUTH.STUDENT_REGISTRATION_REGISTER) ||
    endpoint.includes(API_ENDPOINTS.AUTH.REFRESH) ||
    endpoint.includes(API_ENDPOINTS.AUTH.LOGOUT);

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
  };

  // Only set application/json if body is not FormData
  if (!(customConfig.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Attach Bearer Token ONLY if request is destined for internal API base
  if (isInternalApi) {
    const authToken = token || getStoredAccessToken();
    if (authToken) {
      defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }
  }

  const config: RequestInit = {
    method: 'GET',
    headers: {
      ...defaultHeaders,
      ...(headers as Record<string, string>),
    },
    ...customConfig,
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return {} as T;
    }

    // Intercept 401 Unauthorized for automatic token refresh & request retry
    if (response.status === 401) {
      // If it's a login/refresh/logout request or already retried once, do not refresh again
      if (isAuthEndpoint || _isRetry) {
        if (!isAuthEndpoint) {
          handleAuthFailure();
        }
      } else if (isInternalApi) {
        const newAccessToken = await getRefreshedAccessToken();

        if (newAccessToken) {
          // Retry the original request once with the new access token
          return apiClient<T>(endpoint, {
            ...options,
            token: newAccessToken,
            _isRetry: true,
          });
        } else {
          handleAuthFailure();
        }
      }
    }

    const json = await response.json();

    if (!response.ok) {
      const problem = json as ProblemDetailsError;
      throw new ApiError({
        statusCode: response.status,
        message: problem.message || `Request failed with status ${response.status}`,
        code: problem.code,
        details: problem.details,
        correlationId: problem.correlationId,
      });
    }

    // Unwrap standard API response envelope ({ success: true, data: ... })
    // If the response contains pagination meta, do not unwrap
    if (json && typeof json === 'object' && 'meta' in json) {
      return json as T;
    }

    const apiResponse = json as ApiResponse<T>;
    return (apiResponse.data !== undefined ? apiResponse.data : json) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network / Offline Error
    throw new ApiError({
      statusCode: 0,
      message:
        typeof navigator !== 'undefined' && !navigator.onLine
          ? 'تعذر الاتصال بالخادم (أنت غير متصل بالإنترنت)'
          : 'تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى',
    });
  }
}
