'use client';

import React from 'react';
import { Filter, Calendar, Users, RotateCcw } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { DashboardFilterState, DateRangePreset, GroupOption } from '../types/dashboard.types';

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
  const dateRangeOptions: { label: string; value: DateRangePreset }[] = [
    { label: 'اليوم', value: 'today' },
    { label: 'هذا الأسبوع', value: 'week' },
    { label: 'هذا الشهر', value: 'month' },
    { label: 'نطاق مخصص', value: 'custom' },
  ];

  const groupSelectOptions = [
    { label: 'جميع المجموعات الدراسية', value: 'ALL' },
    ...groups.map((g) => ({
      label: `${g.name} (${g.gradeLevel})`,
      value: g.id,
    })),
  ];

  const academicYearOptions = [
    { label: 'العام الدراسي 2026-2027', value: '2026-2027' },
    { label: 'العام الدراسي 2025-2026', value: '2025-2026' },
  ];

  return (
    <div className="bg-white border border-neutral-200/90 rounded-lg p-3.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 pe-2 border-e border-neutral-200 hidden sm:flex">
          <Filter className="w-4 h-4 text-primary-600" />
          <span>تصفية المؤشرات:</span>
        </div>

        {/* Academic Year */}
        <div className="w-full sm:w-48">
          <Select
            aria-label="اختيار العام الدراسي"
            value={filters.academicYear}
            onChange={(e) => onFilterChange({ academicYear: e.target.value })}
            options={academicYearOptions}
          />
        </div>

        {/* Group Selector */}
        <div className="w-full sm:w-64">
          <Select
            aria-label="اختيار المجموعة الدراسية"
            value={filters.groupId}
            disabled={isGroupsLoading}
            onChange={(e) => onFilterChange({ groupId: e.target.value })}
            options={groupSelectOptions}
          />
        </div>

        {/* Time Range Preset Buttons */}
        <div className="flex items-center bg-neutral-100 p-0.5 rounded-md border border-neutral-200/70 w-full sm:w-auto">
          {dateRangeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onFilterChange({ dateRange: opt.value })}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-medium rounded transition-all select-none ${
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
          className="text-xs text-neutral-500 hover:text-neutral-800 gap-1.5 self-end lg:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>إعادة تعيين</span>
        </Button>
      )}
    </div>
  );
}
