'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import toast from 'react-hot-toast';

export interface NotificationSystemSettings {
  isWhatsAppEnabled: boolean;
  isPushEnabled: boolean;
  isInAppEnabled: boolean;
  absenceAlertsEnabled: boolean;
  paymentAlertsEnabled: boolean;
  studentApprovalAlertsEnabled: boolean;
  examAlertsEnabled: boolean;
  teacherDailyScheduleEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const notificationSettingsKeys = {
  all: ['notification-settings'] as const,
  current: () => [...notificationSettingsKeys.all, 'current'] as const,
};

/**
 * Fetches current system-wide notification settings (WhatsApp, Push, In-App).
 */
export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationSettingsKeys.current(),
    queryFn: async (): Promise<NotificationSystemSettings> => {
      const res = await apiClient<NotificationSystemSettings>(
        API_ENDPOINTS.NOTIFICATIONS.SETTINGS,
        { method: 'GET' },
      );
      return res;
    },
    staleTime: 10_000,
  });
}

/**
 * Mutation to update system-wide notification toggles (WhatsApp master, Push master, categories).
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      dto: Partial<NotificationSystemSettings>,
    ): Promise<NotificationSystemSettings> => {
      return apiClient<NotificationSystemSettings>(
        API_ENDPOINTS.NOTIFICATIONS.SETTINGS,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dto),
        },
      );
    },
    onMutate: async (newDto) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: notificationSettingsKeys.current() });
      const previous = queryClient.getQueryData<NotificationSystemSettings>(
        notificationSettingsKeys.current(),
      );
      if (previous) {
        queryClient.setQueryData<NotificationSystemSettings>(
          notificationSettingsKeys.current(),
          { ...previous, ...newDto },
        );
      }
      return { previous };
    },
    onError: (err: any, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          notificationSettingsKeys.current(),
          context.previous,
        );
      }
      toast.error(err?.message || 'فشل تحديث إعدادات الإشعارات');
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(notificationSettingsKeys.current(), updated);
      toast.success('تم حفظ إعدادات الإشعارات بنجاح');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationSettingsKeys.all });
    },
  });
}
