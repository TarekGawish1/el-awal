'use client';

import React from 'react';
import { X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MultiSelectDropdown } from '@/features/groups/components/MultiSelectDropdown';
import { SearchableSessionCombobox } from '@/features/attendance/components/SearchableSessionCombobox';

interface AttendanceFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeFiltersCount: number;
  resetFilters: () => void;
  selectedStages: string[];
  onStagesChange: (stages: string[]) => void;
  availableGradeOptions: { label: string; value: string }[];
  selectedGrades: string[];
  onGradesChange: (grades: string[]) => void;
  availableLocations: string[];
  selectedLocations: string[];
  onLocationsChange: (locations: string[]) => void;
  filteredAllSessions: any[];
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
  isLoadingAllSessions: boolean;
  groupMap: Map<string, any>;
}

export function AttendanceFilterDrawer({
  isOpen,
  onClose,
  activeFiltersCount,
  resetFilters,
  selectedStages,
  onStagesChange,
  availableGradeOptions,
  selectedGrades,
  onGradesChange,
  availableLocations,
  selectedLocations,
  onLocationsChange,
  filteredAllSessions,
  selectedSessionId,
  onSelectSession,
  isLoadingAllSessions,
  groupMap,
}: AttendanceFilterDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex rtl:flex-row-reverse justify-end">
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right rtl:slide-in-from-left duration-300">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">تصفية الحصص</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeFiltersCount > 0 && (
             <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-100">
                <span className="text-xs font-semibold text-blue-700">يوجد فلاتر نشطة</span>
                <button onClick={resetFilters} className="text-xs text-blue-600 hover:text-blue-800 underline">إعادة ضبط</button>
             </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">المرحلة الدراسية</label>
            <MultiSelectDropdown
              placeholder="اختر المرحلة"
              allSelectedLabel="جميع المراحل"
              options={[
                { label: 'المرحلة الابتدائية', value: 'المرحلة الابتدائية' },
                { label: 'المرحلة الإعدادية', value: 'المرحلة الإعدادية' },
                { label: 'المرحلة الثانوية', value: 'المرحلة الثانوية' },
              ]}
              selectedValues={selectedStages}
              onChange={onStagesChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">الصف الدراسي</label>
            <MultiSelectDropdown
              placeholder="اختر الصف"
              allSelectedLabel="جميع الصفوف"
              withSearch={availableGradeOptions.length > 5}
              options={availableGradeOptions}
              selectedValues={selectedGrades}
              onChange={onGradesChange}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">المكان / السنتر</label>
            <MultiSelectDropdown
              placeholder="اختر المكان"
              allSelectedLabel="جميع الأماكن"
              withSearch={true}
              options={availableLocations.map((loc) => ({
                label: loc,
                value: loc,
                icon: <MapPin className="w-3.5 h-3.5 text-slate-400" />,
              }))}
              selectedValues={selectedLocations}
              onChange={onLocationsChange}
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <SearchableSessionCombobox
              label="البحث في جميع حصص الترم"
              countLabel={`${filteredAllSessions.length} حصة مجدولة`}
              sessions={filteredAllSessions}
              selectedSessionId={selectedSessionId}
              onSelectSession={(id) => {
                 onSelectSession(id);
                 onClose();
              }}
              placeholder="-- ابحث في جميع الحصص --"
              isLoading={isLoadingAllSessions}
              isTodayPicker={false}
              groupMap={groupMap}
            />
          </div>
        </div>
        
        <div className="p-5 border-t border-slate-100 bg-slate-50">
          <Button onClick={onClose} className="w-full">
            تطبيق وإغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
