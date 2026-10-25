import { Metadata } from 'next';
import { Suspense } from 'react';
import { TeacherDashboardContainer } from '@/features/dashboard';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = {
  title: 'لوحة التحكم | بوابة المدرس - منصة الأول',
  description: 'متابعة حصص اليوم ورصد الحضور الذكي ومؤشرات الأداء للطلاب والمجموعات',
};

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-xs flex justify-between items-center">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 flex flex-col gap-8">
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm space-y-4">
            <Skeleton className="h-6 w-32 rounded" />
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-12 w-48 rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-28 rounded" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm space-y-4">
            <Skeleton className="h-6 w-32 rounded" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <TeacherDashboardContainer />
    </Suspense>
  );
}
