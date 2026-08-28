'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowRight, KeyRound, Loader2, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Input } from '@/components/ui';
import { useParentAccess } from '../hooks/useParentAccess';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, '').trim();
}

export function ParentAccessForm() {
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const { accessParent, isLoading, isError, error, resetError } = useParentAccess();
  const autoLoginAttempted = useRef(false);

  // Auto-login if phone AND password are both present in URL search params (from secure WhatsApp direct link)
  useEffect(() => {
    if (autoLoginAttempted.current) return;

    const queryPhone =
      searchParams?.get('phone') ||
      searchParams?.get('p') ||
      searchParams?.get('studentPhone') ||
      searchParams?.get('studentCode') ||
      searchParams?.get('code') ||
      searchParams?.get('id');

    const queryPass =
      searchParams?.get('pass') ||
      searchParams?.get('password') ||
      searchParams?.get('pwd') ||
      searchParams?.get('key');

    if (queryPhone) {
      const normalizedPhone = normalizePhone(queryPhone);
      setIdentifier(normalizedPhone);

      if (queryPass && normalizedPhone) {
        autoLoginAttempted.current = true;
        setPassword(queryPass);
        accessParent({ studentPhone: normalizedPhone, password: queryPass });
      }
    }
  }, [searchParams, accessParent]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = normalizePhone(identifier);
    const trimmedPass = password.trim();
    const newErrors: { identifier?: string; password?: string } = {};

    if (!normalized) {
      newErrors.identifier = 'يرجى إدخال رقم الهاتف أو كود الطالب';
    } else {
      const isPhone = EGYPTIAN_PHONE_REGEX.test(normalized);
      const isStudentCode = /^[a-zA-Z0-9_-]{3,30}$/.test(normalized);
      if (!isPhone && !isStudentCode) {
        newErrors.identifier = 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678) أو كود الطالب';
      }
    }

    if (!trimmedPass) {
      newErrors.password = 'يرجى إدخال كلمة المرور';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({});
    accessParent({ studentPhone: normalized, password: trimmedPass });
  };

  // If auto-logging in with secure direct magic link, render smooth auto-redirect screen
  if (isLoading && !isError && autoLoginAttempted.current) {
    return (
      <div className="py-6 text-center space-y-4 animate-in fade-in-50 duration-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-base font-bold text-neutral-900">
            <span>جاري التحقق وتسجيل دخول ولي الأمر بأمان...</span>
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-xs text-neutral-500">يرجى الانتظار لحظات، جاري تحويلك إلى لوحة متابعة الطالب 📲</p>
        </div>
      </div>
    );
  }

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
          if (fieldErrors.identifier) setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
          if (isError) resetError();
        }}
        error={fieldErrors.identifier}
        helperText="أدخل رقم هاتف الحساب أو رقم الطالب"
        required
        autoComplete="username"
        autoFocus={!identifier}
        dir="ltr"
        startIcon={<Phone className="h-4 w-4" />}
      />

      <Input
        id="parent-access-password"
        name="password"
        type="password"
        label="كلمة المرور"
        placeholder="••••••••"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
          if (isError) resetError();
        }}
        error={fieldErrors.password}
        helperText="كلمة المرور المستلمة في رسالة الواتساب أو الخاصة بالحساب"
        required
        autoComplete="current-password"
        autoFocus={Boolean(identifier)}
        dir="ltr"
        startIcon={<KeyRound className="h-4 w-4" />}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="mt-2 w-full font-bold shadow-sm"
        aria-label="دخول ولي الأمر"
      >
        <UserRound className="me-2 h-4 w-4" />
        <span>دخول ولي الأمر</span>
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        <span>العودة لصفحة تسجيل الدخول</span>
      </Link>
    </form>
  );
}
