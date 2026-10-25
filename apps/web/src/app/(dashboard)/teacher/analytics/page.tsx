import { Metadata } from 'next';
import { Suspense } from 'react';
import { AnalyticsDashboard } from '@/features/analytics';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = {
  title: 'إحصائيات المنصة والزوار | بوابة المدرس - منصة الأول',
  description: 'تتبع الزيارات الإجمالية والزوار الفريدين للموقع التعريفي وبوابة النظام وتوزيع الأجهزة والمشاهدات',
};

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-xs flex justify-between items-center">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-xs space-y-3">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsLoadingSkeleton />}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
