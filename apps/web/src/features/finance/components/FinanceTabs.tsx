'use client';

import { BookOpen, ClipboardList, FileSpreadsheet, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type FinanceTab = 'QR' | 'MANUAL' | 'BOOKLETS' | 'MATRIX';

interface FinanceTabsProps {
  activeTab: FinanceTab;
  onChange: (tab: FinanceTab) => void;
}

export function FinanceTabs({ activeTab, onChange }: FinanceTabsProps) {
  const tabs: Array<{ id: FinanceTab; label: string; icon: typeof QrCode; className?: string }> = [
    { id: 'QR', label: 'الماسح الذكي (QR)', icon: QrCode },
    { id: 'MANUAL', label: 'رصد يدوي للمصروفات', icon: ClipboardList },
    { id: 'BOOKLETS', label: 'المذكرات والملازم الدراسية', icon: BookOpen, className: 'sm:w-56' },
    { id: 'MATRIX', label: 'سجل المدفوعات الشامل (جديد)', icon: FileSpreadsheet, className: 'sm:w-64' },
  ];

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
      {tabs.map(({ id, label, icon: Icon, className }) => (
        <Button
          key={id}
          variant={activeTab === id ? 'primary' : 'outline'}
          onClick={() => onChange(id)}
          className={`flex-1 rounded-xl sm:flex-none sm:w-48 ${className || ''} ${activeTab === id ? 'shadow-md shadow-primary-500/20' : ''}`}
        >
          <Icon className="ml-2 h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}
