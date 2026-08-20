'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/errors';
import { registerStudent } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { getRoleLandingRoute } from '../utils/role-routing';
import {
  StudentRegistrationCredentials,
  StudentRegistrationPayload,
  StudentRegistrationResult,
} from '../types/auth.types';

/**
 * Normalizes student self-registration errors into localized Arabic messages.
 */
export function normalizeStudentRegistrationError(error: unknown): { message: string; code?: string } {
  if (error instanceof ApiError) {
    if (error.statusCode === 400 && Array.isArray(error.details) && error.details.length > 0) {
      return { message: error.details.map((detail) => detail.issue).join('، '), code: error.code };
    }

    if (error.code === 'PHONES_MUST_DIFFER') {
      return { message: 'رقم هاتف ولي الأمر يجب أن يختلف عن رقم هاتف الطالب', code: error.code };
    }

    if (error.code === 'PHONE_ALREADY_REGISTERED') {
      return {
        message: 'رقم هاتف الطالب مسجل بالفعل، يمكنك تسجيل الدخول مباشرة',
        code: 'PHONE_ALREADY_REGISTERED',
      };
    }

    if (error.code === 'PARENT_PHONE_CONFLICT') {
      return { message: 'رقم هاتف ولي الأمر مسجل بحساب آخر، يرجى استخدام رقم مختلف', code: error.code };
    }

    if (error.code === 'IDENTIFIER_ALREADY_IN_USE') {
      return { message: 'رقم الهاتف أو الكود مستخدم بالفعل، يرجى المحاولة مرة أخرى', code: error.code };
    }

    if (error.statusCode === 409) {
      return { message: error.message || 'تعذر إنشاء الحساب، يرجى المحاولة مرة أخرى', code: error.code };
    }

    if (error.statusCode === 429) {
      return { message: 'تم تجاوز الحد المسموح من المحاولات، يرجى المحاولة بعد بضع دقائق' };
    }

    if (error.statusCode >= 500) {
      return { message: 'حدث خطأ في خادم النظام، يرجى المحاولة مرة أخرى لاحقاً' };
    }

    return { message: error.message || 'تعذر إتمام العملية، يرجى المحاولة مرة أخرى', code: error.code };
  }

  return { message: 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت' };
}

/**
 * Student Self-Registration Flow
 *
 * A single registration call creates the student account, the parent account
 * and the parent-student link server-side. On success the student is
 * automatically authenticated (role STUDENT) and the one-time credentials are
 * held in memory for display on the success screen.
 */
export function useStudentRegistration() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  const registerMutation = useMutation({
    mutationFn: (payload: StudentRegistrationPayload) => registerStudent(payload),
    onSuccess: (data: StudentRegistrationResult) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenType: data.tokenType,
        expiresIn: data.expiresIn,
        user: data.user,
      });
      queryClient.clear();
    },
  });

  const error = registerMutation.error ? normalizeStudentRegistrationError(registerMutation.error) : null;

  return {
    credentials: registerMutation.isSuccess
      ? (registerMutation.data as StudentRegistrationResult).credentials
      : null,
    isRegistering: registerMutation.isPending,
    isRegistered: registerMutation.isSuccess,
    registerError: error,
    registerStudent: registerMutation.mutate,
    resetError: registerMutation.reset,
    redirectToDashboard: () => {
      const session = useAuthStore.getState();
      if (session.isAuthenticated && session.user) {
        router.push(getRoleLandingRoute(session.user.role));
      } else {
        router.push('/login');
      }
    },
  };
}
