import { apiClient } from '@/lib/api/client';
import {
  LessonSessionItem,
  CreateSessionPayload,
  UpdateSessionPayload,
  GenerateSessionsPayload,
  TeacherCalendarQuery,
} from '../types/schedules.types';

export async function fetchTeacherSessions(query?: TeacherCalendarQuery): Promise<LessonSessionItem[]> {
  const searchParams = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== 'ALL' && val !== '') {
        searchParams.append(key, val.toString());
      }
    });
  }
  return apiClient<LessonSessionItem[]>(`/schedules/teacher/calendar?${searchParams.toString()}`);
}

export async function fetchGroupSessions(groupId: string): Promise<LessonSessionItem[]> {
  if (!groupId || groupId === 'ALL') return [];
  return apiClient<LessonSessionItem[]>(`/schedules/group/${groupId}/sessions`);
}

export async function fetchSessionTopics(gradeLevel?: string, groupId?: string): Promise<string[]> {
  const searchParams = new URLSearchParams();
  if (gradeLevel && gradeLevel !== 'ALL') searchParams.append('gradeLevel', gradeLevel);
  if (groupId && groupId !== 'ALL') searchParams.append('groupId', groupId);
  return apiClient<string[]>(`/schedules/topics?${searchParams.toString()}`);
}

export async function createSession(payload: CreateSessionPayload): Promise<LessonSessionItem> {
  return apiClient<LessonSessionItem>('/schedules/session', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSession(id: string, payload: UpdateSessionPayload): Promise<LessonSessionItem> {
  return apiClient<LessonSessionItem>(`/schedules/session/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteSession(id: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/schedules/session/${id}`, {
    method: 'DELETE',
  });
}

export async function generateSessions(
  groupId: string,
  payload: GenerateSessionsPayload,
): Promise<{ generatedCount: number; sessions: LessonSessionItem[] }> {
  return apiClient<{ generatedCount: number; sessions: LessonSessionItem[] }>(
    `/schedules/group/${groupId}/generate-sessions`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}
