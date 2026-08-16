import { ApiResponse, ProblemDetailsError } from '@/types/api.types';
import { API_BASE_URL } from './endpoints';
import { ApiError } from './errors';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  token?: string;
}

/**
 * Centralized API Client
 * Wraps native fetch with JWT authorization, response envelope unwrapping, and standardized error normalization
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, token, headers, ...customConfig } = options;

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

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Attach Bearer Token if provided or from storage in browser
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('el_awal_token') : null);
  if (authToken) {
    defaultHeaders['Authorization'] = `Bearer ${authToken}`;
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
    const apiResponse = json as ApiResponse<T>;
    return (apiResponse.data !== undefined ? apiResponse.data : json) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network / Offline Error
    throw new ApiError({
      statusCode: 0,
      message: typeof navigator !== 'undefined' && !navigator.onLine
        ? 'تعذر الاتصال بالخادم (أنت غير متصل بالإنترنت)'
        : 'تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى',
    });
  }
}
