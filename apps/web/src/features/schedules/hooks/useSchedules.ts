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
} from '../types/schedules.types';

export const scheduleKeys = {
  all: ['schedules'] as const,
  teacherCalendar: (query?: TeacherCalendarQuery) => [...scheduleKeys.all, 'teacher-calendar', query] as const,
  groupSessions: (groupId: string) => [...scheduleKeys.all, 'group-sessions', groupId] as const,
  topics: (gradeLevel?: string, groupId?: string) => [...scheduleKeys.all, 'topics', { gradeLevel, groupId }] as const,
};

export function useTeacherSessions(query?: TeacherCalendarQuery) {
  return useQuery({
    queryKey: scheduleKeys.teacherCalendar(query),
    queryFn: () => fetchTeacherSessions(query),
  });
}

export function useGroupSessions(groupId?: string) {
  return useQuery({
    queryKey: scheduleKeys.groupSessions(groupId || ''),
    queryFn: () => fetchGroupSessions(groupId || ''),
    enabled: !!groupId && groupId !== 'ALL',
    staleTime: 2 * 60 * 1000,
  });
}

export function useSessionTopics(gradeLevel?: string, groupId?: string) {
  return useQuery({
    queryKey: scheduleKeys.topics(gradeLevel, groupId),
    queryFn: () => fetchSessionTopics(gradeLevel, groupId),
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
