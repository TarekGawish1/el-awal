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
import { offlineDb, SessionEntity } from '@/lib/offline/db';
import { syncEngine } from '@/lib/offline/sync-engine';
import { generateUUIDv7 } from '@/lib/offline/uuid';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import toast from 'react-hot-toast';

export const scheduleKeys = {
  all: ['schedules'] as const,
  teacherCalendar: (query?: TeacherCalendarQuery) => [...scheduleKeys.all, 'teacher-calendar', query] as const,
  groupSessions: (groupId: string) => [...scheduleKeys.all, 'group-sessions', groupId] as const,
  topics: (gradeLevel?: string, groupId?: string) => [...scheduleKeys.all, 'topics', { gradeLevel, groupId }] as const,
};

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
    mutationFn: async (payload: CreateSessionPayload) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const newId = generateUUIDv7();
        const group = await offlineDb.getGroupByIdOffline(payload.groupId);
        const sessionEntity: SessionEntity = {
          id: newId,
          groupId: payload.groupId,
          sessionDate: payload.sessionDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
          topic: payload.topic,
          status: 'UPCOMING',
          isCancelled: false,
          group: group ? {
            id: group.id,
            name: group.name,
            gradeLevel: group.gradeLevel,
            academicYear: group.academicYear,
            academicTerm: group.academicTerm,
          } : undefined,
          _count: { attendanceRecords: 0 },
        };

        await offlineDb.bulkPutSessions([sessionEntity]);

        await syncEngine.enqueue(
          'generic',
          API_ENDPOINTS.SCHEDULES.CREATE_SESSION,
          'POST',
          { ...payload, id: newId, clientGeneratedId: newId },
          { optimisticId: newId },
        );

        toast.success('تمت إضافة الحصة محلياً بنجاح وسيتم إرسالها عند الاتصال 💾');
        return sessionEntity as unknown as LessonSessionItem;
      }

      return createSession(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateSessionPayload }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const allSessions = await offlineDb.getSessionsOffline();
        const existing = allSessions.find((s) => s.id === id);
        if (existing) {
          const updated: SessionEntity = {
            ...existing,
            sessionDate: payload.sessionDate ?? existing.sessionDate,
            startTime: payload.startTime ?? existing.startTime,
            endTime: payload.endTime ?? existing.endTime,
            topic: payload.topic ?? existing.topic,
            isCancelled: payload.isCancelled ?? existing.isCancelled,
            status: payload.isCancelled ? 'CANCELLED' : existing.status,
          };
          await offlineDb.bulkPutSessions([updated]);
        }

        await syncEngine.enqueue(
          'generic',
          API_ENDPOINTS.SCHEDULES.UPDATE_SESSION(id),
          'PATCH',
          payload,
        );

        toast.success('تم تعديل الحصة محلياً بنجاح 💾');
        return { id, ...payload } as unknown as LessonSessionItem;
      }

      return updateSession(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        await offlineDb.removeSession(id);
        await syncEngine.enqueue(
          'generic',
          API_ENDPOINTS.SCHEDULES.DELETE_SESSION(id),
          'DELETE',
          {},
        );
        toast.success('تم حذف الحصة محلياً بنجاح 💾');
        return;
      }

      return deleteSession(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}

export function useGenerateSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, payload }: { groupId: string; payload: GenerateSessionsPayload }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (!isOnline) {
        const group = await offlineDb.getGroupByIdOffline(groupId);
        const schedules = await offlineDb.getSchedulesOffline(groupId);
        const startDate = new Date(payload.startDate);
        const endDate = new Date(payload.endDate);
        const newSessions: SessionEntity[] = [];

        // Generate sessions for matched schedule days in the range
        const curr = new Date(startDate);
        while (curr <= endDate) {
          const dayOfWeek = curr.getDay();
          const matchedSchedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
          if (matchedSchedule) {
            newSessions.push({
              id: generateUUIDv7(),
              groupId,
              sessionDate: curr.toISOString().split('T')[0],
              startTime: matchedSchedule.startTime,
              endTime: matchedSchedule.endTime,
              topic: 'حصة مجدولة',
              status: 'UPCOMING',
              isCancelled: false,
              group: group ? {
                id: group.id,
                name: group.name,
                gradeLevel: group.gradeLevel,
                academicYear: group.academicYear,
                academicTerm: group.academicTerm,
              } : undefined,
              _count: { attendanceRecords: 0 },
            });
          }
          curr.setDate(curr.getDate() + 1);
        }

        if (newSessions.length > 0) {
          await offlineDb.bulkPutSessions(newSessions);
        }

        await syncEngine.enqueue(
          'generic',
          API_ENDPOINTS.SCHEDULES.GENERATE_SESSIONS(groupId),
          'POST',
          payload,
        );

        toast.success(`تم توليد ${newSessions.length} حصة محلياً بنجاح ووضعها في قائمة المزامنة 💾`);
        return {
          generatedCount: newSessions.length,
          sessions: newSessions as unknown as LessonSessionItem[],
        };
      }

      return generateSessions(groupId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['content'] });
    },
  });
}
