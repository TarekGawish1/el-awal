'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/errors';
import {
  verifyStudentRegistration,
  registerStudentAccount,
} from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { getRoleLandingRoute } from '../utils/role-routing';
import {
  AuthTokensResponse,
  StudentAccountCredentials,
  StudentRegistrationVerification,
  StudentVerificationResponse,
} from '../types/auth.types';

/**
 * Normalizes student self-registration errors into localized Arabic messages.
 * Distinguishes the "already registered" outcome so the UI can offer the
 * login path without leaking it to callers that failed verification.
 */
export function normalizeStudentRegistrationError(error: unknown): { message: string; code?: string } {
  if (error instanceof ApiError) {
    if (error.statusCode === 400 && Array.isArray(error.details) && error.details.length > 0) {
      return { message: error.details.map((detail) => detail.issue).join('، '), code: error.code };
    }

    if (error.code === 'STUDENT_ALREADY_REGISTERED') {
      return {
        message: 'تم إنشاء حساب لهذا الطالب مسبقاً، يمكنك تسجيل الدخول مباشرة',
        code: 'STUDENT_ALREADY_REGISTERED',
      };
    }

    if (error.statusCode === 401) {
      return { message: 'بيانات التحقق غير صحيحة، يرجى مراجعة كود الطالب وكود التفعيل' };
    }

    if (
      error.code === 'PHONE_ALREADY_IN_USE' ||
      error.code === 'EMAIL_ALREADY_IN_USE' ||
      error.code === 'IDENTIFIER_ALREADY_IN_USE'
    ) {
      return { message: 'وسيلة تسجيل الدخول المدخلة مستخدمة بالفعل في حساب آخر', code: error.code };
    }

    if (error.code === 'IDENTIFIER_REQUIRED') {
      return { message: 'يجب إدخال رقم هاتف أو بريد إلكتروني ليكون وسيلة تسجيل الدخول', code: error.code };
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
 * Step 1 (verify) confirms the existing student record against the one-time
 * activation code. Step 2 (register) claims the account; on success the
 * student is automatically authenticated and routed to their dashboard.
 */
export function useStudentRegistration() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  const [verifiedStudent, setVerifiedStudent] = useState<StudentVerificationResponse | null>(null);

  const verifyMutation = useMutation({
    mutationFn: (credentials: StudentRegistrationVerification) => verifyStudentRegistration(credentials),
    onSuccess: (data: StudentVerificationResponse) => {
      setVerifiedStudent(data);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (credentials: StudentAccountCredentials) => registerStudentAccount(credentials),
    onSuccess: (data: AuthTokensResponse) => {
      setSession(data);
      queryClient.clear();
    },
  });

  const verifyError = verifyMutation.error ? normalizeStudentRegistrationError(verifyMutation.error) : null;
  const registerError = registerMutation.error ? normalizeStudentRegistrationError(registerMutation.error) : null;

  return {
    verifiedStudent,
    isVerifying: verifyMutation.isPending,
    verifyError,
    verifyStudent: verifyMutation.mutate,
    resetVerifyError: verifyMutation.reset,
    isRegistering: registerMutation.isPending,
    isRegistered: registerMutation.isSuccess,
    registerError,
    registerStudent: registerMutation.mutate,
    redirectToDashboard: () => {
      const session = useAuthStore.getState();
      if (session.isAuthenticated && session.user) {
        router.push(getRoleLandingRoute(session.user.role));
      } else {
        router.push('/login');
      }
    },
    resetFlow: () => {
      verifyMutation.reset();
      registerMutation.reset();
      setVerifiedStudent(null);
    },
  };
}
