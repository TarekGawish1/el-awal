'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import toast from 'react-hot-toast';

export interface WhatsAppMessageLog {
  id: string;
  recipientPhone: string;
  recipientName: string | null;
  recipientRole: string;
  templateType: string;
  messageBody: string;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'PERMANENT_FAIL';
  failureReason: string | null;
  retryCount: number;
  maxRetries: number;
  scheduledFor: string;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppStats {
  sentToday: number;
  queuedCount: number;
  failedCount: number;
  totalSent: number;
  totalDelivered: number;
}

export interface PaginatedWhatsAppMessages {
  data: WhatsAppMessageLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const whatsAppQueueKeys = {
  all: ['whatsapp-queue'] as const,
  stats: () => [...whatsAppQueueKeys.all, 'stats'] as const,
  queue: (page: number) => [...whatsAppQueueKeys.all, 'list', page] as const,
  failed: (page: number) => [...whatsAppQueueKeys.all, 'failed', page] as const,
};

export function useWhatsAppStats() {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return useQuery({
    queryKey: whatsAppQueueKeys.stats(),
    queryFn: async (): Promise<WhatsAppStats> => {
      return apiClient<WhatsAppStats>(API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_STATS, {
        method: 'GET',
      });
    },
    refetchInterval: isOnline ? 10_000 : false,
    networkMode: 'online',
    enabled: isOnline,
  });
}

export function useWhatsAppQueue(page = 1, limit = 20) {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return useQuery({
    queryKey: whatsAppQueueKeys.queue(page),
    queryFn: async (): Promise<PaginatedWhatsAppMessages> => {
      return apiClient<PaginatedWhatsAppMessages>(
        `${API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_QUEUE}?page=${page}&limit=${limit}`,
        { method: 'GET' },
      );
    },
    refetchInterval: isOnline ? 12_000 : false,
    networkMode: 'online',
    enabled: isOnline,
  });
}

export function useWhatsAppFailed(page = 1, limit = 20) {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return useQuery({
    queryKey: whatsAppQueueKeys.failed(page),
    queryFn: async (): Promise<PaginatedWhatsAppMessages> => {
      return apiClient<PaginatedWhatsAppMessages>(
        `${API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_FAILED}?page=${page}&limit=${limit}`,
        { method: 'GET' },
      );
    },
    refetchInterval: isOnline ? 15_000 : false,
    networkMode: 'online',
    enabled: isOnline,
  });
}

export function useRetryWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient<{ success: boolean; message: string }>(
        API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_RETRY(id),
        { method: 'POST' },
      );
    },
    onSuccess: (res) => {
      toast.success(res.message || 'تمت إعادة جدولة الرسالة بنجاح 🔄');
      queryClient.invalidateQueries({ queryKey: whatsAppQueueKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشلت إعادة محاولة إرسال الرسالة');
    },
  });
}

export function useRetryAllFailedWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient<{ success: boolean; message: string; count: number }>(
        API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_RETRY_ALL,
        { method: 'POST' },
      );
    },
    onSuccess: (res) => {
      toast.success(res.message || `تمت جدولة إعادة إرسال ${res.count} رسالة فاشلة 🔁`);
      queryClient.invalidateQueries({ queryKey: whatsAppQueueKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشلت إعادة إرسال الرسائل الفاشلة');
    },
  });
}

export function useDeleteWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient<{ success: boolean; message: string }>(
        API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_DELETE_MESSAGE(id),
        { method: 'DELETE' },
      );
    },
    onSuccess: (res) => {
      toast.success(res.message || 'تم حذف الرسالة بنجاح 🗑️');
      queryClient.invalidateQueries({ queryKey: whatsAppQueueKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل حذف الرسالة');
    },
  });
}

export function useClearAllFailedWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient<{ success: boolean; message: string; count: number }>(
        API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_CLEAR_FAILED,
        { method: 'POST' },
      );
    },
    onSuccess: (res) => {
      toast.success(res.message || `تم مسح ${res.count} رسالة فاشلة 🧹`);
      queryClient.invalidateQueries({ queryKey: whatsAppQueueKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل مسح الرسائل الفاشلة');
    },
  });
}

export function useClearWhatsAppQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient<{ success: boolean; message: string; count: number }>(
        API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_CLEAR_QUEUE,
        { method: 'POST' },
      );
    },
    onSuccess: (res) => {
      toast.success(res.message || `تم إفراغ الطابور وحذف ${res.count} رسالة 🧹`);
      queryClient.invalidateQueries({ queryKey: whatsAppQueueKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل إفراغ الطابور');
    },
  });
}

export function useDispatchWhatsAppQueueNow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient<{ success: boolean; message: string }>(
        API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_DISPATCH_NOW,
        { method: 'POST' },
      );
    },
    onSuccess: (res) => {
      toast.success(res.message || 'تم تفعيل الإرسال الفوري لطابور الواتساب بنجاح 🚀');
      queryClient.invalidateQueries({ queryKey: whatsAppQueueKeys.all });
    },
    onError: (err: any) => {
      toast.error(err.message || 'فشل تفعيل الإرسال الفوري');
    },
  });
}
