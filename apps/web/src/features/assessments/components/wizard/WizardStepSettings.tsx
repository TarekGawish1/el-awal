'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, AlertTriangle, X } from 'lucide-react';
import { CreateAssessmentFormData } from '../../types/assessments.schema';
import { Group } from '../../../groups/types/groups.types';
import { WizardScheduleSection } from './WizardScheduleSection';
import toast from 'react-hot-toast';

function showLogicalConflictToast(message: string) {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-in fade-in zoom-in-95' : 'animate-out fade-out'
        } max-w-md w-full bg-rose-900 text-white shadow-2xl rounded-2xl pointer-events-auto flex items-start justify-between gap-3 p-4 border border-rose-700/80`}
        dir="rtl"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
          <div className="flex-1 text-right">
            <p className="text-xs font-bold text-rose-100">تعارض في إعدادات التقييم</p>
            <p className="text-xs text-rose-200 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="mr-1 text-rose-300 hover:text-white p-1 rounded-lg hover:bg-rose-800/60 transition-colors shrink-0 cursor-pointer"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ),
    { duration: 8000 }
  );
}

export interface WizardStepSettingsProps {
  methods: UseFormReturn<CreateAssessmentFormData>;
  type: 'EXAM' | 'ASSIGNMENT';
  targetScope: 'GROUPS' | 'COURSE';
  dueDateOption: 'NEXT_SESSION' | 'CUSTOM' | 'NO_DEADLINE';
  setDueDateOption: (opt: 'NEXT_SESSION' | 'CUSTOM' | 'NO_DEADLINE') => void;
  scheduleMode: 'FIXED_SESSION' | 'FLEXIBLE_WINDOW' | 'DURATION_ONLY';
  selectScheduleMode: (mode: 'FIXED_SESSION' | 'FLEXIBLE_WINDOW' | 'DURATION_ONLY') => void;
  handleStartChange: (iso: string) => void;
  handleEndChange: (iso: string) => void;
  syncCloseFromDuration: (rawMinutes: string) => void;
  nowIso: string;
  allGroups?: Group[];
  onNext: () => void;
}

export function WizardStepSettings({
  methods,
  type,
  targetScope,
  dueDateOption,
  setDueDateOption,
  scheduleMode,
  selectScheduleMode,
  handleStartChange,
  handleEndChange,
  syncCloseFromDuration,
  nowIso,
  allGroups,
  onNext,
}: WizardStepSettingsProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = methods;

  const formDataValues = watch();

  return (
    <div className="space-y-6 pt-4 border-t border-slate-100">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">
            الدرجة الكلية <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            {...register('totalScore')}
            className={errors.totalScore ? 'border-red-500' : ''}
          />
          {errors.totalScore && (
            <p className="text-red-500 text-sm mt-1">{errors.totalScore.message}</p>
          )}
        </div>
        <div>
          <Label className="mb-2 block">
            درجة النجاح <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            {...register('passingScore')}
            className={errors.passingScore ? 'border-red-500' : ''}
          />
          {errors.passingScore && (
            <p className="text-red-500 text-sm mt-1">{errors.passingScore.message}</p>
          )}
        </div>
      </div>

      <WizardScheduleSection
        methods={methods}
        type={type}
        targetScope={targetScope}
        dueDateOption={dueDateOption}
        setDueDateOption={setDueDateOption}
        scheduleMode={scheduleMode}
        selectScheduleMode={selectScheduleMode}
        handleStartChange={handleStartChange}
        handleEndChange={handleEndChange}
        syncCloseFromDuration={syncCloseFromDuration}
        nowIso={nowIso}
        allGroups={allGroups}
      />

      {/* Passing Requirement for Progression */}
      <div className="mt-6 p-4.5 rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50/70 via-indigo-50/40 to-white shadow-2xs space-y-2.5">
        <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="text-base">🎯</span>
          <span>اشتراط اجتياز ودرجة النجاح للتقدم في الكورس</span>
          <span className="text-xs text-primary-700 font-normal">
            (للدروس والوحدات وإتمام الدورة)
          </span>
        </label>
        <p className="text-xs text-slate-600 leading-relaxed">
          عند تفعيل هذا الخيار، لن يتمكن الطالب من فتح الدرس أو الوحدة التالية أو إنهاء الكورس حتى يحقق درجة النجاح المطلوبة على الأقل ({formDataValues.passingScore || 50} من {formDataValues.totalScore || 100}).
          ويتم تلقائياً تفعيل المحاولات المتعددة وإتاحة وقت مرن لتمكين الطالب من الإعادة حتى النجاح.
        </p>
        <div className="bg-white p-2 rounded-xl border border-slate-200 flex gap-2 max-w-md shadow-sm">
          <button
            type="button"
            onClick={() => {
              setValue('requirePassingScore', false, { shouldDirty: true });
            }}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              !formDataValues.requirePassingScore
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            📝 تسليم عادي (يكفي الحل)
          </button>
          <button
            type="button"
            onClick={() => {
              setValue('requirePassingScore', true, { shouldDirty: true });
              setValue('allowMultipleAttempts', true, { shouldDirty: true });
              setValue('isOptional', false, { shouldDirty: true });
              if (type === 'EXAM' && scheduleMode !== 'DURATION_ONLY') {
                selectScheduleMode('DURATION_ONLY');
              }
            }}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              formDataValues.requirePassingScore
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            🎯 إلزامي اجتياز درجة النجاح
          </button>
        </div>
      </div>

      {/* Attempt policy: single vs. multiple attempts */}
      <div className="mt-6">
        <Label className="mb-2 block font-bold text-slate-800">
          {type === 'ASSIGNMENT' ? 'نظام محاولات الواجب' : 'نظام محاولات الاختبار'}
        </Label>
        <p className="text-slate-500 text-sm mb-3">
          {type === 'ASSIGNMENT'
            ? 'حدد ما إذا كان بإمكان الطالب إعادة حل وتسليم الواجب أكثر من مرة، أو الاكتفاء بمحاولة تسليم واحدة فقط.'
            : 'حدد ما إذا كان بإمكان الطالب حل هذا الاختبار أكثر من مرة. عند اختيار "محاولات متعددة" يتم اعتماد أعلى درجة كدرجة رسمية مع الاحتفاظ بسجل كل المحاولات.'}
        </p>
        <div className="bg-white p-2 rounded-xl border border-slate-200 flex gap-2 max-w-md shadow-sm">
          <button
            type="button"
            onClick={() => {
              if (formDataValues.requirePassingScore) {
                showLogicalConflictToast(
                  'لا يمكن تفعيل محاولة واحدة فقط مع اشتراط درجة النجاح للتقدم، حتى لا يتعطل تقدم الطالب نهائياً في الكورس عند الرسوب. تم الإبقاء على المحاولات المتعددة.'
                );
                return;
              }
              setValue('allowMultipleAttempts', false, { shouldDirty: true });
            }}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              !formDataValues.allowMultipleAttempts
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            🔒 محاولة واحدة
          </button>
          <button
            type="button"
            onClick={() => setValue('allowMultipleAttempts', true, { shouldDirty: true })}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              formDataValues.allowMultipleAttempts
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            🔁 محاولات متعددة
          </button>
        </div>
      </div>

      {/* Optional vs Mandatory Assessment Policy */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>إلزامية التقييم للطلاب</span>
          <span className="text-xs text-slate-400 font-normal">
            (هل يمكن للطالب تخطي هذا الاختبار/الواجب؟)
          </span>
        </label>
        <p className="text-xs text-slate-500">
          إذا تم تحديد "اختياري"، سيتمكن الطالب من تجاوز التقييم دون أن يمنعه ذلك من الانتقال للدروس والوحدات القادمة.
        </p>
        <div className="bg-white p-2 rounded-xl border border-slate-200 flex gap-2 max-w-md shadow-sm">
          <button
            type="button"
            onClick={() => setValue('isOptional', false, { shouldDirty: true })}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              !formDataValues.isOptional
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            إجباري (مطلوب للتقدم)
          </button>
          <button
            type="button"
            onClick={() => {
              if (formDataValues.requirePassingScore) {
                showLogicalConflictToast(
                  'لا يمكن جعل التقييم اختيارياً مع اشتراط درجة النجاح للتقدم. تم إلغاء اشتراط درجة النجاح تلقائياً.'
                );
                setValue('requirePassingScore', false, { shouldDirty: true });
              }
              setValue('isOptional', true, { shouldDirty: true });
            }}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all cursor-pointer ${
              formDataValues.isOptional
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            اختياري (يمكن تخطيه)
          </button>
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
        <Button onClick={onNext} className="cursor-pointer">
          التالي: الأسئلة
          <ArrowLeft className="w-4 h-4 mr-2" />
        </Button>
      </div>
    </div>
  );
}
