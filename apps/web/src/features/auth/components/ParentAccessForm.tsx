'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Phone, UserRound } from 'lucide-react';
import { Button, Input } from '@/components/ui';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, '').trim();
}

export interface ParentAccessFormProps {
  onSubmit?: (studentPhone: string) => void;
}

export function ParentAccessForm({ onSubmit }: ParentAccessFormProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setError('يرجى إدخال رقم هاتف الطالب');
      return;
    }

    if (!EGYPTIAN_PHONE_REGEX.test(normalizedPhone)) {
      setError('يرجى إدخال رقم هاتف مصري صحيح مثل 01012345678');
      return;
    }

    setError(undefined);
    onSubmit?.(normalizedPhone);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-label="نموذج تسجيل ولي الأمر">
      <Input
        id="parent-access-phone"
        name="phone"
        type="tel"
        label="رقم هاتف الطالب المسجل"
        placeholder="01012345678"
        value={phone}
        onChange={(event) => {
          setPhone(event.target.value);
          if (error) setError(undefined);
        }}
        error={error}
        helperText="أدخل رقم هاتف الطالب الذي سجلته الإدارة مسبقًا"
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
        aria-label="متابعة دخول ولي الأمر"
      >
        <UserRound className="me-2 h-4 w-4" />
        <span>متابعة</span>
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
