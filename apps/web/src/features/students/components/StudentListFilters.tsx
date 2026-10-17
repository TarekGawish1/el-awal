'use client';

import React from 'react';
import { Input } from '@/components/ui/Input';
import { MultiSelectDropdown } from '@/features/groups/components/MultiSelectDropdown';
import { Search, RotateCcw, Filter, X } from 'lucide-react';

interface StudentListFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  setCurrentPage: (page: number) => void;
  availableYears: Array<{ label: string; value: string; icon?: React.ReactNode }>;
  selectedYears: string[];
  setSelectedYears: (years: string[]) => void;
  availableTerms: Array<{ label: string; value: string; icon?: React.ReactNode }>;
  selectedTerms: string[];
  setSelectedTerms: (terms: string[]) => void;
  isFiltersOpen: boolean;
  setIsFiltersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filtersRef: React.RefObject<HTMLDivElement | null>;
  selectedStages: string[];
  handleStagesChange: (stages: string[]) => void;
  availableGradeOptions: Array<{ label: string; value: string }>;
  selectedGrades: string[];
  handleGradesChange: (grades: string[]) => void;
  availableGroupOptions: Array<{ label: string; value: string; icon?: React.ReactNode }>;
  selectedGroups: string[];
  setSelectedGroups: (groups: string[]) => void;
  hasActiveFilters: boolean;
  totalStudents?: number;
  filteredCount: number;
  resetFilters: () => void;
}

export function StudentListFilters({
  searchTerm,
  setSearchTerm,
  setCurrentPage,
  availableYears,
  selectedYears,
  setSelectedYears,
  availableTerms,
  selectedTerms,
  setSelectedTerms,
  isFiltersOpen,
  setIsFiltersOpen,
  filtersRef,
  selectedStages,
  handleStagesChange,
  availableGradeOptions,
  selectedGrades,
  handleGradesChange,
  availableGroupOptions,
  selectedGroups,
  setSelectedGroups,
  hasActiveFilters,
  totalStudents,
  filteredCount,
  resetFilters,
}: StudentListFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            type="search"
            className="pr-10 h-10 text-xs sm:text-sm bg-slate-50/50 border border-slate-200 focus:border-primary-500 rounded-lg transition-all"
            placeholder="ابحث بالاسم، رقم الهاتف أو الكود..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Academic Year */}
        <div className="md:col-span-3">
          <MultiSelectDropdown
            placeholder="العام الدراسي"
            allSelectedLabel="جميع الأعوام الدراسية"
            options={availableYears}
            selectedValues={selectedYears}
            onChange={(vals) => {
              setSelectedYears(vals);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Academic Term */}
        <div className="md:col-span-3">
          <MultiSelectDropdown
            placeholder="الفصل الدراسي"
            allSelectedLabel="جميع الفصول الدراسية"
            options={availableTerms}
            selectedValues={selectedTerms}
            onChange={(vals) => {
              setSelectedTerms(vals);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Advanced Filters Button */}
        <div className="md:col-span-1 relative" ref={filtersRef}>
          <button
            onClick={() => setIsFiltersOpen((prev) => !prev)}
            className={`w-full h-10 flex items-center justify-center gap-2 rounded-lg border transition-all ${
              isFiltersOpen
                ? 'bg-primary-50 text-primary-600 border-primary-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="فلاتر متقدمة"
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* Advanced Filters Popover */}
          {isFiltersOpen && (
            <div className="absolute top-full left-0 mt-2 w-[calc(100vw-32px)] sm:w-[320px] bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-[100] space-y-4 origin-top-left rtl:origin-top-right">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 text-sm">فلاتر متقدمة</h3>
                <button
                  onClick={() => setIsFiltersOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 p-1.5 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <MultiSelectDropdown
                  placeholder="المرحلة التعليمية"
                  allSelectedLabel="جميع المراحل التعليمية"
                  options={[
                    { label: 'المرحلة الابتدائية', value: 'المرحلة الابتدائية' },
                    { label: 'المرحلة الإعدادية', value: 'المرحلة الإعدادية' },
                    { label: 'المرحلة الثانوية', value: 'المرحلة الثانوية' },
                  ]}
                  selectedValues={selectedStages}
                  onChange={(vals) => {
                    handleStagesChange(vals);
                    setCurrentPage(1);
                  }}
                />

                <MultiSelectDropdown
                  placeholder="الصف الدراسي"
                  allSelectedLabel="جميع الصفوف الدراسية"
                  withSearch={availableGradeOptions.length > 5}
                  options={availableGradeOptions}
                  selectedValues={selectedGrades}
                  onChange={(vals) => {
                    handleGradesChange(vals);
                    setCurrentPage(1);
                  }}
                />

                <MultiSelectDropdown
                  placeholder="المجموعة الدراسية"
                  allSelectedLabel="جميع المجموعات"
                  withSearch={true}
                  options={availableGroupOptions}
                  selectedValues={selectedGroups}
                  onChange={(vals) => {
                    setSelectedGroups(vals);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Summary & Reset */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-xs">
          <div className="text-slate-500">
            تم العثور على{' '}
            <span className="font-bold text-primary-600">
              {totalStudents ?? filteredCount}
            </span>{' '}
            طالب
          </div>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-primary-600 transition-colors font-medium cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            إعادة تعيين الفلاتر
          </button>
        </div>
      )}
    </div>
  );
}
