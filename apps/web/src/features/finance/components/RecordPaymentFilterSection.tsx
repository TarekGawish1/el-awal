'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import { Label } from '@/components/ui/Label';
import { TERM_MONTHS } from './FinanceFiltersBar';

interface RecordPaymentFilterSectionProps {
  selectedStage: string;
  onStageChange: (stage: string) => void;
  selectedGradeLevel: string;
  onGradeChange: (grade: string) => void;
  availableGrades: string[];
  selectedAcademicTerm: 'FIRST_TERM' | 'SECOND_TERM';
  onTermChange: (term: 'FIRST_TERM' | 'SECOND_TERM') => void;
  currentPeriodMonth: number;
  onPeriodMonthChange: (month: number) => void;
  selectedGroupId: string;
  onGroupChange: (groupId: string) => void;
  filteredGroups: Array<{ id: string; name: string; gradeLevel: string }>;
}

export function RecordPaymentFilterSection({
  selectedStage,
  onStageChange,
  selectedGradeLevel,
  onGradeChange,
  availableGrades,
  selectedAcademicTerm,
  onTermChange,
  currentPeriodMonth,
  onPeriodMonthChange,
  selectedGroupId,
  onGroupChange,
  filteredGroups,
}: RecordPaymentFilterSectionProps) {
  return (
    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
        <Filter className="w-3.5 h-3.5 text-primary-600" />
        <span>تحديد وتصفية المجموعة المستهدفة:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <Label className="mb-1 block text-[11px] font-bold text-slate-600">المرحلة الدراسية</Label>
          <select
            className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
            value={selectedStage}
            onChange={(e) => onStageChange(e.target.value)}
          >
            <option value="">جميع المراحل</option>
            <option value="SECONDARY">المرحلة الثانوية</option>
            <option value="PREPARATORY">المرحلة الإعدادية</option>
            <option value="PRIMARY">المرحلة الابتدائية</option>
          </select>
        </div>

        <div>
          <Label className="mb-1 block text-[11px] font-bold text-slate-600">الصف الدراسي</Label>
          <select
            className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
            value={selectedGradeLevel}
            onChange={(e) => onGradeChange(e.target.value)}
          >
            <option value="">جميع الصفوف</option>
            {availableGrades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="mb-1 block text-[11px] font-bold text-slate-600">الفصل والشهر</Label>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              className="w-full h-9 rounded-xl border border-slate-200 px-1.5 text-[11px] font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
              value={selectedAcademicTerm}
              onChange={(e) => onTermChange(e.target.value as 'FIRST_TERM' | 'SECOND_TERM')}
            >
              <option value="FIRST_TERM">ترم أول</option>
              <option value="SECOND_TERM">ترم ثان</option>
            </select>
            <select
              className="w-full h-9 rounded-xl border border-slate-200 px-1.5 text-[11px] font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
              value={currentPeriodMonth}
              onChange={(e) => onPeriodMonthChange(Number(e.target.value))}
            >
              {TERM_MONTHS[selectedAcademicTerm].map((m) => (
                <option key={m} value={m}>
                  شهر {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label className="mb-1 block text-[11px] font-bold text-slate-600">المجموعة الدراسية</Label>
          <select
            className="w-full h-9 rounded-xl border border-slate-200 px-2.5 text-xs font-semibold focus:ring-2 focus:ring-primary/20 bg-white text-slate-800"
            value={selectedGroupId}
            onChange={(e) => onGroupChange(e.target.value)}
          >
            <option value="">-- اختر المجموعة --</option>
            {filteredGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.gradeLevel})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
