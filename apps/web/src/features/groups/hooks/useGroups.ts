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
import { CreateGroupPayload, EnrollStudentPayload } from '../types/groups.types';
import { offlineDb } from '@/lib/offline/db';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return offlineDb.getGroupsOffline();
      }

      try {
        const groups = await fetchGroups();
        if (groups && groups.length > 0) {
          offlineDb.bulkPutGroups(groups);
        }
        return groups;
      } catch {
        return offlineDb.getGroupsOffline();
      }
    },
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return offlineDb.getGroupByIdOffline(id);
      }
      try {
        return await fetchGroup(id);
      } catch {
        return offlineDb.getGroupByIdOffline(id);
      }
    },
    enabled: !!id,
  });
}

export function useGroupStudents(id: string) {
  return useQuery({
    queryKey: ['groups', id, 'students'],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return offlineDb.getStudentsOffline({ groupId: id });
      }
      try {
        return await fetchGroupStudents(id);
      } catch {
        return offlineDb.getStudentsOffline({ groupId: id });
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
  return useQuery({
    queryKey: ['students', 'search', query],
    queryFn: async () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        return offlineDb.getStudentsOffline({ search: query });
      }
      try {
        return await searchStudents(query);
      } catch {
        return offlineDb.getStudentsOffline({ search: query });
      }
    },
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });
}
