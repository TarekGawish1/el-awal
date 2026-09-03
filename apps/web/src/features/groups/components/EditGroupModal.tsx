'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Loader2, Plus, Trash2, Clock, ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Select';
import { useUpdateGroup } from '../hooks/useGroups';
import { CreateGroupPayload, GroupWithDetails } from '../types/groups.types';
import { LocationSelect } from './LocationSelect';
import { AcademicYearSelect } from './AcademicYearSelect';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupWithDetails | null | undefined;
}

const generateTimeOptions = () => {
  const options = [];
  for (let i = 6; i <= 23; i++) {
    for (let j = 0; j < 60; j += 15) {
      const hour24 = i.toString().padStart(2, '0');
      const minute = j.toString().padStart(2, '0');
      const value = `${hour24}:${minute}`;
      
      const hour12 = i % 12 || 12;
      const hour12Str = hour12 < 10 ? `0${hour12}` : `${hour12}`;
      const ampm = i < 12 ? 'ص' : 'م';
      const label = `${hour12Str}:${minute} ${ampm}`;
      
      options.push({ label, value });
    }
  }
  // إضافة 12 منتصف الليل
  options.push({ label: '12:00 ص', value: '00:00' });
  return options;
};

const addOneHour = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;
  let newHours = hours + 1;
  if (newHours === 24) newHours = 0;
  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const timeOptions = generateTimeOptions();

function TimeSelect({ value, onChange, label, disabled }: { value: string, onChange: (val: string) => void, label: string, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = timeOptions.find(t => t.value === value);

  return (
    <div className="flex-1 relative" ref={containerRef}>
      <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between appearance-none rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-neutral-100 transition-colors"
      >
        <span dir="ltr">{selectedOption ? selectedOption.label : 'اختر الوقت'}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-xl py-1" style={{ scrollbarWidth: 'thin' }}>
          {timeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              dir="ltr"
              className={`w-full text-left px-3.5 py-2 text-sm hover:bg-primary-50 transition-colors ${value === opt.value ? 'bg-primary-50 text-primary-700 font-bold' : 'text-neutral-700'}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditGroupModal({ isOpen, onClose, group }: EditGroupModalProps) {
  const [formData, setFormData] = useState<CreateGroupPayload>({
    name: group?.name || '',
    gradeLevel: group?.gradeLevel || '',
    academicYear: group?.academicYear || '2026-2027',
    academicTerm: group?.academicTerm || 'FIRST_TERM',
    maxCapacity: group?.maxCapacity || 50,
    monthlyFee: group?.monthlyFee || 100,
    schedules: group?.schedules?.map((s: any) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location || '',
    })) || [],
  });
  const [educationalStage, setEducationalStage] = useState('');
  const [groupLocation, setGroupLocation] = useState(group?.schedules?.[0]?.location || '');

  // Re-initialize when group changes
  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        gradeLevel: group.gradeLevel,
        academicYear: group.academicYear || '2026-2027',
        academicTerm: group.academicTerm || 'FIRST_TERM',
        maxCapacity: group.maxCapacity || 50,
        monthlyFee: group.monthlyFee || 100,
        schedules: group.schedules?.map((s: any) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location || '',
        })) || [],
      });
      // Try to determine stage from gradeLevel
      if (group.gradeLevel.includes('الابتدائي')) setEducationalStage('PRIMARY');
      else if (group.gradeLevel.includes('الإعدادي')) setEducationalStage('MIDDLE');
      else if (group.gradeLevel.includes('الثانوي')) setEducationalStage('SECONDARY');

      // Initialize location if exists
      if (group.schedules && group.schedules.length > 0 && group.schedules[0].location) {
        setGroupLocation(group.schedules[0].location);
      }
    }
  }, [group]);
  
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

  const academicYearOptions = [
    { label: '2026-2027', value: '2026-2027' },
    { label: '2027-2028', value: '2027-2028' },
    { label: '2028-2029', value: '2028-2029' },
    { label: '2025-2026', value: '2025-2026' },
  ];

  const academicTermOptions = [
    { label: 'الفصل الدراسي الأول', value: 'FIRST_TERM' },
    { label: 'الفصل الدراسي الثاني', value: 'SECOND_TERM' },
  ];

  useEffect(() => {
    const daysMap = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const schedules = formData.schedules || [];
    const days = schedules.map(s => daysMap[s.dayOfWeek]);
    const uniqueDays = Array.from(new Set(days));
    let expectedName = '';
    
    // Format the first schedule time to 12h Arabic
    let timeString = '';
    if (schedules.length > 0 && schedules[0].startTime) {
      const [h, m] = schedules[0].startTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const hour12 = h % 12 || 12;
        const ampm = h < 12 ? 'ص' : 'م';
        timeString = `(الساعة ${hour12}:${m.toString().padStart(2, '0')} ${ampm})`;
      }
    }
    
    if (uniqueDays.length > 0) {
      expectedName = `مجموعة ${uniqueDays.join(' و ')} ${timeString}`.trim();
      if (formData.gradeLevel) {
        expectedName += ` - ${formData.gradeLevel}`;
      }
    } else if (formData.gradeLevel) {
      expectedName = `مجموعة ${formData.gradeLevel}`;
    }
    
    if (expectedName && groupLocation) {
      expectedName += ` - ${groupLocation}`;
    }
    
    if (expectedName) {
      setFormData(prev => {
        if (prev.name === expectedName) return prev;
        return { ...prev, name: expectedName };
      });
    }
  }, [formData.schedules, formData.gradeLevel, groupLocation]);

  const updateGroup = useUpdateGroup();

  if (!isOpen || !group) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Inject the shared location into all schedules
    const schedulesWithLocation = formData.schedules?.map(s => ({
      ...s,
      location: groupLocation
    })) || [];

    updateGroup.mutate(
      {
        id: group.id,
        payload: {
          ...formData,
          schedules: schedulesWithLocation,
          maxCapacity: formData.maxCapacity ? Number(formData.maxCapacity) : undefined,
          monthlyFee: formData.monthlyFee ? Number(formData.monthlyFee) : undefined,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
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
                            newSchedules[index].endTime = addOneHour(val); // تحديث تلقائي لوقت الانتهاء
                            setFormData({ ...formData, schedules: newSchedules });
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المصروفات الشهرية</label>
              <Input
                type="number"
                min={0}
                step={5}
                placeholder="0"
                value={formData.monthlyFee === undefined ? '' : formData.monthlyFee}
                onChange={e => setFormData({ ...formData, monthlyFee: e.target.value ? parseFloat(e.target.value) : undefined })}
                disabled={updateGroup.isPending}
              />
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
  );
}
