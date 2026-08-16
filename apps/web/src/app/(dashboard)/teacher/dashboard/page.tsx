import { Metadata } from 'next';
import { Suspense } from 'react';
import { TeacherDashboardContainer } from '@/features/dashboard';

export const metadata: Metadata = {
  title: 'لوحة التحكم | بوابة المدرس - منصة الأول',
  description: 'متابعة حصص اليوم ورصد الحضور الذكي ومؤشرات الأداء للطلاب والمجموعات',
};

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">جاري تحميل لوحة التحكم...</div>}>
      <TeacherDashboardContainer />
    </Suspense>
  );
}
