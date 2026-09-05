'use client';

import React, { useState, useRef, useEffect } from 'react';
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
    const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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
    };

    return (
      <div className={cn("w-full relative", containerClassName)} ref={containerRef}>
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-neutral-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <button
            type="button"
            id={selectId}
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={cn(
              'w-full flex items-center justify-between rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-60 transition-colors',
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
              className
            )}
          >
            <span className={cn("truncate", !selectedOption || selectedOption.value === '' ? 'text-neutral-500' : '')}>
              {selectedOption ? selectedOption.label : '-- اختر --'}
            </span>
            <ChevronDown className={cn("h-4 w-4 text-neutral-400 transition-transform shrink-0 ml-1.5", isOpen && "rotate-180")} />
          </button>
          
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-neutral-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "flex w-full items-center justify-between px-3.5 py-2.5 text-sm transition-colors hover:bg-neutral-50 text-right",
                      isSelected ? "bg-primary-50 text-primary-700 font-semibold" : "text-neutral-700"
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-error-600">{error}</p>}

        {/* Hidden select for form compatibility if needed */}
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
