'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { CreateAssessmentFormData } from '../../types/assessments.schema';
import { Group } from '../../../groups/types/groups.types';
import { getGroupNextSessionDate, getNextSessionDate } from '../../hooks/useAssessmentSchedule';

export interface WizardScheduleSectionProps {
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
}

export function WizardScheduleSection({
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
}: WizardScheduleSectionProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = methods;

  const formDataValues = watch();
  const watchedTargetGroupIds = formDataValues.targetGroupIds;
  const durationRegister = register('durationMinutes');

  if (type === 'ASSIGNMENT') {
    return (
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block font-medium">
            موعد التسليم <span className="text-red-500">*</span>
          </Label>
          <div className="flex flex-wrap gap-3 mb-3">
            {targetScope !== 'COURSE' && (
              <button
                type="button"
                onClick={() => {
                  setDueDateOption('NEXT_SESSION');
                  const calculatedDate = getNextSessionDate(
                    allGroups || [],
                    watchedTargetGroupIds || []
                  );
                  if (calculatedDate) {
                    setValue('dueDate', calculatedDate.toISOString(), {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  } else {
                    setValue('dueDate', '', { shouldValidate: true });
                  }
                }}
                className={`py-2 px-4 rounded-xl border-2 text-sm font-bold transition-all shadow-sm cursor-pointer ${
                  dueDateOption === 'NEXT_SESSION'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-50'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                🗓️ الحصة القادمة (تلقائي)
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setDueDateOption('NO_DEADLINE');
                setValue('dueDate', '', {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
              className={`py-2 px-4 rounded-xl border-2 text-sm font-bold transition-all shadow-sm cursor-pointer ${
                dueDateOption === 'NO_DEADLINE'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-50'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              🔓 مفتوح بدون موعد تسليم (متاح دائماً)
            </button>
            <button
              type="button"
              onClick={() => {
                setDueDateOption('CUSTOM');
              }}
              className={`py-2 px-4 rounded-xl border-2 text-sm font-bold transition-all shadow-sm cursor-pointer ${
                dueDateOption === 'CUSTOM'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-50'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              ⚙️ تاريخ ووقت مخصص
            </button>
          </div>
        </div>

        {dueDateOption === 'NO_DEADLINE' ? (
          <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5 max-w-lg leading-relaxed shadow-2xs">
            <span className="text-base">🔓</span>
            <span>
              الواجب متاح دائماً بدون موعد تسليم نهائي. يمكن لطلاب الكورس حل وتسليم الواجب في أي وقت يناسبهم دون تقييد بموعد إغلاق.
            </span>
          </div>
        ) : dueDateOption === 'NEXT_SESSION' ? (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm max-w-lg space-y-3">
            <span className="text-slate-500 block">
              تواريخ التسليم التلقائية لكل مجموعة (موعد الحصة القادمة):
            </span>
            {watchedTargetGroupIds && watchedTargetGroupIds.length > 0 ? (
              <div className="space-y-2">
                {allGroups
                  ?.filter((g) => watchedTargetGroupIds.includes(g.id))
                  .map((group) => {
                    const groupDate = getGroupNextSessionDate(group);
                    return (
                      <div
                        key={group.id}
                        className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-150 shadow-sm"
                      >
                        <span className="font-bold text-slate-700">{group.name}</span>
                        <span className="text-primary-600 font-bold">
                          {groupDate
                            ? groupDate.toLocaleDateString('ar-EG', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'بدون جدول'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-slate-400 italic">
                يرجى تحديد المجموعات المستهدفة أولاً لحساب موعد الحصة القادمة لكل منها.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">اختر تاريخ ووقت التسليم</Label>
              <DateTimePicker
                value={formDataValues.dueDate}
                onChange={(val) => {
                  setValue('dueDate', val, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                placeholder="اختر تاريخ ووقت التسليم..."
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // EXAM schedule modes
  return (
    <div className="space-y-5 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
      <div>
        <Label className="mb-2 block font-bold text-slate-800">
          نظام توقيت وجدولة الاختبار <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-slate-500 mb-3">
          حدد طريقة ضبط وتزامن وقت الاختبار للطلاب:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => selectScheduleMode('FIXED_SESSION')}
            className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              scheduleMode === 'FIXED_SESSION'
                ? 'border-primary-500 bg-primary-50/50 text-primary-900 ring-2 ring-primary-100 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <span>⏱️</span>
                <span>جلسة اختبار مباشرة</span>
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">
                موعد موحد متزامن
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              يبدأ الاختبار في موعد البدء ويغلق تلقائياً لجميع الطلاب عند موعد الإغلاق (المتأخر يُحسب له الوقت المتبقي فقط).
            </p>
          </button>

          <button
            type="button"
            onClick={() => selectScheduleMode('FLEXIBLE_WINDOW')}
            className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              scheduleMode === 'FLEXIBLE_WINDOW'
                ? 'border-primary-500 bg-primary-50/50 text-primary-900 ring-2 ring-primary-100 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <span>🗓️</span>
                <span>نافذة زمنية مرنة</span>
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                مدة فردية
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              يتاح الدخول في أي وقت بين موعد البدء وموعد الإغلاق، ويحصل كل طالب على كامل مدة الاختبار الفردية من لحظة دخوله.
            </p>
          </button>

          <button
            type="button"
            onClick={() => selectScheduleMode('DURATION_ONLY')}
            className={`p-4 rounded-xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              scheduleMode === 'DURATION_ONLY'
                ? 'border-primary-500 bg-primary-50/50 text-primary-900 ring-2 ring-primary-100 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-1.5">
                <span>⏳</span>
                <span>مدة فقط</span>
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                بدون موعد محدد
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              بدون موعد بدء أو إغلاق. الاختبار متاح دائماً، ويحصل كل طالب على كامل المدة المحددة من لحظة بدئه.
            </p>
          </button>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 pt-2 ${
          scheduleMode === 'DURATION_ONLY' ? '' : 'sm:grid-cols-3'
        }`}
      >
        {scheduleMode !== 'DURATION_ONLY' && (
          <>
            <div>
              <Label className="mb-2 block font-medium text-xs text-slate-700">
                موعد بدء الاختبار <span className="text-red-500">*</span>
              </Label>
              <DateTimePicker
                value={formDataValues.startTime || formDataValues.startDate}
                onChange={handleStartChange}
                placeholder="تاريخ ووقت البدء..."
                minDate={nowIso}
              />
              {errors.startTime && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.startTime.message}
                </p>
              )}
            </div>

            <div>
              <Label className="mb-2 block font-medium text-xs text-slate-700">
                موعد إغلاق الاختبار <span className="text-red-500">*</span>
              </Label>
              <DateTimePicker
                value={formDataValues.endTime || formDataValues.dueDate}
                onChange={handleEndChange}
                placeholder="تاريخ ووقت الإغلاق..."
                minDate={
                  formDataValues.startTime ||
                  formDataValues.startDate ||
                  nowIso
                }
              />
              {errors.endTime && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.endTime.message}
                </p>
              )}
            </div>
          </>
        )}

        <div className={scheduleMode === 'DURATION_ONLY' ? 'sm:max-w-xs' : ''}>
          <Label className="mb-2 block font-medium text-xs text-slate-700">
            مدة الاختبار (بالدقائق) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            {...durationRegister}
            onChange={(e) => {
              durationRegister.onChange(e);
              syncCloseFromDuration(e.target.value);
            }}
            placeholder="مثال: 60"
            className={errors.durationMinutes ? 'border-red-500' : ''}
          />
          {errors.durationMinutes && (
            <p className="text-red-500 text-xs mt-1">
              {errors.durationMinutes.message}
            </p>
          )}
        </div>
      </div>

      {scheduleMode === 'DURATION_ONLY' && (
        <div className="flex items-start gap-2 rounded-xl bg-violet-50 border border-violet-100 p-3 text-xs text-violet-800 leading-relaxed">
          <span>ℹ️</span>
          <span>
            لن يتم تحديد موعد بدء أو إغلاق. سيكون الاختبار متاحاً للطلاب فور نشره، ويبدأ عدّاد المدة لكل طالب من لحظة دخوله وينتهي تلقائياً بانتهاء المدة المحددة.
          </span>
        </div>
      )}

      {scheduleMode === 'FIXED_SESSION' && (
        <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 leading-relaxed">
          <span>🔗</span>
          <span>
            المدة مرتبطة تلقائياً بموعدي البدء والإغلاق: أي تعديل في أحدها يُحدِّث الباقي بحيث يظل زمن الجلسة مساوياً للفارق بين موعد الإغلاق وموعد البدء.
          </span>
        </div>
      )}
    </div>
  );
}
