'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { getRealtimeSocket } from './socket';

/**
 * Subscribes to the backend realtime channel and invalidates the
 * `contact-messages` and `contact-messages-unread-count` queries whenever
 * the server pushes an `inquiries:changed` signal — keeping the sidebar counter
 * and inquiries page in sync in real time.
 */
export function useRealtimeInquiries(enabled = true) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?.id) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['contact-messages-unread-count'] });
    };

    socket.on('inquiries:changed', handler);

    return () => {
      socket.off('inquiries:changed', handler);
    };
  }, [enabled, isAuthenticated, user?.id, queryClient]);
}
