import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function Alert({ className, variant = 'default', children, ...props }: AlertProps) {
  const variantStyles = {
    default: 'bg-neutral-50 text-neutral-800 border-neutral-200',
    success: 'bg-success-50 text-success-800 border-success-200',
    warning: 'bg-warning-50 text-warning-800 border-warning-200',
    error: 'bg-error-50 text-error-800 border-error-200',
    info: 'bg-info-50 text-info-800 border-info-200',
  };

  return (
    <div
      role="alert"
      className={cn('rounded-lg border p-4 text-sm flex items-start gap-3', variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('font-semibold leading-none tracking-tight mb-1', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn('text-xs opacity-90 leading-relaxed', className)} {...props} />;
}
