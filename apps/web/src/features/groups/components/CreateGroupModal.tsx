'use client';

import React from 'react';
import { X, Loader2, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Select';
import { LocationSelect } from './LocationSelect';
import { AcademicYearSelect } from './AcademicYearSelect';
import { GroupSchedulesEditor } from './GroupSchedulesEditor';
import { useCreateGroupModalState } from '../hooks/useCreateGroupModalState';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

const academicTermOptions = [
  { label: 'الفصل الدراسي الأول', value: 'FIRST_TERM' },
  { label: 'الفصل الدراسي الثاني', value: 'SECOND_TERM' },
];

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const {
    formData,
    setFormData,
    educationalStage,
    setEducationalStage,
    groupLocation,
    setGroupLocation,
    slot1Suggested,
    setSlot1Suggested,
    createGroup,
    handleSubmit,
    handleBackdropClick,
  } = useCreateGroupModalState({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">إنشاء مجموعة جديدة</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1">
            {createGroup.isError && (
              <Alert variant="error" className="mb-6">
                {(createGroup.error as any)?.message || 'حدث خطأ أثناء إنشاء المجموعة'}
              </Alert>
            )}

            <div className="space-y-4">
              {/* Academic Year and Term Selector */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                <div>
                  <AcademicYearSelect
                    value={formData.academicYear || '2026-2027'}
                    onChange={(val) => setFormData({ ...formData, academicYear: val })}
                  />
                </div>
                <div>
                  <Select
                    label="الفصل الدراسي *"
                    name="academicTerm"
                    required
                    value={formData.academicTerm || 'FIRST_TERM'}
                    onChange={(e) => setFormData({ ...formData, academicTerm: e.target.value })}
                    options={academicTermOptions}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">المرحلة الدراسية *</label>
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
                  disabled={!educationalStage || createGroup.isPending}
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  options={[
                    { label: '-- اختر الصف الدراسي --', value: '' },
                    ...(educationalStage ? gradeOptions[educationalStage] : []),
                  ]}
                />
              </div>

              {/* Schedules Section */}
              <GroupSchedulesEditor
                schedules={formData.schedules || []}
                onChange={(schedules) => setFormData({ ...formData, schedules })}
                disabled={createGroup.isPending}
                slot1Suggested={slot1Suggested}
                onSlot1ManualChange={() => setSlot1Suggested(false)}
              />

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
                  disabled={createGroup.isPending}
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
                    onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                    disabled={createGroup.isPending}
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
                    onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value ? parseFloat(e.target.value) : undefined })}
                    disabled={createGroup.isPending}
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    قيمة الاشتراك الشهري (اختياري)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createGroup.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={createGroup.isPending || !formData.name || !formData.gradeLevel}
            >
              {createGroup.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء المجموعة'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
