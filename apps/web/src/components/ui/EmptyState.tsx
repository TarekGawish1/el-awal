'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
  compact?: boolean;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
  compact = false,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-8 sm:p-12 transition-all',
        compact && 'p-4 sm:p-6',
        className
      )}
      dir="rtl"
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 transition-transform group-hover:scale-105">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
        {title}
      </h3>

      {description && (
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="primary"
          size="sm"
          className="rounded-xl shadow-sm hover:shadow transition-all font-bold"
        >
          {actionLabel}
        </Button>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
