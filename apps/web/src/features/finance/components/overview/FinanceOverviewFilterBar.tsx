import React from 'react';
import { TERM_MONTHS, MONTH_NAMES } from './FinanceMetricCard';

interface FinanceOverviewFilterBarProps {
  academicYear: string;
  academicTerm: 'FIRST_TERM' | 'SECOND_TERM';
  periodMonth?: number;
  onTermChange: (term: 'FIRST_TERM' | 'SECOND_TERM') => void;
  onMonthChange: (month: number) => void;
  selectedStage: string;
  onStageChange: (stage: string) => void;
  selectedGrade: string;
  onGradeChange: (grade: string) => void;
  availableGrades: string[];
  selectedGroupId: string;
  onGroupIdChange: (groupId: string) => void;
  groupsList: Array<{ id: string; name: string }>;
}

export function FinanceOverviewFilterBar({
  academicYear,
  academicTerm,
  periodMonth,
  onTermChange,
  onMonthChange,
  selectedStage,
  onStageChange,
  selectedGrade,
  onGradeChange,
  availableGrades,
  selectedGroupId,
  onGroupIdChange,
  groupsList,
}: FinanceOverviewFilterBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Term Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">الفترة الدراسية</label>
          <select
            aria-label="الفترة الدراسية"
            value={academicTerm}
            onChange={(e) => onTermChange(e.target.value as 'FIRST_TERM' | 'SECOND_TERM')}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none"
          >
            <option value="FIRST_TERM">{academicYear} - ترم أول</option>
            <option value="SECOND_TERM">{academicYear} - ترم ثان</option>
          </select>
        </div>

        {/* Month Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">الشهر</label>
          <select
            aria-label="الشهر"
            value={periodMonth ?? ''}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none"
          >
            <option value="">الترم كاملاً</option>
            {(TERM_MONTHS[academicTerm] || []).map((m) => (
              <option key={m} value={m}>
                شهر {m} ({MONTH_NAMES[m - 1]})
              </option>
            ))}
          </select>
        </div>

        {/* Stage Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">المرحلة الدراسية</label>
          <select
            aria-label="المرحلة الدراسية"
            value={selectedStage}
            onChange={(e) => onStageChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none"
          >
            <option value="">جميع المراحل</option>
            <option value="SECONDARY">المرحلة الثانوية</option>
            <option value="PREPARATORY">المرحلة الإعدادية</option>
            <option value="PRIMARY">المرحلة الابتدائية</option>
          </select>
        </div>

        {/* Grade Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">الصف الدراسي</label>
          <select
            aria-label="الصف الدراسي"
            value={selectedGrade}
            onChange={(e) => onGradeChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none"
          >
            <option value="">جميع الصفوف</option>
            {availableGrades.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>

        {/* Group Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">المجموعة الدراسية</label>
          <select
            aria-label="المجموعة الدراسية"
            value={selectedGroupId}
            onChange={(e) => onGroupIdChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium focus:border-indigo-500 focus:outline-none"
          >
            <option value="">جميع المجموعات</option>
            {groupsList.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
