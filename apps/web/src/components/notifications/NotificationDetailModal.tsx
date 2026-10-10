'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  KeyRound,
  UserRound,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ClipboardList,
  BookOpen,
  CreditCard,
  MessageSquare,
  Bell,
  ArrowRight,
} from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';
import toast from 'react-hot-toast';

export interface NotificationDetailModalProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

const typeConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  STUDENT_APPROVAL_CREDENTIALS: {
    label: 'بيانات القبول والدخول',
    icon: <ShieldCheck size={20} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  STUDENT_REGISTRATION_CREDENTIALS: {
    label: 'بيانات التسجيل والحساب',
    icon: <KeyRound size={20} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  ABSENCE_ALERT_PARENT: {
    label: 'تنبيه غياب',
    icon: <AlertTriangle size={20} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  STUDENT_ABSENCE: {
    label: 'تسجيل غياب',
    icon: <AlertTriangle size={20} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  EXAM_FAILED_ALERT_PARENT: {
    label: 'تنبيه درجات',
    icon: <AlertTriangle size={20} />,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  ASSESSMENT_GRADED: {
    label: 'تصحيح تقييم',
    icon: <ClipboardList size={20} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  NEW_HOMEWORK_ASSIGNED: {
    label: 'واجب جديد',
    icon: <ClipboardList size={20} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  NEW_EXAM_PUBLISHED: {
    label: 'امتحان جديد',
    icon: <ClipboardList size={20} />,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  SESSION_REMINDER_STUDENT: {
    label: 'تذكير بالحصة',
    icon: <Calendar size={20} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  TEACHER_SESSION_REMINDER: {
    label: 'تذكير بموعد الحصة',
    icon: <Calendar size={20} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  TEACHER_DAILY_SCHEDULE: {
    label: 'جدول اليوم',
    icon: <BookOpen size={20} />,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  PAYMENT_RECEIVED: {
    label: 'تأكيد دفع',
    icon: <CreditCard size={20} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  GENERAL_ANNOUNCEMENT: {
    label: 'إعلان عام',
    icon: <Bell size={20} />,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  default: {
    label: 'إشعار',
    icon: <MessageSquare size={20} />,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
};

function formatFullDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Formats notification text: detects URLs and makes them clickable,
 * renders markdown backticks (`...`) as code, and *bold* text.
 */
function FormattedMessageText({ text }: { text: string }) {
  if (!text) return null;

  // Split lines to preserve paragraphs
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-slate-800 leading-relaxed text-sm select-text">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-2" />;
        }

        // Split by URL regex
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = line.split(urlRegex);

        return (
          <p key={lineIdx} className="break-words">
            {parts.map((part, partIdx) => {
              if (part.match(/^https?:\/\//)) {
                return (
                  <a
                    key={partIdx}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline font-medium mx-1 break-all"
                  >
                    <span>{part}</span>
                    <ExternalLink size={12} className="inline flex-shrink-0" />
                  </a>
                );
              }

              // Process backticks `code` inside non-URL parts
              if (part.includes('`')) {
                const codeParts = part.split(/(`[^`]+`)/g);
                return (
                  <React.Fragment key={partIdx}>
                    {codeParts.map((cPart, cIdx) => {
                      if (cPart.startsWith('`') && cPart.endsWith('`')) {
                        const codeVal = cPart.slice(1, -1);
                        return (
                          <code
                            key={cIdx}
                            className="bg-slate-100 text-blue-700 font-mono text-xs px-1.5 py-0.5 rounded border border-slate-200 select-all"
                          >
                            {codeVal}
                          </code>
                        );
                      }
                      return cPart;
                    })}
                  </React.Fragment>
                );
              }

              return <React.Fragment key={partIdx}>{part}</React.Fragment>;
            })}
          </p>
        );
      })}
    </div>
  );
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
            {(studentPhone || studentPass || parentPass) && (
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-blue-800 text-xs font-bold mb-1">
                  <KeyRound size={14} />
                  <span>بيانات الدخول السريع:</span>
                </div>

                {studentPhone && (
                  <div className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2 border border-blue-100">
                    <span className="text-slate-500">رقم الهاتف / المستخدم:</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-semibold text-slate-800">{studentPhone}</code>
                      <button
                        onClick={() => handleCopyValue(studentPhone, 'رقم الهاتف')}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="نسخ"
                      >
                        {copiedKey === 'رقم الهاتف' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                )}

                {studentPass && (
                  <div className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2 border border-blue-100">
                    <span className="text-slate-500">كلمة مرور الطالب:</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-semibold text-slate-800">{studentPass}</code>
                      <button
                        onClick={() => handleCopyValue(studentPass, 'كلمة مرور الطالب')}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="نسخ"
                      >
                        {copiedKey === 'كلمة مرور الطالب' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                )}

                {parentPass && (
                  <div className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2 border border-blue-100">
                    <span className="text-slate-500">كلمة مرور ولي الأمر:</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-semibold text-slate-800">{parentPass}</code>
                      <button
                        onClick={() => handleCopyValue(parentPass, 'كلمة مرور ولي الأمر')}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="نسخ"
                      >
                        {copiedKey === 'كلمة مرور ولي الأمر' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
