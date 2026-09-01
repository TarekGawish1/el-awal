import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export interface Assistant {
  id: string;
  teacherId: string;
  assistantId: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  permissions: string[];
  assignedGroupIds: string[];
  createdAt: string;
  assistant: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    isActive: boolean;
  };
}

export function useAssistants() {
  const queryClient = useQueryClient();
  const queryKey = ['teacher-assistants'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<Assistant[]>(API_ENDPOINTS.TEACHER.ASSISTANTS.LIST);
      return data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: { phone?: string; email?: string }) => {
      const { data } = await api.post<Assistant>(API_ENDPOINTS.TEACHER.ASSISTANTS.INVITE, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Assistant> }) => {
      const { data } = await api.put<Assistant>(API_ENDPOINTS.TEACHER.ASSISTANTS.MANAGE(id), payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(API_ENDPOINTS.TEACHER.ASSISTANTS.MANAGE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    assistants: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    inviteAssistant: inviteMutation.mutateAsync,
    updateAssistant: updateMutation.mutateAsync,
    deleteAssistant: deleteMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
  };
}
