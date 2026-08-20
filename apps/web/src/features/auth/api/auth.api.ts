import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { AuthTokensResponse, AuthUser, LoginCredentials, ParentAccessCredentials, RefreshTokenResponse, StudentRegistrationPayload, StudentRegistrationResult } from '../types/auth.types';
import { getStoredRefreshToken } from '../utils/auth-tokens';

import { saveOfflineCredentials, verifyOfflineLogin } from '../utils/offline-auth';

/**
 * Authenticates user credentials via POST /api/v1/auth/login or offline resolver
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthTokensResponse> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    return verifyOfflineLogin(credentials);
  }

  try {
    const session = await apiClient<AuthTokensResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({
        identifier: credentials.identifier.trim(),
        password: credentials.password,
      }),
    });

    // Cache offline credentials upon successful online authentication
    if (session?.user && session?.accessToken) {
      await saveOfflineCredentials(credentials.identifier, credentials.password, session);
    }

    return session;
  } catch (error) {
    // If request failed because of network disconnection or offline status, try offline verification
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return verifyOfflineLogin(credentials);
    }
    throw error;
  }
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
 * Self-service student registration via POST /api/v1/auth/student-registration/register.
 * Creates the student account + parent account + parent-student link, returns
 * one-time credentials and auto-authenticates the student.
 */
export async function registerStudent(
  payload: StudentRegistrationPayload,
): Promise<StudentRegistrationResult> {
  return apiClient<StudentRegistrationResult>(API_ENDPOINTS.AUTH.STUDENT_REGISTRATION_REGISTER, {
    method: 'POST',
    body: JSON.stringify({
      fullName: payload.fullName.trim(),
      studentPhone: payload.studentPhone.trim(),
      parentPhone: payload.parentPhone.trim(),
      academicStage: payload.academicStage,
      gradeLevel: payload.gradeLevel,
    }),
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
