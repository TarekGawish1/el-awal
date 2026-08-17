import { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginContainer } from '@/features/auth';

export const metadata: Metadata = {
  title: 'تسجيل الدخول | منصة الأول التعليمية',
  description: 'بوابة تسجيل الدخول الموحدة للمدرسين والطلاب وأولياء الأمور والسكرتارية في منصة الأول التعليمية',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-500">جاري التحميل...</div>}>
      <LoginContainer />
    </Suspense>
  );
}
