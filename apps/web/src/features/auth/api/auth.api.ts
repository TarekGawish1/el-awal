import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { AuthTokensResponse, AuthUser, LoginCredentials } from '../types/auth.types';

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
 * Fetches authenticated user profile via GET /api/v1/users/me
 */
export async function fetchCurrentUser(): Promise<AuthUser> {
  return apiClient<AuthUser>(API_ENDPOINTS.USERS.ME);
}

/**
 * Gracefully terminates the user session
 */
export async function logoutUser(): Promise<void> {
  try {
    await apiClient(API_ENDPOINTS.AUTH.LOGOUT, {
      method: 'POST',
    });
  } catch {
    // Stateless token invalidation on client proceeds even if server endpoint is omitted
  }
}
