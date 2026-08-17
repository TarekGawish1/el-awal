import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGroups,
  createGroup,
  fetchGroup,
  fetchGroupStudents,
  addStudentToGroup,
  removeStudentFromGroup,
  searchStudents
} from '../api/groups.api';
import { CreateGroupPayload, EnrollStudentPayload } from '../types/groups.types';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => fetchGroup(id),
    enabled: !!id,
  });
}

export function useGroupStudents(id: string) {
  return useQuery({
    queryKey: ['groups', id, 'students'],
    queryFn: () => fetchGroupStudents(id),
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
    queryFn: () => searchStudents(query),
    enabled: query.length >= 2,
    staleTime: 60 * 1000, // 1 minute
  });
}
