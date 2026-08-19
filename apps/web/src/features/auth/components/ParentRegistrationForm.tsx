'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Phone, UserRoundPlus } from 'lucide-react';
import { Button, Input } from '@/components/ui';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, '').trim();
}

export function ParentRegistrationForm() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setError('يرجى إدخال رقم الهاتف');
      return;
    }

    if (!EGYPTIAN_PHONE_REGEX.test(normalizedPhone)) {
      setError('يرجى إدخال رقم هاتف مصري صحيح مثل 01012345678');
      return;
    }

    setError(undefined);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="space-y-5 text-center" role="status" aria-live="polite">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-neutral-900">تم استلام رقم الهاتف</h2>
          <p className="text-xs leading-6 text-neutral-500">
            سيتم التحقق من الرقم قبل استكمال تسجيل حساب ولي الأمر.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          العودة إلى تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-label="نموذج تسجيل ولي الأمر">
      <Input
        id="parent-registration-phone"
        name="phone"
        type="tel"
        label="رقم الهاتف"
        placeholder="01012345678"
        value={phone}
        onChange={(event) => {
          setPhone(event.target.value);
          if (error) setError(undefined);
        }}
        error={error}
        helperText="استخدم رقم الهاتف المرتبط ببيانات الطالب"
        required
        autoComplete="tel"
        autoFocus
        inputMode="tel"
        dir="ltr"
        startIcon={<Phone className="h-4 w-4" />}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="mt-2 w-full font-bold shadow-sm"
        aria-label="متابعة تسجيل ولي الأمر"
      >
        <UserRoundPlus className="me-2 h-4 w-4" />
        <span>متابعة التسجيل</span>
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        <span>العودة إلى تسجيل الدخول</span>
      </Link>
    </form>
  );
}
