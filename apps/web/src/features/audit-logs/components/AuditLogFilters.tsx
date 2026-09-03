'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, RotateCcw, User, ChevronDown, Check, Users, ShieldCheck } from 'lucide-react';
import { AuditAction, AuditQueryParams, PerformerItem } from '../types/audit.types';

interface AuditLogFiltersProps {
  filters: AuditQueryParams;
  performers: PerformerItem[];
  onChange: (newFilters: Partial<AuditQueryParams>) => void;
  onReset: () => void;
}

const ACTION_OPTIONS: Array<{ value: AuditAction | ''; label: string }> = [
  { value: '', label: 'جميع الإجراءات' },
  { value: 'CREATE', label: 'إضافة جديد' },
  { value: 'UPDATE', label: 'تعديل' },
  { value: 'DELETE', label: 'حذف' },
  { value: 'SCAN_ATTENDANCE', label: 'رصد حضور' },
  { value: 'RECORD_PAYMENT', label: 'تسجيل مدفوعات' },
  { value: 'GRADE_SUBMISSION', label: 'تصحيح درجات' },
  { value: 'EXPORT', label: 'تصدير بيانات' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'جميع الأقسام' },
  { value: 'STUDENT', label: 'الطلاب' },
  { value: 'ASSISTANT', label: 'المساعدين' },
  { value: 'GROUP', label: 'المجموعات الدراسية' },
  { value: 'ATTENDANCE', label: 'الحضور والغياب' },
  { value: 'PAYMENT', label: 'الماليات والمدفوعات' },
  { value: 'ASSESSMENT', label: 'الواجبات والاختبارات' },
  { value: 'COURSE', label: 'الكورسات التعليمية' },
  { value: 'CONTENT', label: 'الدروس والمحتوى' },
  { value: 'BOOKLET', label: 'المذكرات والملازم' },
  { value: 'CERTIFICATE', label: 'الشهادات' },
  { value: 'CONTACT_MESSAGE', label: 'رسائل الموقع' },
  { value: 'ACADEMIC_PERIOD', label: 'السنوات والفترات' },
  { value: 'RESERVATION', label: 'طلبات الانضمام' },
  { value: 'NOTIFICATION', label: 'مركز الإشعارات' },
];

