'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { getRealtimeSocket } from './socket';
import { syncEngine } from '@/lib/offline/sync-engine';

/**
 * Subscribes to backend realtime WebSocket channels for attendance and homework updates.
 * When another machine (e.g. phone) uploads attendance or homework, this hook
 * immediately invalidates query caches and triggers an instant delta pull into
 * IndexedDB so all machines reflect the updates seamlessly without delay.
 */
export function useRealtimeAttendance(enabled = true) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?.id) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    const handleAttendanceChange = () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['today-sessions'] });
      if (typeof queryClient.refetchQueries === 'function') {
        queryClient.refetchQueries({ type: 'active' });
      }
      syncEngine.checkAndSync({ skipCooldown: true }).catch(() => {});
    };

    const handleHomeworkChange = () => {
      queryClient.invalidateQueries({ queryKey: ['homework-records'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['today-sessions'] });
      if (typeof queryClient.refetchQueries === 'function') {
        queryClient.refetchQueries({ type: 'active' });
      }
      syncEngine.checkAndSync({ skipCooldown: true }).catch(() => {});
    };

    socket.on('attendance:changed', handleAttendanceChange);
    socket.on('homework:changed', handleHomeworkChange);

    return () => {
      socket.off('attendance:changed', handleAttendanceChange);
      socket.off('homework:changed', handleHomeworkChange);
    };
  }, [enabled, isAuthenticated, user?.id, queryClient]);
}
