'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

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

export function MultiSelectDropdown({
  placeholder,
  allSelectedLabel,
  options,
  selectedValues,
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

  const filteredOptions = useMemo(() => {
    if (!withSearch || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, withSearch, searchQuery]);

  const isAllSelected = selectedValues.length === 0 || selectedValues.length === options.length;

  const handleToggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected && selectedValues.length > 0) {
      onChange([]);
    } else if (selectedValues.length === 0) {
      // already all selected (empty array means all)
      onChange(options.map((o) => o.value));
    } else {
      onChange([]);
    }
  };

  // Determine button trigger text
  const triggerText = useMemo(() => {
    if (selectedValues.length === 0 || selectedValues.length === options.length) {
      return allSelectedLabel;
    }
    if (selectedValues.length === 1) {
      const found = options.find((o) => o.value === selectedValues[0]);
      return found ? found.label : selectedValues[0];
    }
    const firstFound = options.find((o) => o.value === selectedValues[0]);
    return `${firstFound ? firstFound.label : selectedValues[0]} (+${selectedValues.length - 1})`;
  }, [selectedValues, options, allSelectedLabel]);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 flex items-center justify-between gap-2 px-3.5 py-2 text-sm bg-white rounded-lg border transition-all cursor-pointer select-none text-right ${
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-xs'
            : selectedValues.length > 0
            ? 'border-primary-300 bg-primary-50/20'
            : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={`truncate text-xs sm:text-sm ${
              selectedValues.length > 0 ? 'font-semibold text-neutral-900' : 'text-neutral-700'
            }`}
          >
            {triggerText}
          </span>
          {selectedValues.length > 0 && selectedValues.length < options.length && (
            <span className="bg-primary-100 text-primary-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
              {selectedValues.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && selectedValues.length < options.length && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-100 transition-colors"
              title="مسح التحديد"
            >
              <X className="w-3.5 h-3.5" />
            </div>
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
        <div className="absolute z-[120] mt-1 w-full min-w-[220px] rounded-xl border border-neutral-200 bg-white shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Optional Search */}
          {withSearch && options.length > 5 && (
            <div className="p-2 border-b border-neutral-100">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في الخيارات..."
                  className="w-full text-xs px-3 py-1.5 pl-8 rounded-md border border-neutral-200 bg-neutral-50/80 text-neutral-800 placeholder-neutral-400 focus:bg-white focus:border-primary-500 focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Select All Option */}
          <div className="p-1 border-b border-neutral-100">
            <label
              onClick={handleSelectAll}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedValues.length === 0 || selectedValues.length === options.length}
                onChange={() => {}}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-neutral-300 cursor-pointer accent-primary-600"
              />
              <span>تحديد الكل</span>
            </label>
          </div>

          {/* Options with Checkboxes */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isChecked = selectedValues.includes(option.value);

                return (
                  <label
                    key={option.value}
                    onClick={() => handleToggleOption(option.value)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-primary-50/80 text-primary-900 font-medium'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-neutral-300 cursor-pointer accent-primary-600"
                      />
                      {option.icon && <span className="shrink-0">{option.icon}</span>}
                      <span className="truncate">{option.label}</span>
                    </div>

                    {isChecked && <Check className="w-3.5 h-3.5 text-primary-600 shrink-0" />}
                  </label>
                );
              })
            ) : (
              <div className="py-3 text-center text-xs text-neutral-400">لا توجد خيارات مطابقة</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
