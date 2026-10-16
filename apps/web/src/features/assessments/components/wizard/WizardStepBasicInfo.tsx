'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CreateAssessmentFormData } from '../../types/assessments.schema';
import { Group } from '../../../groups/types/groups.types';

export interface WizardStepBasicInfoProps {
  methods: UseFormReturn<CreateAssessmentFormData>;
  type: 'EXAM' | 'ASSIGNMENT';
  courseLinkScope: string | null;
  paramLessonTitle: string | null;
  paramModuleName: string | null;
  targetScope: 'GROUPS' | 'COURSE';
  setTargetScope: (scope: 'GROUPS' | 'COURSE') => void;
  dueDateOption: 'NEXT_SESSION' | 'CUSTOM' | 'NO_DEADLINE';
  setDueDateOption: (opt: 'NEXT_SESSION' | 'CUSTOM' | 'NO_DEADLINE') => void;
  teacherCourses?: any[];
  allGroups?: Group[];
  availableGroups: Group[];
}

export function WizardStepBasicInfo({
  methods,
  type,
  courseLinkScope,
  paramLessonTitle,
  paramModuleName,
  targetScope,
  setTargetScope,
  dueDateOption,
  setDueDateOption,
  teacherCourses,
  allGroups,
  availableGroups,
}: WizardStepBasicInfoProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = methods;

  const formDataValues = watch();
  const selectedStage = formDataValues.academicStage;
  const selectedGrade = formDataValues.gradeLevel;

  const gradeOptions: Record<string, { label: string; value: string }[]> = {
    PRIMARY: [
      { label: 'الصف الأول الابتدائي', value: 'الصف الأول الابتدائي' },
      { label: 'الصف الثاني الابتدائي', value: 'الصف الثاني الابتدائي' },
      { label: 'الصف الثالث الابتدائي', value: 'الصف الثالث الابتدائي' },
      { label: 'الصف الرابع الابتدائي', value: 'الصف الرابع الابتدائي' },
      { label: 'الصف الخامس الابتدائي', value: 'الصف الخامس الابتدائي' },
      { label: 'الصف السادس الابتدائي', value: 'الصف السادس الابتدائي' },
    ],
    MIDDLE: [
      { label: 'الصف الأول الإعدادي', value: 'الصف الأول الإعدادي' },
      { label: 'الصف الثاني الإعدادي', value: 'الصف الثاني الإعدادي' },
      { label: 'الصف الثالث الإعدادي', value: 'الصف الثالث الإعدادي' },
    ],
    SECONDARY: [
      { label: 'الصف الأول الثانوي', value: 'الصف الأول الثانوي' },
      { label: 'الصف الثاني الثانوي', value: 'الصف الثاني الثانوي' },
      { label: 'الصف الثالث الثانوي', value: 'الصف الثالث الثانوي' },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">المعلومات الأساسية</h2>
        <p className="text-slate-500 text-sm">
          أدخل تفاصيل {type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار'} مثل العنوان، الوصف، والجهة المستهدفة.
        </p>
      </div>

      {/* Context banner: shown when opened from course builder */}
      {courseLinkScope && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in">
          <span className="text-xl shrink-0 mt-0.5">🔗</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-900">
              {courseLinkScope === 'LESSON' && paramLessonTitle
                ? `سيتم ربط هذا ${type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار'} تلقائياً بالدرس: "${paramLessonTitle}"`
                : courseLinkScope === 'UNIT' && paramModuleName
                ? `سيتم ربط هذا الاختبار تلقائياً بوحدة: "${paramModuleName}"`
                : 'سيتم ربط هذا الاختبار تلقائياً كاختبار نهائي للكورس'}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
              بمجرد حفظ {type === 'ASSIGNMENT' ? 'الواجب' : 'الاختبار'} سيتم ربطه وإعادتك مباشرة لصفحة الكورس ونافذة الدرس.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">
            {type === 'ASSIGNMENT' ? 'عنوان الواجب' : 'عنوان الاختبار'}{' '}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            {...register('title')}
            placeholder={
              type === 'ASSIGNMENT'
                ? 'مثال: واجب النحو والبلاغة الأول'
                : 'مثال: امتحان منتصف الفصل الدراسي الأول'
            }
            className={errors.title ? 'border-red-500' : ''}
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Target Scope Selection: Groups vs Online Course */}
        <div className="space-y-3">
          <Label className="font-bold text-slate-800 block">
            الجهة المستهدفة للـ{type === 'ASSIGNMENT' ? 'واجب' : 'اختبار'}{' '}
            <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!!courseLinkScope}
              onClick={() => {
                setTargetScope('GROUPS');
                setValue('courseId', null);
                if (dueDateOption === 'NO_DEADLINE') {
                  setDueDateOption('NEXT_SESSION');
                }
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                targetScope === 'GROUPS'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm ring-2 ring-primary-50'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-base">🏫</span>
              <span>مجموعات الحضور والسنتر</span>
            </button>

            <button
              type="button"
              disabled={!!courseLinkScope}
              onClick={() => {
                setTargetScope('COURSE');
                setValue('targetGroupIds', []);
                if (dueDateOption === 'NEXT_SESSION') {
                  setDueDateOption('NO_DEADLINE');
                  setValue('dueDate', '', { shouldValidate: true });
                }
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                targetScope === 'COURSE'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm ring-2 ring-primary-50'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-base">💻</span>
              <span>كورس ودورة أونلاين</span>
            </button>
          </div>
        </div>

        {targetScope === 'COURSE' ? (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
            <Label className="font-bold text-slate-800 block">
              اختر الكورس الأونلاين المرتبط <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formDataValues.courseId || ''}
              disabled={!!courseLinkScope}
              onChange={(e) => {
                setValue('courseId', e.target.value || null, {
                  shouldValidate: true,
                });
              }}
              options={[
                { label: '-- اختر الكورس الأونلاين من القائمة --', value: '' },
                ...(teacherCourses?.map((c: any) => ({
                  label: `${c.title} (${c.subject || 'عام'})`,
                  value: c.id,
                })) || []),
              ]}
            />
            {(!teacherCourses || teacherCourses.length === 0) && (
              <p className="text-xs text-slate-500 mt-1">
                لم يتم العثور على كورسات أونلاين حالياً. يمكنك إنشاء كورس من قسم
                "الكورسات أونلاين".
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="mb-2 block">المرحلة الدراسية (اختياري)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'PRIMARY', label: 'الابتدائية', icon: '✏️' },
                    { id: 'MIDDLE', label: 'الإعدادية', icon: '🏫' },
                    { id: 'SECONDARY', label: 'الثانوية', icon: '🎓' },
                  ].map((stage) => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => {
                        setValue('academicStage', stage.id);
                        setValue('gradeLevel', '');
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                        selectedStage === stage.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm ring-2 ring-primary-50'
                          : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 text-slate-500'
                      }`}
                    >
                      <span className="text-xl mb-1">{stage.icon}</span>
                      <span className="font-bold text-xs">{stage.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Select
                  label="الصف الدراسي (اختياري)"
                  name="gradeLevel"
                  disabled={!selectedStage}
                  value={formDataValues.gradeLevel || ''}
                  onChange={(e) => {
                    const newGrade = e.target.value;
                    setValue('gradeLevel', newGrade);
                    const groupsForGrade =
                      allGroups?.filter((g) => g.gradeLevel === newGrade) || [];
                    setValue(
                      'targetGroupIds',
                      groupsForGrade.map((g) => g.id)
                    );
                  }}
                  options={[
                    { label: '-- اختر الصف الدراسي --', value: '' },
                    ...(selectedStage ? gradeOptions[selectedStage] : []),
                  ]}
                />
              </div>
            </div>

            {selectedGrade && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <Label className="mb-3 block font-bold text-slate-800">
                  المجموعات المستهدفة{' '}
                  <span className="text-sm font-normal text-slate-500">
                    (
                    {type === 'ASSIGNMENT'
                      ? 'اختر المجموعات المستهدفة للواجب'
                      : 'اختر المجموعات التي ستمتحن'}
                    )
                  </span>
                </Label>

                {availableGroups.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {availableGroups.map((group) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors"
                      >
                        <input
                          type="checkbox"
                          value={group.id}
                          checked={formDataValues.targetGroupIds?.includes(
                            group.id
                          )}
                          onChange={(e) => {
                            const currentIds =
                              formDataValues.targetGroupIds || [];
                            if (e.target.checked) {
                              setValue('targetGroupIds', [
                                ...currentIds,
                                group.id,
                              ]);
                            } else {
                              setValue(
                                'targetGroupIds',
                                currentIds.filter((id) => id !== group.id)
                              );
                            }
                          }}
                          className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-slate-700">
                          {group.name}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 bg-white p-4 rounded-lg border border-slate-200 text-center">
                    لا توجد مجموعات مسجلة في هذا الصف الدراسي.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
