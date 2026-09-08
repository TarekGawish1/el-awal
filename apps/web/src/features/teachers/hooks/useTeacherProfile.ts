'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { useAuthStore } from '@/features/auth/store/auth.store';

export interface TeacherProfileResponse {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  role: string;
  teacherProfile: {
    id: string;
    specialty: string | null;
    bio: string | null;
    activeAcademicYear: string | null;
    activeAcademicTerm: string | null;
  } | null;
}

export interface UpdateTeacherProfilePayload {
  fullName?: string;
  phone?: string;
}

export async function fetchTeacherProfile(): Promise<TeacherProfileResponse> {
  return apiClient<TeacherProfileResponse>(API_ENDPOINTS.TEACHER.PROFILE);
}

export async function updateTeacherProfileInDb(
  payload: UpdateTeacherProfilePayload,
): Promise<TeacherProfileResponse> {
  return apiClient<TeacherProfileResponse>(API_ENDPOINTS.TEACHER.PROFILE, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function useTeacherProfile() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['teacher', 'profile'],
    queryFn: fetchTeacherProfile,
    staleTime: 30000,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: updateTeacherProfileInDb,
    onSuccess: (data) => {
      queryClient.setQueryData(['teacher', 'profile'], data);
      // Keep header/sidebar display name in sync
      try {
        const { user, setUser } = useAuthStore.getState() as any;
        if (user && typeof setUser === 'function') {
          setUser({ ...user, fullName: data.fullName, phone: data.phone ?? user.phone });
        }
      } catch {
        // ignore store sync errors
      }
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    refetch: profileQuery.refetch,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    resetUpdateError: updateMutation.reset,
  };
}
