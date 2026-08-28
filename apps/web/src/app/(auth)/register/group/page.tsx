import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GraduationCap, Link2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { GroupInviteRegistrationView } from '@/features/auth';

export const metadata: Metadata = {
  title: 'التسجيل في المجموعة | منصة الأول التعليمية',
  description: 'سجّل بياناتك وانضم مباشرة إلى مجموعتك الدراسية على منصة الأول',
};

export default function GroupRegistrationPage() {
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
              <p className="mx-auto flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500 sm:text-sm">
                <Link2 className="h-3.5 w-3.5" />
                سجّل بياناتك وانضم مباشرة إلى مجموعتك الدراسية
              </p>
            </div>
          </div>

          <Card className="border-neutral-200/90 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <GroupInviteRegistrationView />
            </CardContent>
          </Card>

        </div>
      </main>
    </Suspense>
  );
}
