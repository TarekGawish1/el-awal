'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';
import toast from 'react-hot-toast';
import {
  typeConfig,
  formatFullDate,
  FormattedMessageText,
  NotificationCredentialsCard,
} from './NotificationDetailParts';

export interface NotificationDetailModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export function NotificationDetailModal({
  notification,
  isOpen,
  onClose,
  onNavigate,
}: NotificationDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setHasCopied(false);
      setCopiedKey(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !notification) return null;

  const type = notification.notificationType || notification.type;
  const config = typeConfig[type] || typeConfig.default;
  const notifData = (notification.data as Record<string, unknown>) || {};

  // Check if there are credentials in data
  const studentPhone = (notifData.studentPhoneOrCode as string) || (notifData.studentPhone as string);
  const studentPass = notifData.studentPassword as string | undefined;
  const parentPass = notifData.parentPassword as string | undefined;
  const directUrl = (notifData.platformUrl as string) || (notifData.url as string);

  // Check if there is an actionable route
  let actionRoute: string | null = null;
  const assessmentId = notifData.assessmentId;
  if (type === 'NEW_EXAM_PUBLISHED' || type === 'EXAM_DEADLINE_REMINDER') {
    actionRoute = assessmentId
      ? `/student/assessments?id=${encodeURIComponent(String(assessmentId))}`
      : '/student/assessments';
  } else if (type === 'NEW_HOMEWORK_ASSIGNED' || type === 'HOMEWORK_DEADLINE_REMINDER') {
    actionRoute = '/student/dashboard';
  } else if (typeof notifData.url === 'string') {
    actionRoute = notifData.url;
  }

  const handleCopyFull = async () => {
    try {
      const fullText = `${notification.title}\n\n${notification.message}`;
      await navigator.clipboard.writeText(fullText);
      setHasCopied(true);
      toast.success('تم نسخ نص الإشعار بالكامل');
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      toast.error('تعذر نسخ النص');
    }
  };

  const handleCopyValue = async (value: string, keyName: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(keyName);
      toast.success(`تم نسخ ${keyName}`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('تعذر النسخ');
    }
  };

  const modalContent = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
      >
        {/* Backdrop */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          key="modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="
            relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl
            border border-slate-100 flex flex-col max-h-[88vh] overflow-hidden
            z-10
          "
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`
                  w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm
                  ${config.bg} ${config.color}
                `}
              >
                {config.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-200/80 text-slate-700">
                    {config.label}
                  </span>
                  {!notification.isRead && (
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                      جديد
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Calendar size={12} className="inline" />
                  <span>{formatFullDate(notification.createdAt)}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="
                w-8 h-8 rounded-full flex items-center justify-center
                text-slate-400 hover:text-slate-700 hover:bg-slate-200/60
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400
              "
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
            {/* Title */}
            <h3
              id="notification-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 leading-snug"
            >
              {notification.title}
            </h3>

            {/* Message Body */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80">
              <FormattedMessageText text={notification.message} />
            </div>

            {/* Structured Credentials Quick-Actions Card (if available in data) */}
            <NotificationCredentialsCard
              studentPhone={studentPhone}
              studentPass={studentPass}
              parentPass={parentPass}
              copiedKey={copiedKey}
              onCopyValue={handleCopyValue}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={handleCopyFull}
              className="
                inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900
                transition-all active:scale-[0.98] shadow-sm
              "
            >
              {hasCopied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-700">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>نسخ نص الإشعار</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {actionRoute && (
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigate) {
                      onNavigate(actionRoute!);
                    }
                  }}
                  className="
                    inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                    bg-blue-600 hover:bg-blue-700 text-white transition-all
                    active:scale-[0.98] shadow-sm shadow-blue-500/20
                  "
                >
                  <span>الانتقال للمحتوى</span>
                  <ArrowRight size={13} className="rotate-180" />
                </button>
              )}

              <button
                onClick={onClose}
                className="
                  px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900
                  hover:bg-slate-200/50 transition-colors
                "
              >
                إغلاق
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
