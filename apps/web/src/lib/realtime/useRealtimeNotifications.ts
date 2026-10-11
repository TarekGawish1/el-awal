'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { getRealtimeSocket } from './socket';
import { notificationKeys } from '@/hooks/useNotifications';

/**
 * Subscribes to the backend realtime socket channel and invalidates
 * notification queries whenever a new notification is emitted — eliminating
 * the need for periodic polling.
 */
export function useRealtimeNotifications(enabled = true) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?.id) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    socket.on('notifications:changed', handler);

    return () => {
      socket.off('notifications:changed', handler);
    };
  }, [enabled, isAuthenticated, user?.id, queryClient]);
}
