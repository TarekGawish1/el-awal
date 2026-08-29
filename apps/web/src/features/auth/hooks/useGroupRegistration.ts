'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/errors';
import { fetchGroupInvite, registerByGroup } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import {
  GroupInviteInfo,
  GroupRegistrationPayload,
} from '../types/auth.types';

/**
 * Normalizes group self-registration errors into localized Arabic messages.
 */
export function normalizeGroupRegistrationError(error: unknown): { message: string; code?: string } {
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

    if (error.code === 'REGISTRATION_CLOSED') {
      return { message: 'التسجيل في هذه المجموعة مغلق حالياً', code: error.code };
    }

    if (error.code === 'INVALID_INVITE_TOKEN') {
      return { message: 'رابط التسجيل غير صالح، يرجى طلب رابط جديد من المدرس', code: error.code };
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
 * Fetches and caches the group invite metadata for the public registration view.
 */
export function useGroupInvite(token: string | null) {
  return useQuery<GroupInviteInfo>({
    queryKey: ['group-invite', token],
    queryFn: () => fetchGroupInvite(token as string),
    enabled: !!token,
    staleTime: 60 * 1000,
    retry: false,
  });
}

/**
 * Group Link Direct Enrollment Flow.
 *
 * A single registration call creates the student account, links/creates the
 * parent account, and enrolls the student into the selected group server-side.
 * On success the student is automatically authenticated (role STUDENT).
 */
export function useGroupRegistration(token: string | null) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  const registerMutation = useMutation({
    mutationFn: (payload: Omit<GroupRegistrationPayload, 'token'>) =>
      registerByGroup({ ...(payload as GroupRegistrationPayload), token: token || '' }),
    onSuccess: (data) => {
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

  const error = registerMutation.error
    ? normalizeGroupRegistrationError(registerMutation.error)
    : null;

  return {
    isRegistering: registerMutation.isPending,
    isRegistered: registerMutation.isSuccess,
    registerError: error,
    registerStudent: registerMutation.mutate,
    resetError: registerMutation.reset,
    redirectToDashboard: () => {
      router.push('/student/dashboard');
    },
  };
}
