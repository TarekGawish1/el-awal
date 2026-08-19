import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { AuthTokensResponse, AuthUser, LoginCredentials, ParentAccessCredentials, RefreshTokenResponse } from '../types/auth.types';
import { getStoredRefreshToken } from '../utils/auth-tokens';

/**
 * Authenticates user credentials via POST /api/v1/auth/login
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthTokensResponse> {
  return apiClient<AuthTokensResponse>(API_ENDPOINTS.AUTH.LOGIN, {
    method: 'POST',
    body: JSON.stringify({
      identifier: credentials.identifier.trim(),
      password: credentials.password,
    }),
  });
}

/**
 * Authenticates the parent linked to an administration-registered student phone.
 */
export async function parentAccessUser(credentials: ParentAccessCredentials): Promise<AuthTokensResponse> {
  return apiClient<AuthTokensResponse>(API_ENDPOINTS.AUTH.PARENT_ACCESS, {
    method: 'POST',
    body: JSON.stringify({ studentPhone: credentials.studentPhone.trim() }),
  });
}

/**
 * Requests fresh access & refresh tokens using an existing valid refresh token
 */
export async function refreshTokenRequest(refreshToken: string): Promise<RefreshTokenResponse> {
  return apiClient<RefreshTokenResponse>(API_ENDPOINTS.AUTH.REFRESH, {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * Fetches authenticated user profile via GET /api/v1/users/me
 */
export async function fetchCurrentUser(): Promise<AuthUser> {
  return apiClient<AuthUser>(API_ENDPOINTS.USERS.ME);
}

/**
 * Gracefully terminates the user session and revokes server refresh session
 */
export async function logoutUser(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  try {
    if (refreshToken) {
      await apiClient(API_ENDPOINTS.AUTH.LOGOUT, {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // Stateless token invalidation on client proceeds even if server endpoint is omitted
  }
}
