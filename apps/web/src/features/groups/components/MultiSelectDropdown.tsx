'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, Layers } from 'lucide-react';

export interface DropdownOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface MultiSelectDropdownProps {
  label?: string;
  placeholder: string;
  allSelectedLabel: string;
  options: DropdownOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  withSearch?: boolean;
  className?: string;
}

/**
 * FilterDropdown (Single Selection without checkboxes)
 * Allows selecting a single option or "All", with instant selection and no checkboxes.
 */
export function MultiSelectDropdown({
  placeholder,
  allSelectedLabel,
  options = [],
  selectedValues = [],
  onChange,
  withSearch = false,
  className = '',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeOptions = options || [];
  const safeSelectedValues = selectedValues || [];

  // Filter options with search query
  const filteredOptions = useMemo(() => {
    if (!withSearch || !searchQuery.trim()) return safeOptions;
    const q = searchQuery.toLowerCase().trim();
    return safeOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [safeOptions, withSearch, searchQuery]);

  // Is "All" currently active (empty selection or explicit all)
  const isAllActive = safeSelectedValues.length === 0;

  // Select a single option and close dropdown
  const handleSelectSingleOption = (val: string) => {
    // If clicking the already selected single option, keep it or toggle
    if (safeSelectedValues.length === 1 && safeSelectedValues[0] === val) {
      onChange([]); // reset to all
    } else {
      onChange([val]); // single select
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  // Select "All" and close dropdown
  const handleSelectAll = () => {
    onChange([]);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Determine button trigger text
  const triggerText = useMemo(() => {
    if (safeSelectedValues.length === 0) {
      return allSelectedLabel;
    }
    const found = safeOptions.find((o) => o.value === safeSelectedValues[0]);
    return found ? found.label : safeSelectedValues[0];
  }, [safeSelectedValues, safeOptions, allSelectedLabel]);

  const hasSelection = safeSelectedValues.length > 0;

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 flex items-center justify-between gap-2 px-3.5 py-2 text-sm bg-white rounded-xl border transition-all cursor-pointer select-none text-right shadow-2xs ${
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-xs'
            : hasSelection
            ? 'border-primary-300 bg-primary-50/20 text-primary-900'
            : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={`truncate text-xs sm:text-sm ${
              hasSelection ? 'font-bold text-primary-900' : 'font-medium text-neutral-700'
            }`}
          >
            {triggerText}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasSelection && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="p-1 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
              title="إعادة التعيين للكل"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-primary-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[120] mt-1.5 w-full min-w-[240px] rounded-2xl border border-neutral-200 bg-white shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150 text-start overflow-hidden">
          {/* Optional Search */}
          {withSearch && safeOptions.length > 5 && (
            <div className="p-2 border-b border-neutral-100">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في الخيارات..."
                  autoFocus
                  className="w-full text-xs px-3 py-2 pr-8 rounded-xl border border-neutral-200 bg-neutral-50/80 text-neutral-800 placeholder-neutral-400 focus:bg-white focus:border-primary-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1" style={{ scrollbarWidth: 'thin' }}>
            {/* "All" Option */}
            <div
              role="button"
              tabIndex={0}
              onClick={handleSelectAll}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 text-xs rounded-xl cursor-pointer transition-all select-none ${
                isAllActive
                  ? 'bg-primary-50 text-primary-900 font-bold border border-primary-100'
                  : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className={`w-3.5 h-3.5 ${isAllActive ? 'text-primary-600' : 'text-neutral-400'}`} />
                <span className="truncate">{allSelectedLabel}</span>
              </div>
              {isAllActive && <Check className="w-4 h-4 text-primary-600 shrink-0 stroke-[2.5]" />}
            </div>

            {/* Separator */}
            <div className="h-px bg-neutral-100 my-1" />

            {/* Single Options without any checkboxes */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = safeSelectedValues.length === 1 && safeSelectedValues[0] === option.value;

                return (
                  <div
                    key={option.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectSingleOption(option.value)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 text-xs rounded-xl cursor-pointer transition-all select-none ${
                      isSelected
                        ? 'bg-primary-50 text-primary-900 font-bold border border-primary-100'
                        : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {option.icon && <span className="shrink-0">{option.icon}</span>}
                      <span className="truncate">{option.label}</span>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-primary-600 shrink-0 stroke-[2.5]" />}
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-neutral-400">لا توجد خيارات مطابقة للبحث</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
