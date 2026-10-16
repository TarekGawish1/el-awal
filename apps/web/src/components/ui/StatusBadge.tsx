'use client';

import React from 'react';
import { Badge, BadgeProps } from './Badge';
import { cn } from '@/lib/utils/cn';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Archive, 
  FileText, 
  Check, 
  HelpCircle 
} from 'lucide-react';

export type EntityStatus =
  | 'active'
  | 'inactive'
  | 'draft'
  | 'published'
  | 'archived'
  | 'pending'
  | 'completed'
  | 'submitted'
  | 'graded'
  | 'paid'
  | 'unpaid'
  | 'overdue'
  | 'cancelled'
  | 'in_progress'
  | 'present'
  | 'absent'
  | 'excused'
  | 'missing'
  | 'no_homework'
  | string;

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: EntityStatus;
  label?: string;
  showIcon?: boolean;
  variant?: BadgeProps['variant'];
}

interface StatusConfig {
  variant: NonNullable<BadgeProps['variant']>;
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIG_MAP: Record<string, StatusConfig> = {
  // General & Lifecycle
  active: { variant: 'success', defaultLabel: 'نشط', icon: CheckCircle2 },
  inactive: { variant: 'neutral', defaultLabel: 'غير نشط', icon: XCircle },
  published: { variant: 'success', defaultLabel: 'منشور', icon: CheckCircle2 },
  draft: { variant: 'warning', defaultLabel: 'مسودة', icon: FileText },
  archived: { variant: 'neutral', defaultLabel: 'مؤرشف', icon: Archive },

  // Workflow & Submissions
  pending: { variant: 'warning', defaultLabel: 'قيد الانتظار', icon: Clock },
  completed: { variant: 'success', defaultLabel: 'مكتمل', icon: CheckCircle2 },
  submitted: { variant: 'info', defaultLabel: 'تم التسليم', icon: Check },
  graded: { variant: 'success', defaultLabel: 'تم التصحيح', icon: CheckCircle2 },
  in_progress: { variant: 'info', defaultLabel: 'قيد التقدم', icon: Clock },
  cancelled: { variant: 'error', defaultLabel: 'ملغي', icon: XCircle },

  // Attendance
  present: { variant: 'success', defaultLabel: 'حاضر', icon: Check },
  absent: { variant: 'error', defaultLabel: 'غائب', icon: XCircle },
  excused: { variant: 'warning', defaultLabel: 'معذور', icon: AlertCircle },

  // Homework
  missing: { variant: 'error', defaultLabel: 'لم يُحل', icon: XCircle },
  not_submitted: { variant: 'error', defaultLabel: 'لم يُسلم', icon: XCircle },
  checked_onsite: { variant: 'info', defaultLabel: 'تم الفحص في السنتر', icon: Check },
  no_homework: { variant: 'neutral', defaultLabel: 'لا يوجد واجب', icon: HelpCircle },

  // Finance & Payments
  paid: { variant: 'success', defaultLabel: 'تم الدفع', icon: CheckCircle2 },
  unpaid: { variant: 'error', defaultLabel: 'غير مدفوع', icon: AlertCircle },
  overdue: { variant: 'error', defaultLabel: 'متأخر', icon: AlertCircle },
};

export function StatusBadge({
  status,
  label,
  showIcon = true,
  className,
  size = 'sm',
  variant: explicitVariant,
  ...props
}: StatusBadgeProps) {
  const normalizedKey = (status || '').toLowerCase().trim();
  const config = STATUS_CONFIG_MAP[normalizedKey];

  const variant = explicitVariant || config?.variant || 'neutral';
  const displayLabel = label || config?.defaultLabel || status;
  const IconComponent = config?.icon;

  return (
    <Badge
      variant={variant}
      size={size}
      className={cn('gap-1 font-medium transition-all select-none', className)}
      {...props}
    >
      {showIcon && IconComponent && <IconComponent className="w-3.5 h-3.5 shrink-0" />}
      <span>{displayLabel}</span>
    </Badge>
  );
}
