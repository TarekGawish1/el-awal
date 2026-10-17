'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  NotificationSystemSettings,
} from '@/hooks/useNotificationSettings';
import {
  useInfiniteNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from '@/hooks/useNotifications';
import { useWhatsAppOverview } from '@/hooks/useWhatsAppQueue';
import { useAuth } from '@/features/auth';
import { NotificationTab } from '../components/NotificationHeaderTabs';

export function useTeacherNotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationTab>('whatsapp');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHER' | 'STUDENT' | 'PARENT'>('ALL');
  const [pageSize, setPageSize] = useState<number>(15);
  const [isDispatchingSchedule, setIsDispatchingSchedule] = useState(false);

  // Consolidated WhatsApp Overview (status + stats + initial failed) in 1 request
  const { data: overviewData } = useWhatsAppOverview({
    enabled: activeTab === 'whatsapp',
    pollQr: isWhatsAppModalOpen,
  });

  const whatsAppStatus = overviewData?.status || null;
  const isWABanned = Boolean(whatsAppStatus?.isBanned || whatsAppStatus?.status === 'banned');
  const isWAConnected = !isWABanned && Boolean(whatsAppStatus?.connected || whatsAppStatus?.status === 'open');
  const isWAWaitingQR = !isWABanned && !isWAConnected && Boolean(whatsAppStatus?.status === 'qr' || whatsAppStatus?.qr);

  // Lazy-load settings only when controls tab is active
  const { data: settings, isLoading: isSettingsLoading } = useNotificationSettings({
    enabled: activeTab === 'controls',
  });
  const updateSettings = useUpdateNotificationSettings();

  const handleTestDailySchedule = async () => {
    try {
      setIsDispatchingSchedule(true);
      const res = await apiClient<{ success: boolean; message: string; dispatchedCount?: number }>(
        API_ENDPOINTS.NOTIFICATIONS.TRIGGER_DAILY_SCHEDULE,
        { method: 'POST' },
      );
      if (res.success) {
        toast.success(res.message || 'تم إرسال جدول الحصص اليومي عبر الواتساب بنجاح! 🚀');
      } else {
        toast.error(res.message || 'فشل إرسال جدول الحصص');
      }
    } catch (err: any) {
      toast.error(err?.message || 'فشل إرسال جدول الحصص');
    } finally {
      setIsDispatchingSchedule(false);
    }
  };

  // Lazy-load in-app notification feed only when feed tab is active
  const {
    data: infiniteFeedData,
    isLoading: isFeedLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchFeed,
  } = useInfiniteNotifications({
    scope: 'all',
    role: roleFilter !== 'ALL' ? roleFilter : undefined,
    limit: pageSize,
    enabled: activeTab === 'feed',
  });

  const { data: unreadData } = useUnreadCount();
  const waStats = overviewData?.stats;
  const failedWaCount = waStats?.failedCount ?? 0;
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const { user } = useAuth();

  const unreadCount = unreadData?.unreadCount ?? 0;
  const notifications = infiniteFeedData?.pages.flatMap((page) => page.data) ?? [];
  const totalCount = infiniteFeedData?.pages[0]?.meta?.total ?? notifications.length;

  const filteredNotifications = notifications.filter((item) => {
    if (readFilter === 'UNREAD' && item.isRead) return false;
    if (readFilter === 'READ' && !item.isRead) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.recipient?.fullName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggle = (key: keyof NotificationSystemSettings, currentValue?: boolean) => {
    updateSettings.mutate({ [key]: !currentValue });
  };

  return {
    activeTab,
    setActiveTab,
    isWhatsAppModalOpen,
    setIsWhatsAppModalOpen,
    searchQuery,
    setSearchQuery,
    readFilter,
    setReadFilter,
    roleFilter,
    setRoleFilter,
    pageSize,
    setPageSize,
    isDispatchingSchedule,
    whatsAppStatus,
    isWABanned,
    isWAConnected,
    isWAWaitingQR,
    failedWaCount,
    unreadCount,
    settings,
    isSettingsLoading,
    updateSettings,
    handleToggle,
    handleTestDailySchedule,
    notifications,
    filteredNotifications,
    totalCount,
    isFeedLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetchFeed,
    markRead,
    markAllRead,
    user,
  };
}
