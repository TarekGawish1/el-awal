'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, Plus, Check, X, Trash2 } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';

const STORAGE_KEY = 'el_awal_saved_academic_years';
const DEFAULT_YEARS = ['2026-2027', '2027-2028', '2028-2029', '2025-2026'];

interface AcademicYearSelectProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

export function AcademicYearSelect({
  value = '2026-2027',
  onChange,
  disabled = false,
  label = 'العام الدراسي *',
}: AcademicYearSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: groups } = useGroups();

  // Load custom saved years from localStorage
  const [customYears, setCustomYears] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Extract all existing academic years from groups
  const groupYears = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return [];
    const years: string[] = [];
    groups.forEach((g) => {
      if (g.academicYear && g.academicYear.trim()) {
        years.push(g.academicYear.trim());
      }
    });
    return years;
  }, [groups]);

  // Combine and deduplicate
  const allYears = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_YEARS.forEach((y) => set.add(y));
    groupYears.forEach((y) => set.add(y));
    customYears.forEach((y) => set.add(y));
    if (value && value.trim()) {
      set.add(value.trim());
    }
    return Array.from(set);
  }, [groupYears, customYears, value]);

  // Filter based on search query
  const filteredYears = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allYears;
    return allYears.filter((y) => y.toLowerCase().includes(q));
  }, [allYears, searchQuery]);

  const exactMatchExists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allYears.some((y) => y.toLowerCase() === q);
  }, [allYears, searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectYear = (yr: string) => {
    onChange(yr);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleAddNewYear = (newYr: string) => {
    const trimmed = newYr.trim();
    if (!trimmed) return;

    if (!customYears.includes(trimmed)) {
      const updated = [...customYears, trimmed];
      setCustomYears(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save custom academic year:', err);
      }
    }

    onChange(trimmed);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleRemoveCustomYear = (e: React.MouseEvent, yrToRemove: string) => {
    e.stopPropagation();
    const updated = customYears.filter((y) => y !== yrToRemove);
    setCustomYears(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to remove custom academic year:', err);
    }
    if (value === yrToRemove) {
      onChange('2026-2027');
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{label}</label>
      )}

      {/* Trigger */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs bg-white rounded-md border transition-all cursor-pointer select-none ${
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-xs'
            : 'border-neutral-300 hover:border-neutral-400'
        } ${disabled ? 'bg-neutral-100 cursor-not-allowed opacity-60' : ''}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar className={`w-3.5 h-3.5 shrink-0 ${value ? 'text-primary-600' : 'text-neutral-400'}`} />
          <span className="font-semibold text-neutral-800 truncate">{value || 'اختر العام الدراسي'}</span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[110] mt-1 w-full rounded-xl border border-neutral-200 bg-white shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Search/Create Input */}
          <div className="p-2 border-b border-neutral-100">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      handleAddNewYear(searchQuery);
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder="مثال: 2028-2029..."
                className="w-full text-xs px-3 py-1.5 pl-8 rounded-md border border-neutral-200 bg-neutral-50/80 text-neutral-800 placeholder-neutral-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <Calendar className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Creatable Option: when typing a new year */}
          {searchQuery.trim() && !exactMatchExists && (
            <div className="p-1 border-b border-neutral-100">
              <button
                type="button"
                onClick={() => handleAddNewYear(searchQuery)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg text-primary-700 bg-primary-50/80 hover:bg-primary-100 font-bold transition-colors text-right"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Plus className="w-3.5 h-3.5 shrink-0 text-primary-600" />
                  <span className="truncate">إضافة عام جديد: &quot;{searchQuery.trim()}&quot;</span>
                </div>
                <span className="text-[10px] bg-primary-200/80 text-primary-800 px-1.5 py-0.5 rounded font-mono shrink-0">
                  Enter ↵
                </span>
              </button>
            </div>
          )}

          {/* Years List */}
          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
            {filteredYears.length > 0 ? (
              filteredYears.map((yr) => {
                const isSelected = value === yr;
                const isCustom = customYears.includes(yr);

                return (
                  <div
                    key={yr}
                    onClick={() => handleSelectYear(yr)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary-50 text-primary-800 font-bold'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary-600' : 'text-neutral-400'}`} />
                      <span className="truncate">{yr}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary-600" />}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveCustomYear(e, yr)}
                          className="p-1 text-neutral-300 hover:text-red-500 rounded hover:bg-neutral-100 transition-colors"
                          title="حذف من الأعوام المحفوظة"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-neutral-400">
                لا توجد أعوام مطابقة
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
