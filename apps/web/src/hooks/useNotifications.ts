'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  recipient?: {
    id: string;
    fullName: string;
    role: string;
  };
  createdAt: string;
}

export interface NotificationFeedResponse {
  data: Notification[];
  meta: {
    nextCursor?: string;
    hasNextPage: boolean;
    total?: number;
    limit?: number;
  };
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export interface NotificationFeedOptions {
  cursor?: string;
  role?: string;
  scope?: string;
  limit?: number;
}

export const notificationKeys = {
  all: ['notifications'] as const,
  feed: (options?: NotificationFeedOptions | string) =>
    [...notificationKeys.all, 'feed', typeof options === 'string' ? options : JSON.stringify(options)] as const,
  infinite: (options?: Omit<NotificationFeedOptions, 'cursor'>) =>
    [...notificationKeys.all, 'infinite', JSON.stringify(options)] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches the paginated notification feed for the current user or platform-wide for staff.
 */
export function useNotifications(options?: NotificationFeedOptions | string) {
  const queryParams =
    typeof options === 'string'
      ? { cursor: options }
      : options || {};

  return useQuery({
    queryKey: notificationKeys.feed(options),
    queryFn: async (): Promise<NotificationFeedResponse> => {
      const res = await apiClient<NotificationFeedResponse>(
        API_ENDPOINTS.NOTIFICATIONS.LIST,
        { method: 'GET', params: queryParams as Record<string, string> },
      );
      return res;
    },
    staleTime: 20_000,
  });
}

/**
 * Fetches cursor-paginated infinite notification feed with load-more capabilities.
 */
export function useInfiniteNotifications(options?: Omit<NotificationFeedOptions, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: notificationKeys.infinite(options),
    queryFn: async ({ pageParam }: { pageParam?: string }): Promise<NotificationFeedResponse> => {
      const params: Record<string, string | number> = {
        ...(options?.role && options.role !== 'ALL' ? { role: options.role } : {}),
        ...(options?.scope ? { scope: options.scope } : {}),
        ...(options?.limit ? { limit: options.limit } : { limit: 15 }),
        ...(pageParam ? { cursor: pageParam } : {}),
      };
      const res = await apiClient<NotificationFeedResponse>(
        API_ENDPOINTS.NOTIFICATIONS.LIST,
        { method: 'GET', params: params as Record<string, string> },
      );
      return res;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta?.hasNextPage ? lastPage.meta.nextCursor : undefined,
    staleTime: 20_000,
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
