'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { getRealtimeSocket } from './socket';

/**
 * Subscribes to the backend realtime channel and invalidates the
 * `pending-reservations` query whenever the server pushes a
 * `reservations:changed` signal — keeping the pending list and the sidebar
 * counter in sync without polling.
 */
export function useRealtimeReservations(enabled = true) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?.id) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reservations'] });
    };

    socket.on('reservations:changed', handler);

    return () => {
      socket.off('reservations:changed', handler);
    };
  }, [enabled, isAuthenticated, user?.id, queryClient]);
}
