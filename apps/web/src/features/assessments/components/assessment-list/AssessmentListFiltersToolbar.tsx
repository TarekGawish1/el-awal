'use client';

import React from 'react';
import { Search, Calendar, BookOpen, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface AssessmentListFiltersToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  filterType: 'ALL' | 'EXAM' | 'ASSIGNMENT';
  onFilterTypeChange: (type: 'ALL' | 'EXAM' | 'ASSIGNMENT') => void;
  filterSource: 'ALL' | 'GROUP' | 'ONLINE';
  onFilterSourceChange: (source: 'ALL' | 'GROUP' | 'ONLINE') => void;
  filterCourseId: string;
  onFilterCourseIdChange: (courseId: string) => void;
  availableCourses: Array<{ id: string; title: string }>;
  filterYear: string;
  onYearChange: (val: string) => void;
  availableYears: string[];
  filterTerm: string;
  onTermChange: (val: string) => void;
  availableTerms: Array<{ label: string; value: string }>;
  filterStage: string;
  onStageChange: (val: string) => void;
  availableStages: string[];
  filterGrade: string;
  onGradeChange: (val: string) => void;
  availableGrades: string[];
  hasNonDefaultFilters: boolean;
  onResetFilters: () => void;
}

export function AssessmentListFiltersToolbar({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterSource,
  onFilterSourceChange,
  filterCourseId,
  onFilterCourseIdChange,
  availableCourses,
  filterYear,
  onYearChange,
  availableYears,
  filterTerm,
  onTermChange,
  availableTerms,
  filterStage,
  onStageChange,
  availableStages,
  filterGrade,
  onGradeChange,
  availableGrades,
  hasNonDefaultFilters,
  onResetFilters,
}: AssessmentListFiltersToolbarProps) {
  const formatStageName = (stage: string) => {
    switch (stage) {
      case 'PRIMARY': return 'ابتدائي';
      case 'MIDDLE': return 'إعدادي';
      case 'SECONDARY': return 'ثانوي';
      default: return stage;
    }
  };

  const formatTermLabel = (term: string) => {
    switch (term) {
      case 'FIRST_TERM': return 'ترم أول';
      case 'SECOND_TERM': return 'ترم ثانٍ';
      default: return term;
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
      {/* Top Row: Search & Type Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pr-10 w-full bg-slate-50/60 border-slate-200"
            placeholder="ابحث عن اختبار أو واجب..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Type Toggle Tabs */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-full md:w-auto shadow-xs border border-slate-200/50">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'EXAM', label: 'الامتحانات' },
            { id: 'ASSIGNMENT', label: 'الواجبات' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterTypeChange(tab.id as 'ALL' | 'EXAM' | 'ASSIGNMENT')}
              className={`flex-1 md:flex-initial py-1.5 px-5 rounded-lg font-bold text-xs transition-all ${
                filterType === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source Filter Row: Groups vs Online Courses */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-500 shrink-0">مصدر التقييم:</span>
        <div className="bg-slate-100 p-0.5 rounded-xl flex gap-1 shadow-xs border border-slate-200/50 shrink-0">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'GROUP', label: 'المجموعات الدراسية' },
            { id: 'ONLINE', label: 'الكورسات أونلاين' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterSourceChange(tab.id as 'ALL' | 'GROUP' | 'ONLINE')}
              className={`h-8 px-3.5 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                filterSource === tab.id
                  ? tab.id === 'ONLINE'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Course dropdown — visible only when filtering by online courses */}
        {filterSource === 'ONLINE' && availableCourses.length > 0 && (
          <div className="w-48 sm:w-52 shrink-0">
            <Select
              containerClassName="w-full"
              className="h-8 py-0 px-3 bg-white border-indigo-200 text-xs font-medium rounded-lg text-slate-700 shadow-2xs"
              value={filterCourseId}
              onChange={(e) => onFilterCourseIdChange(e.target.value)}
              options={[
                { label: 'جميع الكورسات', value: 'ALL' },
                ...availableCourses.map(({ id, title }) => ({ label: title, value: id })),
              ]}
            />
          </div>
        )}
      </div>

      {/* Second Row: Academic Year, Term, Stage, Grade selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
        <div>
          <Select
            className="w-full bg-slate-50 border-slate-200 text-xs sm:text-sm"
            value={filterYear}
            onChange={(e) => onYearChange(e.target.value)}
            options={[
              { label: 'جميع الأعوام الدراسية', value: 'ALL' },
              ...availableYears.map((year) => ({
                label: `العام الدراسي: ${year}`,
                value: year,
              })),
            ]}
          />
        </div>

        <div>
          <Select
            className="w-full bg-slate-50 border-slate-200 text-xs sm:text-sm"
            value={filterTerm}
            onChange={(e) => onTermChange(e.target.value)}
            options={[
              { label: 'جميع الفصول الدراسية', value: 'ALL' },
              ...availableTerms.map((term) => ({
                label: term.label,
                value: term.value,
              })),
            ]}
          />
        </div>

        <div>
          <Select
            className="w-full bg-slate-50 border-slate-200 text-xs sm:text-sm"
            value={filterStage}
            onChange={(e) => onStageChange(e.target.value)}
            options={[
              { label: 'كل المراحل', value: 'ALL' },
              ...availableStages.map((stage) => ({
                label: formatStageName(stage),
                value: stage,
              })),
            ]}
          />
        </div>

        <div>
          <Select
            className="w-full bg-slate-50 border-slate-200 text-xs sm:text-sm"
            value={filterGrade}
            onChange={(e) => onGradeChange(e.target.value)}
            options={[
              { label: 'كل الصفوف', value: 'ALL' },
              ...availableGrades.map((grade) => ({
                label: grade,
                value: grade,
              })),
            ]}
          />
        </div>
      </div>

      {/* Active Period & Filter Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-700">الفترة النشطة:</span>
          {filterYear !== 'ALL' ? (
            <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded-md font-medium">
              <Calendar className="w-3 h-3 text-primary-500" />
              {filterYear}
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
              جميع الأعوام
            </span>
          )}
          {filterTerm !== 'ALL' ? (
            <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded-md font-medium">
              <BookOpen className="w-3 h-3 text-primary-500" />
              {formatTermLabel(filterTerm)}
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
              جميع الفصول
            </span>
          )}

          {filterStage !== 'ALL' && (
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              {formatStageName(filterStage)}
            </span>
          )}
          {filterGrade !== 'ALL' && (
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              {filterGrade}
            </span>
          )}
          {filterSource === 'ONLINE' && (
            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-medium">
              كورسات أونلاين
              {filterCourseId !== 'ALL' && (
                <span className="font-bold">: {availableCourses.find((c) => c.id === filterCourseId)?.title}</span>
              )}
            </span>
          )}
          {filterSource === 'GROUP' && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-medium">
              مجموعات دراسية
            </span>
          )}
        </div>

        {hasNonDefaultFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            إعادة تعيين الفلاتر
          </button>
        )}
      </div>
    </div>
  );
}
