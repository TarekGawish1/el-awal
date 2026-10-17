'use client';

import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/Label';

export interface SessionGroupCascadePickerProps {
  stage: string;
  gradeLevel: string;
  isPending: boolean;
  isLoadingGroups: boolean;
  gradeOptions: string[];
  groups: any[];
  filteredGroups: any[];
  onStageChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
}

export function SessionGroupCascadePicker({
  stage,
  gradeLevel,
  isPending,
  isLoadingGroups,
  gradeOptions,
  groups,
  filteredGroups,
  onStageChange,
  onGradeChange,
  register,
  errors,
}: SessionGroupCascadePickerProps) {
  return (
    <div className="space-y-3">
      {/* Stage & Grade Cascade Filters */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block text-xs font-bold text-slate-700">
            المرحلة الدراسية <span className="text-red-500">*</span>
          </Label>
          <select
            aria-label="المرحلة الدراسية"
            value={stage}
            disabled={isPending || isLoadingGroups}
            onChange={(event) => onStageChange(event.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
          >
            <option value="">اختر المرحلة</option>
            <option value="SECONDARY">الثانوية</option>
            <option value="PREPARATORY">الإعدادية</option>
            <option value="PRIMARY">الابتدائية</option>
          </select>
        </div>
        <div>
          <Label className="mb-1 block text-xs font-bold text-slate-700">
            الصف الدراسي <span className="text-red-500">*</span>
          </Label>
          <select
            aria-label="الصف الدراسي"
            value={gradeLevel}
            disabled={isPending || isLoadingGroups || !stage}
            onChange={(event) => onGradeChange(event.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">اختر الصف</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Group Select */}
      <div>
        <Label htmlFor="groupId" className="mb-1 block text-xs font-bold text-slate-700">
          المجموعة الدراسية <span className="text-red-500">*</span>
        </Label>
        <select
          id="groupId"
          aria-label="المجموعة الدراسية"
          {...register('groupId')}
          disabled={isPending || isLoadingGroups || !stage || !gradeLevel}
          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">-- اختر المجموعة --</option>
          {(filteredGroups.length > 0 ? filteredGroups : groups).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.gradeLevel})
            </option>
          ))}
        </select>
        {errors.groupId && (
          <p className="text-red-500 text-xs mt-1 font-medium">{errors.groupId.message as string}</p>
        )}
      </div>
    </div>
  );
}
