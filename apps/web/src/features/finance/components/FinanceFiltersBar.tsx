'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { GRADE_LEVELS_BY_STAGE, inferStageFromGrade } from '@/lib/constants/grades';

export { GRADE_LEVELS_BY_STAGE };

export const TERM_MONTHS: Record<'FIRST_TERM' | 'SECOND_TERM', number[]> = {
  FIRST_TERM: [8, 9, 10, 11, 12, 1],
  SECOND_TERM: [2, 3, 4, 5, 6, 7],
};

interface FinanceFiltersBarProps {
  groups: any[];
  stage: string;
  gradeLevel: string;
  groupId: string;
  academicYear: string;
  academicTerm: 'FIRST_TERM' | 'SECOND_TERM';
  search: string;
  periodMonth?: number;
  onStageChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onGroupChange: (value: string) => void;
  onTermChange: (value: 'FIRST_TERM' | 'SECOND_TERM') => void;
  onSearchChange: (value: string) => void;
  onMonthChange?: (value: number) => void;
}

function inferStage(gradeLevel?: string) {
  return inferStageFromGrade(gradeLevel);
}

export function FinanceFiltersBar({
  groups,
  stage,
  gradeLevel,
  groupId,
  academicYear,
  academicTerm,
  search,
  periodMonth,
  onStageChange,
  onGradeChange,
  onGroupChange,
  onTermChange,
  onSearchChange,
  onMonthChange,
}: FinanceFiltersBarProps) {
  const groupGrades = groups.map((group) => group.gradeLevel).filter(Boolean);
  const stageGrades = GRADE_LEVELS_BY_STAGE[stage] || [];
  const grades = Array.from(new Set([...stageGrades, ...groupGrades.filter((grade) => !stage || inferStage(grade) === stage)]));
  const availableGroups = groups.filter((group) => {
    if (gradeLevel && group.gradeLevel !== gradeLevel) return false;
    if (stage !== 'ALL' && stage && inferStage(group.gradeLevel) !== stage) return false;
    return true;
  });

  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <label className="text-xs font-bold text-slate-700">
        المرحلة الدراسية
        <select aria-label="المرحلة الدراسية" value={stage} onChange={(event) => onStageChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="">اختر المرحلة</option>
          <option value="SECONDARY">الثانوية</option>
          <option value="PREPARATORY">الإعدادية</option>
          <option value="PRIMARY">الابتدائية</option>
        </select>
      </label>

      <label className="text-xs font-bold text-slate-700">
        الصف الدراسي
        <select aria-label="الصف الدراسي" value={gradeLevel} disabled={!stage} onChange={(event) => onGradeChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400">
          <option value="">اختر الصف</option>
          {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
        </select>
      </label>

      <label className="text-xs font-bold text-slate-700">
        الفترة الدراسية
        <select aria-label="الفترة الدراسية" value={academicTerm} onChange={(event) => onTermChange(event.target.value as 'FIRST_TERM' | 'SECOND_TERM')} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="FIRST_TERM">{academicYear} - ترم أول</option>
          <option value="SECOND_TERM">{academicYear} - ترم ثان</option>
        </select>
      </label>

      <label className="text-xs font-bold text-slate-700">
        المجموعة الدراسية
        <select aria-label="المجموعة الدراسية" value={groupId} onChange={(event) => onGroupChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="">جميع المجموعات</option>
          {availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </label>

      {onMonthChange && (
        <label className="text-xs font-bold text-slate-700">
          الشهر
          <select aria-label="الشهر" value={periodMonth} onChange={(event) => onMonthChange(Number(event.target.value))} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
            {TERM_MONTHS[academicTerm].map((month) => <option key={month} value={month}>{month} ({['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][month - 1]})</option>)}
          </select>
        </label>
      )}

      <label className="text-xs font-bold text-slate-700 sm:col-span-2">
        بحث سريع
        <div className="relative mt-1.5">
          <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
          <Input aria-label="بحث سريع" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="اسم الطالب أو STU-..." className="pr-9" />
        </div>
      </label>
    </div>
  );
}
