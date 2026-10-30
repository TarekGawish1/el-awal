'use client';

import React from 'react';
import { X, Loader2, Plus, Trash2, Clock, MapPin, Users } from 'lucide-react';
import { Portal } from '@/components/ui/Portal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Select';
import { GroupWithDetails } from '../types/groups.types';
import { LocationSelect } from './LocationSelect';
import { AcademicYearSelect } from './AcademicYearSelect';
import { TimeSelect, addOneHour } from './TimeSelect';
import { useEditGroupModalState } from '../hooks/useEditGroupModalState';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupWithDetails | null | undefined;
}

export function EditGroupModal({ isOpen, onClose, group }: EditGroupModalProps) {
  const {
    formData,
    setFormData,
    educationalStage,
    setEducationalStage,
    groupLocation,
    setGroupLocation,
    slot1Suggested,
    setSlot1Suggested,
    updateGroup,
    handleSubmit,
    gradeOptions,
    academicTermOptions,
  } = useEditGroupModalState({ group, onClose });

  if (!isOpen || !group) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">تعديل المجموعة</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1">
          {updateGroup.isError && (
            <Alert variant="error" className="mb-6">
              {(updateGroup.error as any)?.message || 'حدث خطأ أثناء تعديل المجموعة'}
            </Alert>
          )}

          <div className="space-y-4">
            {/* Academic Year and Term Selector */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
              <div>
                <AcademicYearSelect
                  value={formData.academicYear || '2026-2027'}
                  onChange={val => setFormData({ ...formData, academicYear: val })}
                />
              </div>
              <div>
                <Select
                  label="الفصل الدراسي *"
                  name="academicTerm"
                  required
                  value={formData.academicTerm || 'FIRST_TERM'}
                  onChange={e => setFormData({ ...formData, academicTerm: e.target.value })}
                  options={academicTermOptions}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">المرحلة الدراسية *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'PRIMARY', label: 'الابتدائية', icon: '✏️' },
                  { id: 'PREPARATORY', label: 'الإعدادية', icon: '🏫' },
                  { id: 'SECONDARY', label: 'الثانوية', icon: '🎓' },
                ].map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => {
                      setEducationalStage(stage.id);
                      setFormData({ ...formData, gradeLevel: '' });
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-200 ${
                      educationalStage === stage.id
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
                label="الصف الدراسي *"
                name="gradeLevel"
                required
                disabled={!educationalStage || updateGroup.isPending}
                value={formData.gradeLevel}
                onChange={e => setFormData({ ...formData, gradeLevel: e.target.value })}
                options={[
                  { label: '-- اختر الصف الدراسي --', value: '' },
                  ...(educationalStage ? gradeOptions[educationalStage] : []),
                ]}
              />
            </div>

            {/* Schedules Section */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-500" />
                  مواعيد المجموعة
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData(prev => {
                      const current = prev.schedules || [];
                      return {
                        ...prev,
                        schedules: [...current, { dayOfWeek: 0, startTime: '14:00', endTime: '15:00', location: '' }]
                      };
                    });
                  }}
                  className="h-8 text-xs gap-1 rounded-lg"
                  disabled={updateGroup.isPending}
                >
                  <Plus className="w-3 h-3" />
                  إضافة موعد
                </Button>
              </div>

              {formData.schedules && formData.schedules.length > 0 ? (
                <div className="space-y-3">
                  {formData.schedules.map((schedule: any, index: number) => (
                    <div key={index} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 relative">
                      <div className="flex items-end gap-2.5">
                        <div className="flex-1 min-w-[100px]">
                          <Select
                            label="اليوم"
                            name={`schedule-day-${index}`}
                            value={schedule.dayOfWeek.toString()}
                            onChange={(e) => {
                              const newSchedules = [...(formData.schedules || [])];
                              newSchedules[index].dayOfWeek = parseInt(e.target.value);
                              setFormData({ ...formData, schedules: newSchedules });
                              if (index === 1) setSlot1Suggested(false);
                            }}
                            options={[
                              { label: 'الأحد', value: '0' },
                              { label: 'الإثنين', value: '1' },
                              { label: 'الثلاثاء', value: '2' },
                              { label: 'الأربعاء', value: '3' },
                              { label: 'الخميس', value: '4' },
                              { label: 'الجمعة', value: '5' },
                              { label: 'السبت', value: '6' },
                            ]}
                            disabled={updateGroup.isPending}
                          />
                        </div>
                        <TimeSelect
                          label="من"
                          value={schedule.startTime}
                          onChange={(val) => {
                            const newSchedules = [...(formData.schedules || [])];
                            newSchedules[index].startTime = val;
                            newSchedules[index].endTime = addOneHour(val);
                            setFormData({ ...formData, schedules: newSchedules });
                            if (index === 1) setSlot1Suggested(false);
                          }}
                          disabled={updateGroup.isPending}
                        />
                        <TimeSelect
                          label="إلى"
                          value={schedule.endTime}
                          onChange={(val) => {
                            const newSchedules = [...(formData.schedules || [])];
                            newSchedules[index].endTime = val;
                            setFormData({ ...formData, schedules: newSchedules });
                            if (index === 1) setSlot1Suggested(false);
                          }}
                          disabled={updateGroup.isPending}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newSchedules = [...(formData.schedules || [])];
                            newSchedules.splice(index, 1);
                            setFormData({ ...formData, schedules: newSchedules });
                          }}
                          className="h-10 px-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center justify-center mb-[2px]"
                          disabled={updateGroup.isPending}
                          title="حذف الموعد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {index === 1 && slot1Suggested && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-primary-700 bg-primary-50 border border-primary-200 px-2.5 py-0.5 rounded-md font-medium">
                            اقتراح تلقائي: يمكنك تعديل الموعد حسب جدولك
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 bg-slate-50 border border-slate-100 border-dashed rounded-xl text-sm text-slate-500">
                  لم يتم إضافة مواعيد لهذه المجموعة بعد
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم المجموعة *</label>
              <Input
                required
                minLength={3}
                placeholder="يتم التوليد تلقائياً بناءً على المواعيد والصف..."
                value={formData.name}
                disabled
                readOnly
                className="bg-slate-50 cursor-not-allowed text-slate-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary-500" />
                المكان / السنتر / القاعة
              </label>
              <LocationSelect
                value={groupLocation}
                onChange={setGroupLocation}
                disabled={updateGroup.isPending}
                placeholder="اختر أو اكتب مكان الحصة (مثال: سنتر الأوائل - قاعة 1)..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary-500" />
                  الحد الأقصى لعدد الطلاب *
                </label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  required
                  placeholder="50"
                  value={formData.maxCapacity === undefined ? '' : formData.maxCapacity}
                  onChange={e => setFormData({ ...formData, maxCapacity: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                  disabled={updateGroup.isPending}
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  سعة المجموعة (افتراضياً: 50 طالب)
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">المصروفات الشهرية (ج.م)</label>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  placeholder="0"
                  value={formData.monthlyFee === undefined ? '' : formData.monthlyFee}
                  onChange={e => setFormData({ ...formData, monthlyFee: e.target.value ? parseFloat(e.target.value) : undefined })}
                  disabled={updateGroup.isPending}
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  قيمة الاشتراك الشهري (اختياري)
                </span>
              </div>
            </div>
          </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={updateGroup.isPending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={updateGroup.isPending || !formData.gradeLevel || !formData.name}>
              {updateGroup.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : null}
              حفظ التعديلات
            </Button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}
