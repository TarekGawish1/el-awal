import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGroups,
  createGroup,
  fetchGroup,
  updateGroup,
  fetchGroupStudents,
  addStudentToGroup,
  removeStudentFromGroup,
  searchStudents,
  deleteGroup,
} from '../api/groups.api';
import { Group, CreateGroupPayload, EnrollStudentPayload, GroupEnrollment, Student } from '../types/groups.types';
import { offlineDb } from '@/lib/offline/db';

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async (): Promise<Group[]> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return (await offlineDb.getGroupsOffline()) as unknown as Group[];
      }

      try {
        const groups = await fetchGroups();
        if (groups && groups.length > 0) {
          offlineDb.bulkPutGroups(groups as any);
        }
        return groups;
      } catch {
        return (await offlineDb.getGroupsOffline()) as unknown as Group[];
      }
    },
  });
}

export function useGroup(id: string) {
  return useQuery<Group | null>({
    queryKey: ['groups', id],
    queryFn: async (): Promise<Group | null> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return (await offlineDb.getGroupByIdOffline(id)) as unknown as Group | null;
      }
      try {
        return await fetchGroup(id);
      } catch {
        return (await offlineDb.getGroupByIdOffline(id)) as unknown as Group | null;
      }
    },
    enabled: !!id,
  });
}

export function useGroupStudents(id: string) {
  return useQuery<GroupEnrollment[]>({
    queryKey: ['groups', id, 'students'],
    queryFn: async (): Promise<GroupEnrollment[]> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const offlineStudents = await offlineDb.getStudentsOffline({ groupId: id });
        return offlineStudents.map((s) => ({
          id: s.id,
          enrolledAt: new Date().toISOString(),
          status: 'ACTIVE',
          attendanceRate: 100,
          student: {
            id: s.id,
            code: s.studentCode,
            gradeLevel: s.gradeLevel || '',
            academicStage: '',
            academicStatus: s.academicStatus || 'ACTIVE',
            user: {
              name: s.fullName || s.user?.fullName || '',
              phone: s.phone || s.user?.phone || '',
            },
          },
        }));
      }
      try {
        return await fetchGroupStudents(id);
      } catch {
        const offlineStudents = await offlineDb.getStudentsOffline({ groupId: id });
        return offlineStudents.map((s) => ({
          id: s.id,
          enrolledAt: new Date().toISOString(),
          status: 'ACTIVE',
          attendanceRate: 100,
          student: {
            id: s.id,
            code: s.studentCode,
            gradeLevel: s.gradeLevel || '',
            academicStage: '',
            academicStatus: s.academicStatus || 'ACTIVE',
            user: {
              name: s.fullName || s.user?.fullName || '',
              phone: s.phone || s.user?.phone || '',
            },
          },
        }));
      }
    },
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateGroupPayload) => createGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateGroupPayload> }) => updateGroup(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.id] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useAddStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ groupId, payload }: { groupId: string; payload: EnrollStudentPayload }) => 
      addStudentToGroup(groupId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'students'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] });
    },
  });
}

export function useRemoveStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ groupId, studentId }: { groupId: string; studentId: string }) => 
      removeStudentFromGroup(groupId, studentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'students'] });
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] });
    },
  });
}

export function useSearchStudents(query: string) {
  return useQuery<{ data: Student[] }>({
    queryKey: ['students', 'search', query],
    queryFn: async (): Promise<{ data: Student[] }> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const offlineStudents = await offlineDb.getStudentsOffline({ search: query });
        return {
          data: offlineStudents.map((s) => ({
            id: s.id,
            code: s.studentCode,
            gradeLevel: s.gradeLevel || '',
            academicStage: '',
            academicStatus: s.academicStatus || 'ACTIVE',
            user: {
              name: s.fullName || s.user?.fullName || '',
              phone: s.phone || s.user?.phone || '',
            },
          })),
        };
      }
      try {
        return await searchStudents(query);
      } catch {
        const offlineStudents = await offlineDb.getStudentsOffline({ search: query });
        return {
          data: offlineStudents.map((s) => ({
            id: s.id,
            code: s.studentCode,
            gradeLevel: s.gradeLevel || '',
            academicStage: '',
            academicStatus: s.academicStatus || 'ACTIVE',
            user: {
              name: s.fullName || s.user?.fullName || '',
              phone: s.phone || s.user?.phone || '',
            },
          })),
        };
      }
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });
}
