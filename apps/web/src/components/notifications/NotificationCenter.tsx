'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  BookOpen,
  Calendar,
  CreditCard,
  ClipboardList,
  MessageSquare,
  Bell as BellIcon,
  BellOff,
  Loader2,
} from 'lucide-react';
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  type Notification,
} from '@/hooks/useNotifications';
import { useWebPush } from '@/hooks/useWebPush';
import toast from 'react-hot-toast';

// ─── Type Icons Map ───────────────────────────────────────────────────────────

const typeConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  ABSENCE_ALERT_PARENT: {
    icon: <AlertTriangle size={16} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  EXAM_FAILED_ALERT_PARENT: {
    icon: <AlertTriangle size={16} />,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  ASSESSMENT_GRADED: {
    icon: <ClipboardList size={16} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  SESSION_REMINDER_STUDENT: {
    icon: <Calendar size={16} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  TEACHER_SESSION_REMINDER: {
    icon: <Calendar size={16} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  TEACHER_DAILY_SCHEDULE: {
    icon: <BookOpen size={16} />,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  ONLINE_EXAM_REMINDER: {
    icon: <ClipboardList size={16} />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  PAYMENT_RECEIVED: {
    icon: <CreditCard size={16} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  TEACHER_JOIN_REQUEST: {
    icon: <ClipboardList size={16} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  GENERAL_ANNOUNCEMENT: {
    icon: <BellIcon size={16} />,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  STUDENT_ABSENCE: {
    icon: <AlertTriangle size={16} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  default: {
    icon: <MessageSquare size={16} />,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
};

function getTypeConfig(type: string) {
  return typeConfig[type] || typeConfig.default;
}

// ─── Relative Time Formatter (Arabic) ────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  const rtf = new Intl.RelativeTimeFormat('ar-EG', { numeric: 'auto' });

  if (diffSecs < 60) return rtf.format(-diffSecs, 'second');
  if (diffSecs < 3600) return rtf.format(-Math.floor(diffSecs / 60), 'minute');
  if (diffSecs < 86400) return rtf.format(-Math.floor(diffSecs / 3600), 'hour');
  if (diffSecs < 2592000) return rtf.format(-Math.floor(diffSecs / 86400), 'day');
  return rtf.format(-Math.floor(diffSecs / 2592000), 'month');
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const config = getTypeConfig(notification.notificationType || notification.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={`
        relative flex items-start gap-3 p-4 cursor-pointer rounded-xl transition-all duration-200
        ${notification.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50'}
        border border-transparent hover:border-slate-100
      `}
      onClick={() => !notification.isRead && onRead(notification.id)}
    >
      {/* Unread dot */}
      {!notification.isRead && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white" />
      )}

      {/* Type Icon */}
      <div
        className={`
          flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
          ${config.bg} ${config.color}
        `}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold leading-snug mb-0.5 ${
            notification.isRead ? 'text-slate-700' : 'text-slate-900'
          }`}
        >
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[11px] text-slate-400 mt-1.5">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Push Permission Toggle ───────────────────────────────────────────────────

function PushToggle() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } =
    useWebPush();

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (permission === 'denied') {
      toast.error('تم حظر الإشعارات من إعدادات المتصفح. يرجى تفعيلها من إعدادات المتصفح.');
      return;
    }
    if (isLoading) return;
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={`
        flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl transition-all duration-150 select-none
        ${isLoading || permission === 'denied' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-slate-100/80 active:scale-[0.99]'}
      `}
    >
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-700">الإشعارات الفورية</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {permission === 'denied'
            ? 'محظورة في إعدادات المتصفح'
            : isSubscribed
            ? 'مفعّلة على هذا الجهاز'
            : 'اضغط لتفعيل الإشعارات'}
        </p>
      </div>
      <div
        className={`
          relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 pointer-events-none
          ${isSubscribed ? 'bg-blue-500' : 'bg-slate-300'}
        `}
        id="push-toggle"
        aria-label="تفعيل إشعارات المتصفح"
      >
        {isLoading ? (
          <Loader2 size={12} className="text-white animate-spin mx-auto" />
        ) : (
          <span
            className={`
              inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200
              ${isSubscribed ? 'translate-x-[18px]' : 'translate-x-[3px]'}
            `}
          />
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

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

// ─── Main NotificationCenter Component ───────────────────────────────────────

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { data: unreadData } = useUnreadCount();
  const { data: feedData, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = (unreadData as { unreadCount?: number } | undefined)?.unreadCount ?? 0;
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

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
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
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
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
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markAllRead.isPending}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                      title="تحديد الكل كمقروء"
                    >
                      <CheckCheck size={13} />
                      <span>تحديد الكل</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                        onRead={handleMarkRead}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t border-slate-100 px-4 py-3 text-center">
                  <p className="text-xs text-slate-400">
                    عرض آخر {notifications.length} إشعار
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
