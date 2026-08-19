'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginUser, logoutUser } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { LoginCredentials, AuthTokensResponse } from '../types/auth.types';
import { getRoleLandingRoute, sanitizeRedirectUrl } from '../utils/role-routing';
import { ApiError } from '@/lib/api/errors';

/**
 * Normalizes HTTP & API errors into localized user-friendly Arabic messages
 */
export function normalizeAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 400) {
      if (Array.isArray(error.details) && error.details.length > 0) {
        return error.details.map((d) => d.issue).join('، ');
      }
      return error.message || 'يرجى التأكد من صحة البيانات المدخلة';
    }

    if (error.statusCode === 401) {
      return 'بيانات الدخول غير صحيحة أو الحساب غير مفعّل';
    }

    if (error.statusCode === 403) {
      return 'الحساب غير مصرح له بتسجيل الدخول إلى النظام';
    }

    if (error.statusCode === 429) {
      return 'تم تجاوز الحد المسموح من المحاولات، يرجى المحاولة بعد بضع دقائق';
    }

    if (error.statusCode >= 500) {
      return 'حدث خطأ في خادم النظام، يرجى المحاولة مرة أخرى لاحقاً';
    }

    return error.message || 'تعذر تسجيل الدخول، يرجى المحاولة مرة أخرى';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت';
}

/**
 * Primary Authentication Hook
 */
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { user, isAuthenticated, isInitialized, isValidating, setSession, clearSession, initialize, validateSession } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // After synchronous localStorage hydration, validate stored tokens against the backend
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      validateSession();
    }
  }, [isInitialized, isAuthenticated, validateSession]);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => loginUser(credentials),
    onSuccess: (data: AuthTokensResponse) => {
      // 1. Persist session to store & storage
      setSession(data);

      // 2. Clear query cache to prevent stale user state
      queryClient.clear();

      // 3. Determine redirect path (query param or role-based landing)
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const requestedRedirect = searchParams?.get('redirect');
      const safeRedirect = sanitizeRedirectUrl(requestedRedirect);
      const destination = safeRedirect || getRoleLandingRoute(data.user.role);

      // 4. Navigate to destination
      router.push(destination);
    },
  });

  const logout = async () => {
    await logoutUser();
    clearSession();
    queryClient.clear();
    router.push('/login');
  };

  return {
    user,
    isAuthenticated,
    isInitialized,
    isValidating,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoading: loginMutation.isPending,
    isSuccess: loginMutation.isSuccess,
    isError: loginMutation.isError,
    error: loginMutation.error ? normalizeAuthErrorMessage(loginMutation.error) : null,
    rawError: loginMutation.error,
    resetError: loginMutation.reset,
    logout,
  };
}
