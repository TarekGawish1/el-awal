import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, startIcon, endIcon, id, type = 'text', disabled, ...props }, ref) => {
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-neutral-700">
            {label}
            {props.required && <span className="text-error-500 ms-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-neutral-400">
              {startIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            dir="auto"
            className={cn(
              'w-full min-h-[46px] rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-neutral-900 placeholder:text-neutral-400 shadow-xs transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed',
              startIcon && 'ps-10',
              endIcon && 'pe-10',
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500 text-error-900',
              className
            )}
            {...props}
          />

          {endIcon && (
            <div className="absolute inset-y-0 end-0 pe-3 flex items-center">
              {endIcon}
            </div>
          )}
        </div>

        {error ? (
          <p id={errorId} role="alert" className="text-xs text-error-600 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-neutral-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
