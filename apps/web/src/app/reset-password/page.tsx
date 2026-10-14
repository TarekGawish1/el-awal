import { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordContainer } from '@/features/auth';

export const metadata: Metadata = {
  title: 'تعيين كلمة المرور الجديدة | منصة الأول التعليمية',
  description: 'استعادة وتعيين كلمة المرور الجديدة عبر رابط الواتساب الموثق في منصة الأول التعليمية',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-500">جاري التحميل...</div>}>
      <ResetPasswordContainer />
    </Suspense>
  );
}
