import { Metadata } from 'next';
import { Suspense } from 'react';
import { RoleSelectionContainer } from '@/features/auth/components/RoleSelectionContainer';

export const metadata: Metadata = {
  title: 'اختيار الدور | منصة الأول التعليمية',
  description: 'اختر الدور الذي تريد الدخول به',
};

export default function SelectRolePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-500">جاري التحميل...</div>}>
      <RoleSelectionContainer />
    </Suspense>
  );
}
