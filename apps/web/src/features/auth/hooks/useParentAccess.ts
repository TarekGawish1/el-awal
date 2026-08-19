'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/errors';
import { parentAccessUser } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { getRoleLandingRoute } from '../utils/role-routing';
import { AuthTokensResponse } from '../types/auth.types';

export function normalizeParentAccessError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 400 && Array.isArray(error.details) && error.details.length > 0) {
      return error.details.map((detail) => detail.issue).join('، ');
    }

    if (error.statusCode === 401) {
      return error.message || 'رقم الطالب غير مسجل أو لا يوجد ولي أمر مرتبط به';
    }

    if (error.statusCode === 429) {
      return 'تم تجاوز الحد المسموح من المحاولات، يرجى المحاولة بعد قليل';
    }

    if (error.statusCode >= 500) {
      return 'حدث خطأ في خادم النظام، يرجى المحاولة مرة أخرى لاحقاً';
    }

    return error.message || 'تعذر الدخول، يرجى المحاولة مرة أخرى';
  }

  return 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت';
}

export function useParentAccess() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  const mutation = useMutation({
    mutationFn: (studentPhone: string) => parentAccessUser({ studentPhone }),
    onSuccess: (data: AuthTokensResponse) => {
      setSession(data);
      queryClient.clear();
      router.push(getRoleLandingRoute(data.user.role));
    },
  });

  return {
    accessParent: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error ? normalizeParentAccessError(mutation.error) : null,
    resetError: mutation.reset,
  };
}