export function AuditLogFilters({
  filters,
  performers,
  onChange,
  onReset,
}: AuditLogFiltersProps) {
  const [isPerformerOpen, setIsPerformerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPerformerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const teachers = performers.filter((p) => p.userRole === 'TEACHER');
  const assistants = performers.filter((p) => p.userRole === 'SECRETARIAT');

  // Active selected assistant IDs
  const selectedUserIds = (filters.userId || '').split(',').map((s) => s.trim()).filter(Boolean);
  const isAllSelected = !filters.userId && !filters.userRole;
  const isTeacherOnly = filters.userRole === 'TEACHER';
  const isAllAssistants = filters.userRole === 'SECRETARIAT';

  // Toggle individual assistant
  const toggleAssistant = (assistantId: string) => {
    let nextIds: string[];
    if (isAllAssistants) {
      nextIds = assistants.map((a) => a.userId).filter((id) => id !== assistantId);
    } else if (selectedUserIds.includes(assistantId)) {
      nextIds = selectedUserIds.filter((id) => id !== assistantId);
    } else {
      nextIds = [...selectedUserIds, assistantId];
    }

    if (nextIds.length === 0) {
      onChange({ userId: '', userRole: '', page: 1 });
    } else if (assistants.length > 0 && nextIds.length === assistants.length) {
      onChange({ userId: '', userRole: 'SECRETARIAT', page: 1 });
    } else {
      onChange({ userId: nextIds.join(','), userRole: '', page: 1 });
    }
  };

  // Label to display on the trigger button
  const getPerformerTriggerLabel = () => {
    if (isAllSelected) return 'الجميع (معلم ومساعدين)';
    if (isTeacherOnly) return 'المعلم فقط';
    if (isAllAssistants) return `جميع المساعدين (${assistants.length})`;
    if (selectedUserIds.length === 1) {
      const match = performers.find((p) => p.userId === selectedUserIds[0]);
      return match ? `المساعد: ${match.userName}` : 'مساعد محدد';
    }
    if (selectedUserIds.length > 1) {
      return `${selectedUserIds.length} مساعدين محددين`;
    }
    return 'الجميع (معلم ومساعدين)';
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm mb-6 space-y-4">
      {/* Top Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            placeholder="بحث في تفاصيل العملية، اسم المساعد، أو اسم الطالب..."
            className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          إعادة ضبط الفلاتر
        </button>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-neutral-100 text-xs font-medium">
        {/* Action Type */}
        <div>
          <label className="block text-neutral-500 mb-1 font-bold">نوع الإجراء</label>
          <select
            value={filters.action || ''}
            onChange={(e) => onChange({ action: e.target.value as any, page: 1 })}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-700 outline-none focus:ring-2 focus:ring-primary-500"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Entity Type */}
        <div>
          <label className="block text-neutral-500 mb-1 font-bold">القسم / الكيان</label>
          <select
            value={filters.entityType || ''}
            onChange={(e) => onChange({ entityType: e.target.value, page: 1 })}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-700 outline-none focus:ring-2 focus:ring-primary-500"
          >
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Multi-Select Performer / Assistant */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-neutral-500 mb-1 font-bold">منفّذ العملية (تحديد متعدد)</label>
          <button
            type="button"
            onClick={() => setIsPerformerOpen(!isPerformerOpen)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-700 outline-none focus:ring-2 focus:ring-primary-500 flex items-center justify-between gap-2 text-right transition-colors"
          >
            <span className="truncate font-semibold text-xs text-neutral-800">
              {getPerformerTriggerLabel()}
            </span>
            <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isPerformerOpen ? 'rotate-180' : ''}`} />
          </button>

          {isPerformerOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2.5 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
              {/* Presets */}
              <div className="space-y-1 pb-2 border-b border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ userId: '', userRole: '', page: 1 });
                    setIsPerformerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isAllSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    الجميع (معلم ومساعدين)
                  </div>
                  {isAllSelected && <Check className="w-4 h-4 text-primary-600" />}
                </button>

                {teachers.map((t) => {
                  const isTeacherSelected =
                    selectedUserIds.length === 1 && selectedUserIds[0] === t.userId && !filters.userRole;
                  return (
                    <button
                      key={t.userId}
                      type="button"
                      onClick={() => {
                        onChange({ userId: t.userId, userRole: '', page: 1 });
                        setIsPerformerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isTeacherSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        {t.userName} (المعلم)
                      </div>
                      {isTeacherSelected && <Check className="w-4 h-4 text-primary-600" />}
                    </button>
                  );
                })}

                {assistants.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ userId: '', userRole: 'SECRETARIAT', page: 1 });
                      setIsPerformerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      isAllAssistants ? 'bg-amber-50 text-amber-800' : 'hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-600" />
                      جميع المساعدين ({assistants.length})
                    </div>
                    {isAllAssistants && <Check className="w-4 h-4 text-amber-600" />}
                  </button>
                )}
              </div>

              {/* Individual Assistants Checklist */}
              {assistants.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                    تحديد مساعدين معينين:
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                    {assistants.map((assistant) => {
                      const isChecked =
                        isAllAssistants || selectedUserIds.includes(assistant.userId);
                      return (
                        <label
                          key={assistant.userId}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs font-medium transition-colors select-none ${
                            isChecked
                              ? 'bg-primary-50/70 text-primary-950 font-bold'
                              : 'hover:bg-neutral-50 text-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleAssistant(assistant.userId)}
                              className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer accent-primary-600"
                            />
                            <span>{assistant.userName}</span>
                          </div>
                          <span className="text-[10px] text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded font-bold">
                            مساعد
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-neutral-500 mb-1 font-bold">التاريخ</label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onChange({ startDate: e.target.value, page: 1 })}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-neutral-700 outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );
}
