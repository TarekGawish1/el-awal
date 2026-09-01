import React from 'react';
import { Search, Filter, RotateCcw, User, Activity } from 'lucide-react';
import { AuditAction, AuditQueryParams, PerformerItem } from '../types/audit.types';

interface AuditLogFiltersProps {
  filters: AuditQueryParams;
  performers: PerformerItem[];
  onChange: (newFilters: Partial<AuditQueryParams>) => void;
  onReset: () => void;
}

const ACTION_OPTIONS: Array<{ value: AuditAction | ''; label: string }> = [
  { value: '', label: 'جميع الإجراءات' },
  { value: 'CREATE', label: 'إضافة جديد (CREATE)' },
  { value: 'UPDATE', label: 'تعديل (UPDATE)' },
  { value: 'DELETE', label: 'حذف (DELETE)' },
  { value: 'SCAN_ATTENDANCE', label: 'رصد حضور (QR)' },
  { value: 'RECORD_PAYMENT', label: 'تسجيل مدفوعات' },
  { value: 'GRADE_SUBMISSION', label: 'تصحيح درجات' },
  { value: 'EXPORT', label: 'تصدير بيانات' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'جميع الأقسام' },
  { value: 'STUDENT', label: 'الطلاب' },
  { value: 'ASSISTANT', label: 'المساعدين' },
  { value: 'GROUP', label: 'المجموعات' },
  { value: 'ATTENDANCE', label: 'الحضور والغياب' },
  { value: 'PAYMENT', label: 'الماليات والمدفوعات' },
  { value: 'ASSESSMENT', label: 'الواجبات والاختبارات' },
  { value: 'COURSE', label: 'الكورسات' },
  { value: 'CERTIFICATE', label: 'الشهادات' },
];

export function AuditLogFilters({
  filters,
  performers,
  onChange,
  onReset,
}: AuditLogFiltersProps) {
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

        {/* Performer / Assistant */}
        <div>
          <label className="block text-neutral-500 mb-1 font-bold">منفّذ العملية</label>
          <select
            value={filters.userId || ''}
            onChange={(e) => onChange({ userId: e.target.value, page: 1 })}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-700 outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">الجميع (معلم ومساعدين)</option>
            {performers.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.userName} ({p.userRole === 'SECRETARIAT' ? 'مساعد' : 'معلم'})
              </option>
            ))}
          </select>
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
