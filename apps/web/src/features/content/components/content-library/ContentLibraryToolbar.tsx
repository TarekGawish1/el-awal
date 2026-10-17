'use client';

import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ContentType } from '../../types/content.types';

export const TERM_OPTIONS = [
  { value: 'ALL', label: 'جميع الفصول الدراسية' },
  { value: 'FIRST_TERM', label: 'الفصل الدراسي الأول (ترم أول)' },
  { value: 'SECOND_TERM', label: 'الفصل الدراسي الثاني (ترم ثانٍ)' },
];

export const STAGE_OPTIONS = [
  { value: 'ALL', label: 'جميع المراحل الدراسية' },
  { value: 'PRIMARY', label: 'المرحلة الابتدائية' },
  { value: 'PREPARATORY', label: 'المرحلة الإعدادية' },
  { value: 'SECONDARY', label: 'المرحلة الثانوية' },
];

export const CONTENT_TYPE_OPTIONS = [
  { value: 'ALL', label: 'جميع أنواع الملفات' },
  { value: ContentType.FILE, label: 'ملفات عامة وملازم' },
  { value: ContentType.SUMMARY, label: 'ملخصات دراسية' },
  { value: ContentType.REFERENCE, label: 'مراجع وواجبات' },
  { value: ContentType.LECTURE_RECORDING, label: 'تسجيلات الحصص (فيديو)' },
];

interface ContentLibraryToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedYear: string;
  onYearChange: (val: string) => void;
  academicYearOptions: Array<{ value: string; label: string }>;
  selectedTerm: string;
  onTermChange: (val: string) => void;
  selectedStage: string;
  onStageChange: (val: string) => void;
  selectedGrade: string;
  onGradeChange: (val: string) => void;
  gradeOptionsForStage: Array<{ value: string; label: string }>;
  selectedType: string;
  onTypeChange: (val: string) => void;
  isFiltered: boolean;
  onResetFilters: () => void;
}

export function ContentLibraryToolbar({
  searchQuery,
  onSearchChange,
  selectedYear,
  onYearChange,
  academicYearOptions,
  selectedTerm,
  onTermChange,
  selectedStage,
  onStageChange,
  selectedGrade,
  onGradeChange,
  gradeOptionsForStage,
  selectedType,
  onTypeChange,
  isFiltered,
  onResetFilters,
}: ContentLibraryToolbarProps) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-primary-600" />
          <span>تصفية المرفقات والملفات:</span>
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-primary-600 hover:text-primary-800 font-semibold inline-flex items-center gap-1.5 hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين الفلاتر</span>
          </button>
        )}
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-center">
        {/* Search Input */}
        <div className="sm:col-span-2 lg:col-span-4 xl:col-span-2 relative">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            type="search"
            className="pr-9 h-10 bg-slate-50/70 border-slate-200 text-xs sm:text-sm rounded-xl focus:bg-white"
            placeholder="ابحث باسم المرفق أو الدرس..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Academic Year Dropdown */}
        <div>
          <Select
            aria-label="اختيار العام الدراسي"
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            options={academicYearOptions}
            className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
          />
        </div>

        {/* Academic Term Dropdown */}
        <div>
          <Select
            aria-label="اختيار الفصل الدراسي"
            value={selectedTerm}
            onChange={(e) => onTermChange(e.target.value)}
            options={TERM_OPTIONS}
            className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
          />
        </div>

        {/* Academic Stage Dropdown */}
        <div>
          <Select
            aria-label="اختيار المرحلة الدراسية"
            value={selectedStage}
            onChange={(e) => onStageChange(e.target.value)}
            options={STAGE_OPTIONS}
            className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
          />
        </div>

        {/* Grade Level Dropdown */}
        <div>
          <Select
            aria-label="اختيار الصف الدراسي"
            value={selectedGrade}
            onChange={(e) => onGradeChange(e.target.value)}
            options={gradeOptionsForStage}
            className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
          />
        </div>

        {/* Content Type Dropdown */}
        <div>
          <Select
            aria-label="اختيار نوع الملف"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            options={CONTENT_TYPE_OPTIONS}
            className="h-10 text-xs sm:text-sm bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
          />
        </div>
      </div>
    </div>
  );
}
