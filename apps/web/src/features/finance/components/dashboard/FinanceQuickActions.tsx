import { QrCode, ClipboardList, BookOpen, FileSpreadsheet, BarChart3 } from 'lucide-react';
import { FinanceTab } from '../FinanceTabs';

interface QuickActionsProps {
  activeTab: FinanceTab | 'OVERVIEW';
  onChange: (tab: FinanceTab | 'OVERVIEW') => void;
}

export function FinanceQuickActions({ activeTab, onChange }: QuickActionsProps) {
  const actions: Array<{ id: FinanceTab | 'OVERVIEW'; label: string; icon: any }> = [
    { id: 'OVERVIEW', label: 'لوحة التحكم', icon: BarChart3 },
    { id: 'QR', label: 'الماسح السريع (QR)', icon: QrCode },
    { id: 'MANUAL', label: '+ تسجيل مصروف', icon: ClipboardList },
    { id: 'BOOKLETS', label: 'المذكرات والملازم', icon: BookOpen },
    { id: 'MATRIX', label: 'سجل المدفوعات', icon: FileSpreadsheet },
    { id: 'ANALYTICS', label: 'التقارير المالية', icon: BarChart3 },
  ];

  return (
    <div className="w-full overflow-x-auto pb-2 -mb-2 hide-scrollbar">
      <div className="flex w-max min-w-full sm:w-auto bg-slate-100/70 p-1.5 rounded-xl sm:rounded-2xl gap-1">
        {actions.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === id
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
