'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { getRealtimeSocket } from './socket';

/**
 * Subscribes to the backend realtime WebSocket channel and invalidates
 * `teacher-subscriptions`, `teacher-courses`, and student course queries
 * immediately whenever the server pushes a `course-subscriptions:changed` signal —
 * providing instant live updates with zero polling delay.
 */
export function useRealtimeCourseSubscriptions(enabled = true) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?.id) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-detail'] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-course-detail'] });
      queryClient.invalidateQueries({ queryKey: ['course-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-enrollments'] });
    };

    socket.on('course-subscriptions:changed', handler);

    return () => {
      socket.off('course-subscriptions:changed', handler);
    };
  }, [enabled, isAuthenticated, user?.id, queryClient]);
}
