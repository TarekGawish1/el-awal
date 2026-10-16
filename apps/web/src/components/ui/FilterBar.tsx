'use client';

import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterBarProps {
  /** Current search input value */
  searchQuery: string;
  /** Search value change handler */
  onSearchChange: (value: string) => void;
  /** Search placeholder text */
  placeholder?: string;
  /** Optional filter pills or dropdown options */
  filterOptions?: FilterOption[];
  /** Currently selected filter */
  selectedFilter?: string;
  /** Filter select change handler */
  onFilterChange?: (value: string) => void;
  /** Optional sort options */
  sortOptions?: FilterOption[];
  /** Currently selected sort */
  selectedSort?: string;
  /** Sort select change handler */
  onSortChange?: (value: string) => void;
  /** Additional custom actions/buttons on the left side */
  actions?: React.ReactNode;
  /** Additional custom children */
  children?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  placeholder = 'بحث...',
  filterOptions,
  selectedFilter,
  onFilterChange,
  sortOptions,
  selectedSort,
  onSortChange,
  actions,
  children,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all',
        className
      )}
      dir="rtl"
    >
      <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input Box */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full transition-colors"
              aria-label="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills / Dropdown */}
        {filterOptions && filterOptions.length > 0 && onFilterChange && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
            {filterOptions.map((opt) => {
              const isSelected = selectedFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFilterChange(opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
                    isSelected
                      ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Sort Selector */}
        {sortOptions && sortOptions.length > 0 && onSortChange && (
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSort}
              onChange={(e) => onSortChange(e.target.value)}
              className="py-1.5 pl-3 pr-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
            >
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {children}
      </div>

      {/* Action Buttons on Left */}
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
