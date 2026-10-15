import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { AuthTokensResponse, AuthUser, GroupInviteInfo, GroupRegistrationPayload, LoginCredentials, ParentAccessCredentials, RefreshTokenResponse, StudentRegistrationPayload, StudentRegistrationResult } from '../types/auth.types';
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
  } catch (error: any) {
    // If request failed because of network disconnection, offline state, or fetch error, try offline verification
    const isNetworkDisconnected =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      error?.statusCode === 0 ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('NetworkError') ||
      error?.message?.includes('تعذر الاتصال بالخادم') ||
      error?.code === 'ERR_INTERNET_DISCONNECTED';

    if (isNetworkDisconnected) {
      return verifyOfflineLogin(credentials);
    }
    throw error;
  }
}

/**
 * Requests a 6-digit WhatsApp OTP code for quick login via POST /api/v1/auth/otp/request
 */
export async function requestLoginOtp(
  phone: string,
  role?: string,
): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
  return apiClient<{ success: boolean; message: string; cooldownSeconds: number }>(API_ENDPOINTS.AUTH.OTP_REQUEST, {
    method: 'POST',
    body: JSON.stringify({
      phone: phone.trim(),
      ...(role ? { role } : {}),
    }),
  });
}

/**
 * Verifies 6-digit WhatsApp OTP code and logs in user via POST /api/v1/auth/otp/verify
 */
export async function verifyLoginOtp(
  phone: string,
  code: string,
  role?: string,
): Promise<AuthTokensResponse> {
  const session = await apiClient<AuthTokensResponse>(API_ENDPOINTS.AUTH.OTP_VERIFY, {
    method: 'POST',
    body: JSON.stringify({
      phone: phone.trim(),
      code: code.trim(),
      ...(role ? { role } : {}),
    }),
  });

  return session;
}

/**
 * Requests a secure password reset link sent via WhatsApp via POST /api/v1/auth/password-reset/request
 */
export async function requestPasswordReset(
  phone: string,
  role?: string,
): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
  return apiClient<{ success: boolean; message: string; cooldownSeconds: number }>(API_ENDPOINTS.AUTH.PASSWORD_RESET_REQUEST, {
    method: 'POST',
    body: JSON.stringify({
      phone: phone.trim(),
      ...(role ? { role } : {}),
    }),
  });
}

/**
 * Confirms password reset with cryptographic token and sets new password via POST /api/v1/auth/password-reset/confirm
 */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(API_ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM, {
    method: 'POST',
    body: JSON.stringify({
      token: token.trim(),
      newPassword: newPassword.trim(),
    }),
  });
}

/**
 * Authenticates the parent linked to an administration-registered student phone.
 */
export async function parentAccessUser(credentials: ParentAccessCredentials): Promise<AuthTokensResponse> {
  return apiClient<AuthTokensResponse>(API_ENDPOINTS.AUTH.PARENT_ACCESS, {
    method: 'POST',
    body: JSON.stringify({
      studentPhone: credentials.studentPhone.trim(),
      password: credentials.password?.trim(),
    }),
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
      studentPhone: payload.studentPhone?.trim() || undefined,
      parentPhone: payload.parentPhone.trim(),
      academicStage: payload.academicStage,
      gradeLevel: payload.gradeLevel,
      attendanceMode: payload.attendanceMode,
      groupId: payload.groupId,
    }),
  });
}

/**
 * Validates a group registration invite token via GET /api/v1/auth/group-invite/:token.
 * Returns the group metadata for the public registration view.
 */
export async function fetchGroupInvite(token: string): Promise<GroupInviteInfo> {
  return apiClient<GroupInviteInfo>(API_ENDPOINTS.AUTH.GROUP_INVITE(token));
}

/**
 * Registers a student through a group invite link via POST /api/v1/auth/register-by-group.
 * Creates the student account, links/creates the parent, enrolls the student
 * into the group and returns auth tokens for immediate sign-in.
 */
export async function registerByGroup(payload: GroupRegistrationPayload): Promise<AuthTokensResponse> {
  return apiClient<AuthTokensResponse>(API_ENDPOINTS.AUTH.REGISTER_BY_GROUP, {
    method: 'POST',
    body: JSON.stringify({
      token: payload.token,
      fullName: payload.fullName.trim(),
      phone: payload.phone?.trim() || undefined,
      parentName: payload.parentName.trim(),
      parentPhone: payload.parentPhone.trim(),
      password: payload.password,
    }),
  });
}

/**
 * Switches the active role for a multi-profile user via POST /api/v1/auth/switch-role.
 * Returns a fresh set of tokens with the new effective role.
 */
export async function switchRoleRequest(targetRole: string): Promise<AuthTokensResponse> {
  return apiClient<AuthTokensResponse>(API_ENDPOINTS.AUTH.SWITCH_ROLE, {
    method: 'POST',
    body: JSON.stringify({ targetRole }),
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
