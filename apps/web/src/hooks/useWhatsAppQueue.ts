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
  return useQuery({
    queryKey: whatsAppQueueKeys.stats(),
    queryFn: async (): Promise<WhatsAppStats> => {
      return apiClient<WhatsAppStats>(API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_STATS, {
        method: 'GET',
      });
    },
    refetchInterval: 10_000,
  });
}

export function useWhatsAppQueue(page = 1, limit = 20) {
  return useQuery({
    queryKey: whatsAppQueueKeys.queue(page),
    queryFn: async (): Promise<PaginatedWhatsAppMessages> => {
      return apiClient<PaginatedWhatsAppMessages>(
        `${API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_QUEUE}?page=${page}&limit=${limit}`,
        { method: 'GET' },
      );
    },
    refetchInterval: 12_000,
  });
}

export function useWhatsAppFailed(page = 1, limit = 20) {
  return useQuery({
    queryKey: whatsAppQueueKeys.failed(page),
    queryFn: async (): Promise<PaginatedWhatsAppMessages> => {
      return apiClient<PaginatedWhatsAppMessages>(
        `${API_ENDPOINTS.NOTIFICATIONS.WHATSAPP_FAILED}?page=${page}&limit=${limit}`,
        { method: 'GET' },
      );
    },
    refetchInterval: 15_000,
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
