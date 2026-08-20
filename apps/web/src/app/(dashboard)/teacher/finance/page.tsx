import { Suspense } from 'react';
import { Metadata } from 'next';
import { FinanceDashboard } from '@/features/finance/components/FinanceDashboard';

export const metadata: Metadata = {
  title: 'المصروفات والماليات | منصة الأول',
  description: 'إدارة مصروفات الطلاب والمجموعات التعليمية',
};

export default function FinancePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">جاري تحميل لوحة المصروفات...</div>}>
        <FinanceDashboard />
      </Suspense>
    </div>
  );
}

