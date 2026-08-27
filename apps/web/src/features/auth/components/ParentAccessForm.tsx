'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Phone, UserRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Input } from '@/components/ui';
import { useParentAccess } from '../hooks/useParentAccess';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, '').trim();
}

export function ParentAccessForm() {
  const [identifier, setIdentifier] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const { accessParent, isLoading, isError, error, resetError } = useParentAccess();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = normalizePhone(identifier);
    if (!normalized) {
      setFieldError('يرجى إدخال رقم الهاتف أو كود الطالب');
      return;
    }

    // Allow Egyptian phone numbers or alphanumeric student codes (e.g. STU202600057)
    const isPhone = EGYPTIAN_PHONE_REGEX.test(normalized);
    const isStudentCode = /^[a-zA-Z0-9_-]{3,30}$/.test(normalized);

    if (!isPhone && !isStudentCode) {
      setFieldError('يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678) أو كود الطالب');
      return;
    }

    setFieldError(undefined);
    accessParent(normalized);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-label="نموذج دخول ولي الأمر">
      {isError && error && (
        <Alert variant="error" className="animate-in fade-in-50 duration-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
          <div className="flex-1">
            <AlertTitle className="text-sm font-bold text-error-800">تعذر الدخول</AlertTitle>
            <AlertDescription className="text-xs text-error-700">{error}</AlertDescription>
          </div>
        </Alert>
      )}

      <Input
        id="parent-access-phone"
        name="phone"
        type="text"
        label="رقم الهاتف أو كود الطالب"
        placeholder="01012345678 أو STU202600057"
        value={identifier}
        onChange={(event) => {
          setIdentifier(event.target.value);
          if (fieldError) setFieldError(undefined);
          if (isError) resetError();
        }}
        error={fieldError}
        helperText="أدخل رقم هاتف الطالب أو رقم ولي الأمر أو كود الطالب"
        required
        autoComplete="username"
        autoFocus
        dir="ltr"
        startIcon={<Phone className="h-4 w-4" />}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="mt-2 w-full font-bold shadow-sm"
        aria-label="متابعة دخول ولي الأمر"
      >
        <UserRound className="me-2 h-4 w-4" />
        <span>متابعة</span>
      </Button>

      <Link
        href="/"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        <span>العودة إلي الصفحة الرئيسية</span>
      </Link>
    </form>
  );
}
