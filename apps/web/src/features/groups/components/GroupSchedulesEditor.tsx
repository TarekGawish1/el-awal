'use client';

import React from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TimeSelect, addOneHour } from './TimeSelect';
import { GroupSchedule } from '../types/groups.types';

interface GroupSchedulesEditorProps {
  schedules: GroupSchedule[];
  onChange: (schedules: GroupSchedule[]) => void;
  disabled?: boolean;
  slot1Suggested: boolean;
  onSlot1ManualChange: () => void;
}

export function GroupSchedulesEditor({
  schedules,
  onChange,
  disabled,
  slot1Suggested,
  onSlot1ManualChange,
}: GroupSchedulesEditorProps) {
  const handleAddSchedule = () => {
    if (schedules.length === 0) {
      onChange([
        { dayOfWeek: 0, startTime: '14:00', endTime: '15:00', location: '' },
        { dayOfWeek: 3, startTime: '14:00', endTime: '15:00', location: '' },
      ]);
    } else {
      onChange([...schedules, { dayOfWeek: 0, startTime: '14:00', endTime: '15:00', location: '' }]);
    }
  };

  const handleRemoveSchedule = (index: number) => {
    const updated = [...schedules];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
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
          onClick={handleAddSchedule}
          className="h-8 text-xs gap-1 rounded-lg"
          disabled={disabled}
        >
          <Plus className="w-3 h-3" />
          إضافة موعد
        </Button>
      </div>

      {schedules && schedules.length > 0 ? (
        <div className="space-y-3">
          {schedules.map((schedule, index) => (
            <div key={index} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5 relative">
              <div className="flex items-end gap-2.5">
                <div className="flex-1 min-w-[100px]">
                  <Select
                    label="اليوم"
                    name={`schedule-day-${index}`}
                    value={schedule.dayOfWeek.toString()}
                    onChange={(e) => {
                      const updated = [...schedules];
                      updated[index].dayOfWeek = parseInt(e.target.value);
                      onChange(updated);
                      if (index === 1) onSlot1ManualChange();
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
                    disabled={disabled}
                  />
                </div>
                <TimeSelect
                  label="من"
                  value={schedule.startTime}
                  onChange={(val) => {
                    const updated = [...schedules];
                    updated[index].startTime = val;
                    updated[index].endTime = addOneHour(val);
                    onChange(updated);
                    if (index === 1) onSlot1ManualChange();
                  }}
                  disabled={disabled}
                />
                <div className={`relative ${!schedule.endTime ? 'ring-2 ring-red-400 rounded-md' : ''}`}>
                  <TimeSelect
                    label={!schedule.endTime ? 'إلى (مطلوب)' : 'إلى'}
                    value={schedule.endTime}
                    onChange={(val) => {
                      const updated = [...schedules];
                      updated[index].endTime = val;
                      onChange(updated);
                      if (index === 1) onSlot1ManualChange();
                    }}
                    disabled={disabled}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSchedule(index)}
                  className="h-10 px-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center justify-center mb-[2px]"
                  disabled={disabled}
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
  );
}
