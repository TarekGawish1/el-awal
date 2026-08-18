'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Filter, Calendar, Users, RotateCcw, BookOpen, Plus, X } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DashboardFilterState, DateRangePreset, GroupOption } from '../types/dashboard.types';

const STORAGE_KEY = 'el_awal_saved_academic_years';
const DEFAULT_YEARS = ['2026-2027', '2025-2026', '2024-2025', '2027-2028', '2023-2024'];

export interface DashboardFiltersProps {
  filters: DashboardFilterState;
  groups: GroupOption[];
  isGroupsLoading: boolean;
  onFilterChange: (updated: Partial<DashboardFilterState>) => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export function DashboardFilters({
  filters,
  groups,
  isGroupsLoading,
  onFilterChange,
  onResetFilters,
  isFiltered,
}: DashboardFiltersProps) {
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [addYearError, setAddYearError] = useState('');

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

  const dateRangeOptions: { label: string; value: DateRangePreset }[] = [
    { label: 'اليوم', value: 'today' },
    { label: 'هذا الأسبوع', value: 'week' },
    { label: 'هذا الشهر', value: 'month' },
    { label: 'نطاق مخصص', value: 'custom' },
  ];

  // Dynamic Academic Years list
  const academicYearOptions = useMemo(() => {
    const yearsSet = new Set<string>();
    DEFAULT_YEARS.forEach((y) => yearsSet.add(y));
    customYears.forEach((y) => yearsSet.add(y));
    if (filters.academicYear && filters.academicYear !== 'ALL') {
      yearsSet.add(filters.academicYear);
    }
    groups.forEach((g) => {
      if (g.academicYear && g.academicYear.trim()) {
        yearsSet.add(g.academicYear.trim());
      }
    });

    const sortedYears = Array.from(yearsSet).sort().reverse();

    return [
      { label: 'جميع الأعوام الدراسية', value: 'ALL' },
      ...sortedYears.map((yr) => ({
        label: `العام الدراسي ${yr}`,
        value: yr,
      })),
      { label: '+ إضافة عام دراسي جديد...', value: '__ADD_NEW__' },
    ];
  }, [customYears, filters.academicYear, groups]);

  // Academic Term / Semester options
  const academicTermOptions = [
    { label: 'جميع الفصول الدراسية', value: 'ALL' },
    { label: 'الفصل الدراسي الأول (ترم أول)', value: 'FIRST_TERM' },
    { label: 'الفصل الدراسي الثاني (ترم ثانٍ)', value: 'SECOND_TERM' },
  ];

  // Filter group dropdown options by chosen year and semester
  const groupSelectOptions = useMemo(() => {
    const filteredGroups = groups.filter((g) => {
      const matchYear =
        !filters.academicYear ||
        filters.academicYear === 'ALL' ||
        !g.academicYear ||
        g.academicYear === filters.academicYear;

      const matchTerm =
        !filters.academicTerm ||
        filters.academicTerm === 'ALL' ||
        !g.academicTerm ||
        g.academicTerm === filters.academicTerm;

      return matchYear && matchTerm;
    });

    return [
      { label: 'جميع المجموعات الدراسية', value: 'ALL' },
      ...filteredGroups.map((g) => ({
        label: `${g.name} (${g.gradeLevel})`,
        value: g.id,
      })),
    ];
  }, [groups, filters.academicYear, filters.academicTerm]);

  const handleYearChange = (selectedVal: string) => {
    if (selectedVal === '__ADD_NEW__') {
      setNewYearInput('');
      setAddYearError('');
      setIsAddYearModalOpen(true);
      return;
    }
    onFilterChange({ academicYear: selectedVal });
  };

  const handleAddNewYearSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newYearInput.trim();
    if (!trimmed) {
      setAddYearError('يرجى إدخال صيغة العام الدراسي (مثال: 2027-2028)');
      return;
    }

    if (!customYears.includes(trimmed)) {
      const updated = [...customYears, trimmed];
      setCustomYears(updated);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save academic year locally:', err);
        }
      }
    }

    onFilterChange({ academicYear: trimmed });
    setIsAddYearModalOpen(false);
  };

  return (
    <>
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 pe-2 border-e border-neutral-200 hidden sm:flex">
            <Filter className="w-4 h-4 text-primary-600" />
            <span>تصفية المؤشرات:</span>
          </div>

          {/* Academic Year Selector */}
          <div className="w-full sm:w-48">
            <Select
              aria-label="اختيار العام الدراسي"
              value={filters.academicYear || 'ALL'}
              onChange={(e) => handleYearChange(e.target.value)}
              options={academicYearOptions}
            />
          </div>

          {/* Academic Term / Semester Selector */}
          <div className="w-full sm:w-48">
            <Select
              aria-label="اختيار الفصل الدراسي"
              value={filters.academicTerm || 'ALL'}
              onChange={(e) => onFilterChange({ academicTerm: e.target.value })}
              options={academicTermOptions}
            />
          </div>

          {/* Group Selector */}
          <div className="w-full sm:w-60">
            <Select
              aria-label="اختيار المجموعة الدراسية"
              value={filters.groupId}
              disabled={isGroupsLoading}
              onChange={(e) => onFilterChange({ groupId: e.target.value })}
              options={groupSelectOptions}
            />
          </div>

          {/* Time Range Preset Buttons */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/70 w-full sm:w-auto">
            {dateRangeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onFilterChange({ dateRange: opt.value })}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-medium rounded-lg transition-all select-none ${
                  filters.dateRange === opt.value
                    ? 'bg-white text-primary-700 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="text-xs text-neutral-500 hover:text-neutral-800 gap-1.5 self-end xl:self-auto rounded-xl"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين</span>
          </Button>
        )}
      </div>

      {/* Add New Academic Year Modal */}
      {isAddYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsAddYearModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">إضافة عام دراسي جديد</h3>
                <p className="text-xs text-slate-500">أدخل العام الدراسي الجديد ليتم اعتماده في النظام</p>
              </div>
            </div>

            <form onSubmit={handleAddNewYearSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  صيغة العام الدراسي <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="مثال: 2027-2028 أو 2028-2029"
                  value={newYearInput}
                  onChange={(e) => {
                    setNewYearInput(e.target.value);
                    if (addYearError) setAddYearError('');
                  }}
                  autoFocus
                  className="h-11 rounded-xl text-sm"
                />
                {addYearError && <p className="text-xs text-red-500 mt-1.5">{addYearError}</p>}
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setIsAddYearModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit" className="flex-1 rounded-xl bg-primary-600 hover:bg-primary-700">
                  <Plus className="w-4 h-4 ml-1.5" />
                  إضافة وتحديد
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
