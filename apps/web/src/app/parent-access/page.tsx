import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { ParentAccessForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'دخول ولي الأمر | منصة الأول التعليمية',
  description: 'دخول ولي الأمر باستخدام رقم هاتف الطالب المسجل في منصة الأول التعليمية',
};

export default function ParentAccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-neutral-50 text-sm text-neutral-500">جاري التحميل...</div>}>
      <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3 text-center">
            <div className="inline-flex animate-in rounded-2xl bg-primary-600 p-3 text-white shadow-md ring-4 ring-primary-100 zoom-in-95 duration-200">
              <GraduationCap className="h-9 w-9" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">منصة الأول التعليمية</h1>
              <p className="mx-auto max-w-xs text-xs font-medium text-neutral-500 sm:text-sm">
                تابع تقدم أبنائك واطّلع على مستواهم الأكاديمي بسهولة
              </p>
            </div>
          </div>

          <Card className="border-neutral-200/90 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 text-start">
                <h2 className="text-base font-bold text-neutral-900">دخول ولي الأمر</h2>
                <p className="mt-0.5 text-xs text-neutral-500">أدخل رقم هاتف الطالب المسجل لدى الإدارة</p>
              </div>
              <ParentAccessForm />
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-500">
            <ShieldCheck className="h-4 w-4 text-primary-600" />
            <span>بياناتك محفوظة وآمنة</span>
          </div>
        </div>
      </main>
    </Suspense>
  );
}
