'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { QUERY_KEYS } from '@/lib/api/query-keys';
import { getRealtimeSocket } from '@/lib/realtime/socket';
import { useOnlineStatus } from '@/lib/offline/use-online-status';

export interface ShellBadges {
  unreadNotifications: number;
  unreadInquiries: number;
  pendingReservations: number;
}

export function useShellBadges(enabled = true) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  return useQuery<ShellBadges>({
    queryKey: ['shell', 'badges'],
    queryFn: async () => {
      try {
        const badges = await apiClient<ShellBadges>(API_ENDPOINTS.USERS.BADGES);
        
        // Seed downstream caches so notification bells & inquiries subqueries hit cache
        if (badges) {
          queryClient.setQueryData(QUERY_KEYS.notifications.unreadCount(), {
            unreadCount: badges.unreadNotifications,
          });
          queryClient.setQueryData(QUERY_KEYS.contactMessages.unreadCount(), {
            unreadCount: badges.unreadInquiries,
          });
        }
        
        return badges || { unreadNotifications: 0, unreadInquiries: 0, pendingReservations: 0 };
      } catch {
        return { unreadNotifications: 0, unreadInquiries: 0, pendingReservations: 0 };
      }
    },
    enabled: enabled && isOnline,
    networkMode: 'online',
    staleTime: 60_000,
    refetchInterval: () => {
      if (!isOnline) return false;
      const socket = getRealtimeSocket();
      return socket?.connected ? false : 120_000;
    },
  });
}
