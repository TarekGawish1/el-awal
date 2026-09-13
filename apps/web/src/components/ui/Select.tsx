'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, label, error, options, id, value, onChange, disabled, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : `select-${generatedId}`);
    const listboxId = `${selectId}-listbox`;
    const errorId = `${selectId}-error`;

    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Close on outside click
    useEffect(() => {
      const handleOutsideClick = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const selectedOption = options.find((opt) => opt.value === value);

    const handleSelect = (val: string) => {
      onChange?.({ target: { value: val, name: props.name } } as React.ChangeEvent<HTMLSelectElement>);
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    return (
      <div className={cn('w-full relative text-start', containerClassName)} ref={containerRef}>
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-neutral-700 mb-1.5">
            {label}
            {props.required && <span className="text-error-500 ms-1">*</span>}
          </label>
        )}
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            id={selectId}
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'w-full flex items-center justify-between rounded-md border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 transition-colors',
              'focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-60',
              error && 'border-error-500 text-error-900 focus:border-error-500 focus-visible:ring-error-500',
              className
            )}
          >
            <span className={cn('truncate', !selectedOption || selectedOption.value === '' ? 'text-neutral-500' : 'text-neutral-900 font-medium')}>
              {selectedOption ? selectedOption.label : '-- اختر --'}
            </span>
            <ChevronDown
              className={cn('h-4 w-4 text-neutral-500 transition-transform shrink-0 ms-2', isOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </button>

          {isOpen && (
            <div
              id={listboxId}
              role="listbox"
              aria-labelledby={selectId}
              className="absolute z-50 mt-1 w-full rounded-md border border-neutral-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto"
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'flex w-full items-center justify-between px-3.5 py-2.5 text-sm transition-colors text-right focus-visible:outline-none focus-visible:bg-neutral-100',
                      isSelected
                        ? 'bg-primary-50 text-primary-700 font-semibold'
                        : 'text-neutral-800 hover:bg-neutral-50'
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary-600 shrink-0 ms-2" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-error-600 font-medium">
            {error}
          </p>
        )}

        {/* Hidden select for form compatibility */}
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
