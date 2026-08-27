'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  notificationType?: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  channels?: string[];
  whatsappStatus?: string;
  pushStatus?: string;
  createdAt: string;
}

interface NotificationFeedResponse {
  data: Notification[];
  meta: {
    nextCursor?: string;
    hasNextPage: boolean;
    total?: number;
  };
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ['notifications'] as const,
  feed: (cursor?: string) => [...notificationKeys.all, 'feed', cursor] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches the paginated notification feed for the current user.
 */
export function useNotifications(cursor?: string) {
  return useQuery({
    queryKey: notificationKeys.feed(cursor),
    queryFn: async (): Promise<NotificationFeedResponse> => {
      const params = cursor ? { cursor } : undefined;
      const res = await apiClient<NotificationFeedResponse>(
        API_ENDPOINTS.NOTIFICATIONS.LIST,
        { method: 'GET', params },
      );
      return res;
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Polls the unread notification count every 30 seconds for badge display.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async (): Promise<{ unreadCount: number }> => {
      const res = await apiClient<{ unreadCount: number }>(
        API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT,
        { method: 'GET' },
      );
      return res;
    },
    staleTime: 30_000,
    refetchInterval: 30_000, // Poll every 30 seconds
    refetchIntervalInBackground: false,
  });
}

/**
 * Mutation to mark a single notification as read.
 */
export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      return apiClient(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mutation to mark all unread notifications as read.
 */
export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    },
    onMutate: async () => {
      // Optimistic update: zero out unread count immediately
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount() });
      const prev = queryClient.getQueryData(notificationKeys.unreadCount());
      queryClient.setQueryData(notificationKeys.unreadCount(), { unreadCount: 0 });
      return { prev };
    },
    onError: (_, __, context) => {
      if (context?.prev) {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
