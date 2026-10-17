'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Search, Filter, X, RotateCcw, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { MultiSelectDropdown } from './MultiSelectDropdown';

interface GroupFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  availableYears: { label: string; value: string; icon: React.ReactNode }[];
  selectedYears: string[];
  onYearsChange: (value: string[]) => void;
  availableGradeOptions: { label: string; value: string }[];
  selectedGrades: string[];
  onGradesChange: (value: string[]) => void;
  availableTerms: { label: string; value: string; icon: React.ReactNode }[];
  selectedTerms: string[];
  onTermsChange: (value: string[]) => void;
  selectedStages: string[];
  onStagesChange: (value: string[]) => void;
  availableLocations: string[];
  selectedLocations: string[];
  onLocationsChange: (value: string[]) => void;
  filteredCount: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function GroupFilterToolbar({
  searchQuery,
  onSearchChange,
  availableYears,
  selectedYears,
  onYearsChange,
  availableGradeOptions,
  selectedGrades,
  onGradesChange,
  availableTerms,
  selectedTerms,
  onTermsChange,
  selectedStages,
  onStagesChange,
  availableLocations,
  selectedLocations,
  onLocationsChange,
  filteredCount,
  hasActiveFilters,
  onResetFilters,
}: GroupFilterToolbarProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setIsFiltersOpen(false);
      }
    };
    if (isFiltersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFiltersOpen]);

  return (
    <div className="space-y-3">
      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        {/* Search Input */}
        <div className="flex-1 w-full relative">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pr-10 h-11 bg-slate-50 border-transparent hover:bg-slate-100 focus:bg-white transition-colors rounded-xl text-sm"
            placeholder="ابحث عن مجموعة بالاسم أو الصف..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Essential Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="w-36 shrink-0">
            <MultiSelectDropdown
              placeholder="العام الدراسي"
              allSelectedLabel="جميع الأعوام"
              options={availableYears}
              selectedValues={selectedYears}
              onChange={onYearsChange}
            />
          </div>

          <div className="w-44 shrink-0">
            <MultiSelectDropdown
              placeholder="الصف الدراسي"
              allSelectedLabel="جميع الصفوف"
              withSearch={availableGradeOptions.length > 5}
              options={availableGradeOptions}
              selectedValues={selectedGrades}
              onChange={onGradesChange}
            />
          </div>

          {/* Advanced Filters Button */}
          <div className="shrink-0 relative" ref={filtersRef}>
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`h-11 w-11 flex items-center justify-center rounded-xl border transition-all ${
                isFiltersOpen || selectedStages.length > 0 || selectedLocations.length > 0 || selectedTerms.length > 0
                  ? 'bg-primary-50 text-primary-600 border-primary-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'
              }`}
              title="فلاتر متقدمة"
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* Advanced Filters Popover */}
            {isFiltersOpen && (
              <div className="absolute top-full left-0 mt-2 w-[calc(100vw-32px)] sm:w-[320px] bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-[100] space-y-4 origin-top-left rtl:origin-top-right">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-sm">فلاتر إضافية</h3>
                  <button
                    onClick={() => setIsFiltersOpen(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 p-1.5 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <MultiSelectDropdown
                    placeholder="الفصل الدراسي"
                    allSelectedLabel="جميع الفصول الدراسية"
                    options={availableTerms}
                    selectedValues={selectedTerms}
                    onChange={onTermsChange}
                  />

                  <MultiSelectDropdown
                    placeholder="المرحلة التعليمية"
                    allSelectedLabel="جميع المراحل التعليمية"
                    options={[
                      { label: 'المرحلة الابتدائية', value: 'المرحلة الابتدائية' },
                      { label: 'المرحلة الإعدادية', value: 'المرحلة الإعدادية' },
                      { label: 'المرحلة الثانوية', value: 'المرحلة الثانوية' },
                    ]}
                    selectedValues={selectedStages}
                    onChange={onStagesChange}
                  />

                  <MultiSelectDropdown
                    placeholder="المكان / السنتر"
                    allSelectedLabel="جميع الأماكن والسناتر"
                    withSearch={true}
                    options={availableLocations.map((loc) => ({
                      label: loc,
                      value: loc,
                      icon: <MapPin className="w-3.5 h-3.5 text-primary-600" />,
                    }))}
                    selectedValues={selectedLocations}
                    onChange={onLocationsChange}
                  />
                </div>

                {(selectedStages.length > 0 || selectedLocations.length > 0 || selectedTerms.length > 0) && (
                  <button
                    onClick={() => {
                      onStagesChange([]);
                      onLocationsChange([]);
                      onTermsChange([]);
                    }}
                    className="w-full mt-2 text-xs text-primary-600 font-medium py-2 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    مسح الفلاتر الإضافية
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between text-sm px-1">
          <div className="text-slate-500">
            تم العثور على <span className="font-bold text-slate-800">{filteredCount}</span> مجموعة
          </div>
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إعادة تعيين الفلاتر
          </button>
        </div>
      )}
    </div>
  );
}
