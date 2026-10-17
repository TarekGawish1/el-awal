'use client';

import React from 'react';
import {
  Calendar,
  BookOpen,
  Check,
  Plus,
  AlertTriangle,
  Lock,
  ArrowLeftRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AcademicPeriodSelectStepProps {
  canChangePeriod: boolean;
  controlsDisabled: boolean;
  activeYear: string;
  activeTerm: string;
  pendingYear: string;
  pendingTerm: string;
  pendingTermLabel: string;
  allYears: string[];
  isAddingYear: boolean;
  setIsAddingYear: (val: boolean) => void;
  newYearInput: string;
  setNewYearInput: (val: string) => void;
  addYearError: string;
  setAddYearError: (val: string) => void;
  hasChanges: boolean;
  onSelectYear: (year: string) => void;
  onSelectTerm: (term: string) => void;
  onAddNewYear: (e: React.FormEvent) => void;
  onRequestConfirm: () => void;
  onResetPending: () => void;
  onClose: () => void;
}

export function AcademicPeriodSelectStep({
  canChangePeriod,
  controlsDisabled,
  activeYear,
  activeTerm,
  pendingYear,
  pendingTerm,
  pendingTermLabel,
  allYears,
  isAddingYear,
  setIsAddingYear,
  newYearInput,
  setNewYearInput,
  addYearError,
  setAddYearError,
  hasChanges,
  onSelectYear,
  onSelectTerm,
  onAddNewYear,
  onRequestConfirm,
  onResetPending,
  onClose,
}: AcademicPeriodSelectStepProps) {
  return (
    <>
      {/* Prominent Warning Banner for Authorized Users */}
      {canChangePeriod ? (
        <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-2.5 text-amber-900 mb-3.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-snug">
            <span className="font-black text-amber-950 block mb-0.5">
              تنبيه هام لكامل المنصة:
            </span>
            <span className="text-[11px] text-amber-800 font-medium">
              تغيير العام أو الفصل الدراسي سيؤثر على كامل النظام وجميع المعلمين والطلاب في تصفية المجموعات، الحصص المجدولة، الواجبات، والتقارير المالية.
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2.5 text-slate-600 mb-3.5 text-xs">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
          <span>تعديل العام الدراسي متاح فقط للمعلم والمساعد (السكرتارية) المصرح له.</span>
        </div>
      )}

      {/* Academic Year Selection */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary-600" />
            العام الدراسي
          </span>
          {canChangePeriod && !isAddingYear && (
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() => setIsAddingYear(true)}
              className="text-[11px] text-primary-600 hover:text-primary-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
            >
              <Plus className="w-3 h-3" />
              إضافة عام جديد
            </button>
          )}
        </div>

        {/* Inline Add New Year Input */}
        {canChangePeriod && isAddingYear && (
          <form
            onSubmit={onAddNewYear}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 mb-2"
          >
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="مثال: 2027-2028"
                value={newYearInput}
                onChange={(e) => {
                  setNewYearInput(e.target.value);
                  if (addYearError) setAddYearError('');
                }}
                autoFocus
                className="h-8 text-xs bg-white rounded-lg"
              />
              <Button type="submit" size="sm" className="h-8 text-xs px-3 rounded-lg" disabled={controlsDisabled}>
                حفظ
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs px-2 text-slate-400 rounded-lg"
                onClick={() => setIsAddingYear(false)}
              >
                إلغاء
              </Button>
            </div>
            {addYearError && <p className="text-[10px] text-red-500">{addYearError}</p>}
          </form>
        )}

        {/* Year Chips Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {allYears.map((yr) => {
            const isSelected = (canChangePeriod ? pendingYear : activeYear) === yr;
            return (
              <button
                key={yr}
                type="button"
                disabled={controlsDisabled}
                onClick={() => onSelectYear(yr)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  controlsDisabled
                    ? isSelected
                      ? 'bg-slate-200 text-slate-800 border-slate-300 cursor-default'
                      : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm cursor-pointer'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 cursor-pointer'
                }`}
              >
                <span>{yr}</span>
                {isSelected && (
                  <Check className={`w-3.5 h-3.5 ${controlsDisabled ? 'text-slate-700' : 'text-white'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Academic Semester Selection */}
      <div className="space-y-2 mb-4">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
          <BookOpen className="w-3.5 h-3.5 text-primary-600" />
          الفصل الدراسي (الترم)
        </span>

        <div className="flex flex-row gap-2 w-full">
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={() => onSelectTerm('FIRST_TERM')}
            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border ${
              controlsDisabled
                ? (canChangePeriod ? pendingTerm : activeTerm) === 'FIRST_TERM'
                  ? 'bg-slate-200 text-slate-800 border-slate-300 cursor-default'
                  : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                : pendingTerm === 'FIRST_TERM'
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm cursor-pointer'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 cursor-pointer'
            }`}
          >
            <span>الفصل الأول</span>
            <span
              className={`text-[10px] font-medium mt-0.5 ${
                (canChangePeriod ? pendingTerm === 'FIRST_TERM' : activeTerm === 'FIRST_TERM')
                  ? 'text-primary-100'
                  : 'text-slate-500'
              }`}
            >
              ترم أول
            </span>
          </button>

          <button
            type="button"
            disabled={controlsDisabled}
            onClick={() => onSelectTerm('SECOND_TERM')}
            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl text-xs font-bold transition-all border ${
              controlsDisabled
                ? (canChangePeriod ? pendingTerm : activeTerm) === 'SECOND_TERM'
                  ? 'bg-slate-200 text-slate-800 border-slate-300 cursor-default'
                  : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                : pendingTerm === 'SECOND_TERM'
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm cursor-pointer'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 cursor-pointer'
            }`}
          >
            <span>الفصل الثاني</span>
            <span
              className={`text-[10px] font-medium mt-0.5 ${
                (canChangePeriod ? pendingTerm === 'SECOND_TERM' : activeTerm === 'SECOND_TERM')
                  ? 'text-primary-100'
                  : 'text-slate-500'
              }`}
            >
              ترم ثانٍ
            </span>
          </button>
        </div>
      </div>

      {/* Pending Changes Confirmation Preview */}
      {canChangePeriod && hasChanges && (
        <div className="p-3 bg-amber-100/70 border border-amber-300/80 rounded-2xl mb-3 flex items-center justify-between text-xs text-amber-950 font-bold animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              تغيير إلى: <span className="underline">{pendingYear}</span> ({pendingTermLabel})
            </span>
          </div>
          <span className="text-[10px] text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md font-extrabold">
            في انتظار التأكيد
          </span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
        {canChangePeriod && hasChanges ? (
          <>
            <button
              type="button"
              onClick={onResetPending}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold hover:underline cursor-pointer"
            >
              إلغاء التحديد
            </button>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-3 rounded-xl cursor-pointer"
                onClick={onClose}
              >
                تراجع
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs px-4 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={controlsDisabled}
                onClick={onRequestConfirm}
              >
                تأكيد التغيير
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
              <Check className="w-3 h-3" />
              مُفعل على كامل النظام
            </span>
            <Button
              size="sm"
              className="h-7 text-xs px-4 rounded-lg cursor-pointer"
              onClick={onClose}
            >
              إغلاق
            </Button>
          </>
        )}
      </div>
    </>
  );
}
