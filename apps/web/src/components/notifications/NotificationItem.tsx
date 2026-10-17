'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';
import { getTypeConfig } from './notification-types.config';

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

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onOpenDetails: () => void;
}

export function NotificationItem({
  notification,
  onClick,
  onOpenDetails,
}: NotificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = getTypeConfig(notification.notificationType || notification.type);
  const isLongMessage = (notification.message?.length ?? 0) > 80 || notification.message?.includes('\n');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={`
        relative flex items-start gap-3 p-3.5 sm:p-4 cursor-pointer rounded-2xl transition-all duration-200
        ${notification.isRead ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50/90'}
        border border-transparent hover:border-slate-100 shadow-sm
      `}
      onClick={onClick}
    >
      {/* Unread dot */}
      {!notification.isRead && (
        <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white" />
      )}

      {/* Type Icon */}
      <div
        className={`
          flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-xs
          ${config.bg} ${config.color}
        `}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold leading-snug mb-1 ${
            notification.isRead ? 'text-slate-700' : 'text-slate-900'
          }`}
        >
          {notification.title}
        </p>

        {/* Message preview or expanded text */}
        <div className="text-xs text-slate-500 leading-relaxed">
          {isExpanded ? (
            <p className="whitespace-pre-line text-slate-700 break-words mt-1 select-text">
              {notification.message}
            </p>
          ) : (
            <p className="line-clamp-2">
              {notification.message}
            </p>
          )}
        </div>

        {/* Card footer controls */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-100/60 text-[11px]">
          <span className="text-slate-400">
            {formatRelativeTime(notification.createdAt)}
          </span>

          <div className="flex items-center gap-1.5">
            {isLongMessage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded((prev) => !prev);
                }}
                className="
                  inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg
                  text-blue-600 hover:text-blue-800 hover:bg-blue-50/80
                  font-medium transition-colors cursor-pointer
                "
              >
                <span>{isExpanded ? 'عرض أقل' : 'عرض المزيد'}</span>
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails();
              }}
              className="
                inline-flex items-center gap-1 px-2 py-0.5 rounded-lg
                text-slate-500 hover:text-slate-800 hover:bg-slate-100
                font-medium transition-colors cursor-pointer
              "
              title="عرض التفاصيل في نافذة كاملة"
            >
              <span>التفاصيل</span>
              <Maximize2 size={11} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
