import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GraduationCap, ShieldCheck, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { StudentRegistrationForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'إنشاء حساب طالب | منصة الأول التعليمية',
  description: 'أنشئ حسابك للوصول إلى بياناتك وخدمات المنصة التعليمية',
};

export default function StudentRegistrationPage() {
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
                أنشئ حسابك للوصول إلى بياناتك وخدمات المنصة التعليمية
              </p>
            </div>
          </div>

          <Card className="border-neutral-200/90 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 text-start">
                <h2 className="flex items-center gap-2 text-base font-bold text-neutral-900">
                  <UserPlus className="h-5 w-5 text-primary-600" />
                  إنشاء حساب طالب
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  أدخل بياناتك لإنشاء حساب الطالب وحساب ولي الأمر
                </p>
              </div>
              <StudentRegistrationForm />
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-500">
            <ShieldCheck className="h-4 w-4 text-primary-600" />
            <span>بياناتك محفوظة وآمنة ولا يمكن لأي طالب آخر الوصول إليها</span>
          </div>
        </div>
      </main>
    </Suspense>
  );
}
