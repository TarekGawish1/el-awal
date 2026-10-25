import { Suspense } from 'react';
import { Metadata } from 'next';
import { FinanceDashboard } from '@/features/finance/components/FinanceDashboard';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = {
  title: 'المصروفات والماليات | منصة الأول',
  description: 'إدارة مصروفات الطلاب والمجموعات التعليمية',
};

function FinanceLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex justify-between items-center">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FinancePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <Suspense fallback={<FinanceLoadingSkeleton />}>
        <FinanceDashboard />
      </Suspense>
    </div>
  );
}

