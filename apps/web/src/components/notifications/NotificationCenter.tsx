'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  CheckCheck,
  Loader2,
  Sliders,
} from 'lucide-react';
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  type Notification,
} from '@/hooks/useNotifications';
import { useAuth } from '@/features/auth';
import { NotificationDetailModal } from './NotificationDetailModal';
import { NotificationItem } from './NotificationItem';
import { PushToggle } from './PushToggle';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Bell className="text-slate-400" size={28} />
      </div>
      <h3 className="text-sm font-semibold text-slate-700 mb-1">لا توجد إشعارات</h3>
      <p className="text-xs text-slate-400 leading-relaxed">
        ستظهر هنا إشعارات الحصص والامتحانات والغياب تلقائياً.
      </p>
    </div>
  );
}

export function NotificationCenter({ unreadCount: propUnreadCount }: { unreadCount?: number } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  const { data: unreadData } = useUnreadCount({ enabled: propUnreadCount === undefined });
  const { data: feedData, isLoading } = useNotifications(undefined, { enabled: isOpen });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = propUnreadCount ?? (unreadData as { unreadCount?: number } | undefined)?.unreadCount ?? 0;
  const notifications: Notification[] = feedData?.data ?? [];

  // Close drawer on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) markRead.mutate(notification.id);

    const notificationType = notification.notificationType || notification.type;
    const assessmentId = notification.data?.assessmentId;
    let route: string | null = null;

    if (
      notificationType === 'NEW_EXAM_PUBLISHED' ||
      notificationType === 'EXAM_DEADLINE_REMINDER'
    ) {
      route = assessmentId
        ? `/student/assessments?id=${encodeURIComponent(String(assessmentId))}`
        : '/student/assessments';
    } else if (
      notificationType === 'NEW_HOMEWORK_ASSIGNED' ||
      notificationType === 'HOMEWORK_DEADLINE_REMINDER'
    ) {
      route = '/student/dashboard';
    } else if (typeof notification.data?.url === 'string') {
      route = notification.data.url;
    }

    if (route) {
      setIsOpen(false);
      router.push(route);
    } else {
      setSelectedNotification(notification);
    }
  };

  const handleOpenDetails = (notification: Notification) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    setSelectedNotification(notification);
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((prev) => !prev)}
        id="notification-bell-btn"
        aria-label="الإشعارات"
        aria-expanded={isOpen}
        className="
          relative flex items-center justify-center w-10 h-10 rounded-full
          text-slate-600 hover:text-slate-900
          hover:bg-slate-100 transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 cursor-pointer
        "
      >
        <Bell size={20} />

        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="
                absolute -top-0.5 -right-0.5
                min-w-[18px] h-[18px] px-1
                flex items-center justify-center
                rounded-full bg-red-500 text-white
                text-[10px] font-bold leading-none
                ring-2 ring-white
              "
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Notification Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop (mobile) */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              ref={drawerRef}
              key="drawer"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="
                fixed sm:absolute inset-x-3 sm:inset-x-auto top-14 sm:top-12 z-50
                w-auto sm:w-[360px] max-w-[380px] max-h-[80vh] sm:max-h-[540px]
                bg-white rounded-2xl shadow-xl shadow-slate-200/80
                border border-slate-100
                flex flex-col overflow-hidden
                sm:end-0
              "
              dir="rtl"
              role="dialog"
              aria-label="مركز الإشعارات"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">الإشعارات</h2>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold text-blue-600 bg-blue-100 rounded-full">
                      {unreadCount} جديد
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {(user?.role === 'TEACHER' || user?.role === 'SECRETARIAT') && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push('/teacher/notifications');
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="مركز التحكم في الإشعارات والقواطع"
                      aria-label="مركز التحكم في الإشعارات"
                    >
                      <Sliders size={14} />
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markAllRead.isPending}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 cursor-pointer"
                      title="تحديد الكل كمقروء"
                    >
                      <CheckCheck size={13} />
                      <span>تحديد الكل</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="إغلاق"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Push Permission Toggle */}
              <div className="px-4 pt-3 pb-1">
                <PushToggle />
              </div>

              {/* Notification List */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="text-blue-400 animate-spin" size={24} />
                  </div>
                ) : notifications.length === 0 ? (
                  <EmptyState />
                ) : (
                  <AnimatePresence initial={false}>
                    {notifications.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onClick={() => handleNotificationClick(n)}
                        onOpenDetails={() => handleOpenDetails(n)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 p-2.5 bg-slate-50/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    const targetRoute =
                      user?.role === 'TEACHER' || user?.role === 'SECRETARIAT'
                        ? '/teacher/notifications'
                        : '/student/dashboard';
                    router.push(targetRoute);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 font-bold text-xs border border-slate-200/80 hover:border-blue-200 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bell size={13} className="text-blue-500" />
                  <span>
                    {notifications.length > 0
                      ? `عرض جميع الإشعارات (${notifications.length}) في مركز التحكم`
                      : 'الانتقال إلى مركز الإشعارات'}
                  </span>
                  <span>←</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notification Full Content Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onNavigate={(route) => {
          setSelectedNotification(null);
          setIsOpen(false);
          router.push(route);
        }}
      />
    </div>
  );
}

export default NotificationCenter;
