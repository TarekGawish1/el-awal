import { Metadata } from 'next';
import { Suspense } from 'react';
import { AnalyticsDashboard } from '@/features/analytics';

export const metadata: Metadata = {
  title: 'إحصائيات المنصة والزوار | بوابة المدرس - منصة الأول',
  description: 'تتبع الزيارات الإجمالية والزوار الفريدين للموقع التعريفي وبوابة النظام وتوزيع الأجهزة والمشاهدات',
};

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">جاري تحميل إحصائيات المنصة...</div>}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
