'use client';

import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { GroupRegistrationForm } from './GroupRegistrationForm';

export function GroupInviteRegistrationView() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  if (!token) {
    return (
      <div className="space-y-3 text-center" aria-live="polite">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-error-50 ring-8 ring-error-50/60">
          <AlertCircle className="h-11 w-11 text-error-600" />
        </div>
        <h3 className="text-xl font-extrabold text-neutral-900">رابط التسجيل غير مكتمل</h3>
        <p className="text-sm text-neutral-500">
          يرجى استخدام رابط التسجيل الذي أرسله لك المدرس للانضمام إلى المجموعة.
        </p>
      </div>
    );
  }

  return <GroupRegistrationForm token={token} />;
}
