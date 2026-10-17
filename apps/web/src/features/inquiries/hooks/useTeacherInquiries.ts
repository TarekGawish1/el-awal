import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useTeacherInquiries() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch inquiries safely unwrapping either raw array or { success: true, data: [...] }
  const {
    data: inquiries = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ContactMessage[]>({
    queryKey: ['contact-messages'],
    queryFn: async () => {
      const res = await apiClient<any>(API_ENDPOINTS.CONTACT_MESSAGES.LIST);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
    staleTime: 30000,
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient(API_ENDPOINTS.CONTACT_MESSAGES.MARK_READ(id), {
        method: 'PATCH',
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['contact-messages'] });
      const previous = queryClient.getQueryData<ContactMessage[]>(['contact-messages']);
      if (previous) {
        queryClient.setQueryData<ContactMessage[]>(
          ['contact-messages'],
          previous.map((msg) => (msg.id === id ? { ...msg, isRead: true } : msg))
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['contact-messages'], context.previous);
      }
      toast.error('حدث خطأ أثناء تحديث حالة الرسالة');
    },
    onSuccess: () => {
      toast.success('تم تحديد الرسالة كمقروءة');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['contact-messages-unread-count'] });
    },
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient(API_ENDPOINTS.CONTACT_MESSAGES.DELETE(id), {
        method: 'DELETE',
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['contact-messages'] });
      const previous = queryClient.getQueryData<ContactMessage[]>(['contact-messages']);
      if (previous) {
        queryClient.setQueryData<ContactMessage[]>(
          ['contact-messages'],
          previous.filter((msg) => msg.id !== id)
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['contact-messages'], context.previous);
      }
      toast.error('حدث خطأ أثناء حذف الرسالة');
    },
    onSuccess: () => {
      toast.success('تم حذف الرسالة بنجاح');
    },
    onSettled: () => {
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['contact-messages-unread-count'] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الرسالة نهائياً؟')) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((msg) => {
      const matchesSearch =
        searchQuery === '' ||
        msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.phone.includes(searchQuery) ||
        msg.message.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'UNREAD' && !msg.isRead) ||
        (statusFilter === 'READ' && msg.isRead);

      return matchesSearch && matchesStatus;
    });
  }, [inquiries, searchQuery, statusFilter]);

  const totalCount = inquiries.length;
  const unreadCount = inquiries.filter((m) => !m.isRead).length;
  const readCount = totalCount - unreadCount;

  return {
    inquiries,
    filteredInquiries,
    totalCount,
    unreadCount,
    readCount,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    isMarkingRead: markAsReadMutation.isPending,
    deleteMessage: handleDelete,
    deletingId,
  };
}
