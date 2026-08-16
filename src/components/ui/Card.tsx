import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'subtle';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  const variantStyles = {
    default: 'bg-white border border-neutral-200 shadow-sm',
    elevated: 'bg-white border border-neutral-200/80 shadow-md',
    bordered: 'bg-white border-2 border-neutral-300',
    subtle: 'bg-neutral-50 border border-neutral-200',
  };

  return (
    <div
      className={cn('rounded-lg transition-all duration-150', variantStyles[variant], className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4 border-b border-neutral-100 flex items-center justify-between', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-neutral-800 tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-neutral-500 mt-0.5', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-3.5 bg-neutral-50/70 border-t border-neutral-100 flex items-center', className)} {...props} />;
}
