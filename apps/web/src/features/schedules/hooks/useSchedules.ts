import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTeacherSessions,
  fetchGroupSessions,
  fetchSessionTopics,
  createSession,
  updateSession,
  deleteSession,
  generateSessions,
} from '../api/schedules.api';
import {
  CreateSessionPayload,
  UpdateSessionPayload,
  GenerateSessionsPayload,
  TeacherCalendarQuery,
  LessonSessionItem,
} from '../types/schedules.types';

export const scheduleKeys = {
  all: ['schedules'] as const,
  teacherCalendar: (query?: TeacherCalendarQuery) => [...scheduleKeys.all, 'teacher-calendar', query] as const,
  groupSessions: (groupId: string) => [...scheduleKeys.all, 'group-sessions', groupId] as const,
  topics: (gradeLevel?: string, groupId?: string) => [...scheduleKeys.all, 'topics', { gradeLevel, groupId }] as const,
};

import { offlineDb } from '@/lib/offline/db';

export function useTeacherSessions(query?: TeacherCalendarQuery) {
  return useQuery<LessonSessionItem[]>({
    queryKey: scheduleKeys.teacherCalendar(query),
    queryFn: async (): Promise<LessonSessionItem[]> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const sessions = await offlineDb.getSessionsOffline(query?.groupId);
        return sessions as unknown as LessonSessionItem[];
      }
      try {
        const sessions = await fetchTeacherSessions(query);
        if (sessions && sessions.length > 0) {
          offlineDb.bulkPutSessions(sessions as any);
        }
        return sessions;
      } catch {
        const sessions = await offlineDb.getSessionsOffline(query?.groupId);
        return sessions as unknown as LessonSessionItem[];
      }
    },
  });
}

export function useGroupSessions(groupId?: string) {
  return useQuery<LessonSessionItem[]>({
    queryKey: scheduleKeys.groupSessions(groupId || ''),
    queryFn: async (): Promise<LessonSessionItem[]> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const sessions = await offlineDb.getSessionsOffline(groupId);
        return sessions as unknown as LessonSessionItem[];
      }
      try {
        const sessions = await fetchGroupSessions(groupId || '');
        if (sessions && sessions.length > 0) {
          offlineDb.bulkPutSessions(sessions as any);
        }
        return sessions;
      } catch {
        const sessions = await offlineDb.getSessionsOffline(groupId);
        return sessions as unknown as LessonSessionItem[];
      }
    },
    enabled: !!groupId && groupId !== 'ALL',
    staleTime: 2 * 60 * 1000,
  });
}

export function useSessionTopics(gradeLevel?: string, groupId?: string) {
  return useQuery({
    queryKey: scheduleKeys.topics(gradeLevel, groupId),
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return [];
      }
      try {
        return await fetchSessionTopics(gradeLevel, groupId);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSessionPayload) => createSession(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSessionPayload }) =>
      updateSession(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useGenerateSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, payload }: { groupId: string; payload: GenerateSessionsPayload }) =>
      generateSessions(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}
