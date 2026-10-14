'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { getRealtimeSocket } from './socket';
import { syncEngine } from '@/lib/offline/sync-engine';

/**
 * Subscribes to backend realtime WebSocket channels for attendance and homework updates.
 * Debounced to prevent invalidation storms during high-frequency classroom roll-call bursts.
 */
export function useRealtimeAttendance(enabled = true) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const attendanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const homeworkTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?.id) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    const handleAttendanceChange = () => {
      if (attendanceTimerRef.current) {
        clearTimeout(attendanceTimerRef.current);
      }
      attendanceTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['today-sessions'] });
        syncEngine.checkAndSync().catch(() => {});
      }, 2000);
    };

    const handleHomeworkChange = () => {
      if (homeworkTimerRef.current) {
        clearTimeout(homeworkTimerRef.current);
      }
      homeworkTimerRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['homework-records'] });
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['today-sessions'] });
        syncEngine.checkAndSync().catch(() => {});
      }, 2000);
    };

    socket.on('attendance:changed', handleAttendanceChange);
    socket.on('homework:changed', handleHomeworkChange);

    return () => {
      if (attendanceTimerRef.current) clearTimeout(attendanceTimerRef.current);
      if (homeworkTimerRef.current) clearTimeout(homeworkTimerRef.current);
      socket.off('attendance:changed', handleAttendanceChange);
      socket.off('homework:changed', handleHomeworkChange);
    };
  }, [enabled, isAuthenticated, user?.id, queryClient]);
}
