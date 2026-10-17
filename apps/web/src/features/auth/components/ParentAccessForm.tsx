'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  Lock,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useParentAccess } from '../hooks/useParentAccess';
import { useAuth, normalizeAuthErrorMessage } from '../hooks/useAuth';
import { useAuthStore } from '../store/auth.store';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { ParentPasswordLoginForm } from './parent-access/ParentPasswordLoginForm';
import { ParentOtpLoginForm } from './parent-access/ParentOtpLoginForm';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|20|0)?1[0125]\d{8}$/;

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, '').trim();
}

export function ParentAccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isInitialized } = useAuthStore();

  // Mode: standard password login vs WhatsApp OTP
  const [authMode, setAuthMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');

  // Password login states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const { accessParent, isLoading, isError, error, resetError } = useParentAccess();

  // WhatsApp OTP states
  const {
    loginWithOtp,
    isOtpLoading,
    isOtpError,
    otpError,
    resetOtpError,
    requestLoginOtp,
  } = useAuth();
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'PHONE' | 'CODE'>('PHONE');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [otpRequestError, setOtpRequestError] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Forgot Password modal state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const autoLoginAttempted = useRef(false);

  // OTP Cooldown countdown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // If already authenticated as PARENT and no new credentials in query, redirect to dashboard
  useEffect(() => {
    const hasExplicitCredentials =
      searchParams?.get('phone') ||
      searchParams?.get('studentPhone') ||
      searchParams?.get('code') ||
      searchParams?.get('studentCode');

    if (!hasExplicitCredentials && isInitialized && isAuthenticated && user?.role === 'PARENT') {
      router.replace('/parent/dashboard');
    }
  }, [isInitialized, isAuthenticated, user, router, searchParams]);

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
      searchParams?.get('pin') ||
      searchParams?.get('token') ||
      searchParams?.get('key');

    if (queryPhone) {
      const normalizedPhone = normalizePhone(queryPhone);
      setIdentifier(normalizedPhone);
      setOtpPhone(normalizedPhone);

      if (queryPass && normalizedPhone) {
        autoLoginAttempted.current = true;
        setPassword(queryPass);
        accessParent({ studentPhone: normalizedPhone, password: queryPass });
      }
    }
  }, [searchParams, accessParent]);

  const handlePasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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

  const handleRequestOtp = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    const target = normalizePhone(otpPhone || identifier);
    if (!target) {
      setOtpRequestError('يرجى إدخال رقم الهاتف أو كود الطالب المسجل');
      return;
    }

    setIsRequestingOtp(true);
    setOtpRequestError(null);
    if (isOtpError) resetOtpError();

    try {
      const res = await requestLoginOtp(target, 'PARENT');
      setOtpStep('CODE');
      setOtpCooldown(res.cooldownSeconds || 60);
    } catch (err: unknown) {
      setOtpRequestError(normalizeAuthErrorMessage(err));
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtpSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isOtpError) resetOtpError();

    const target = normalizePhone(otpPhone || identifier);
    const trimmedCode = otpCode.trim();

    if (!trimmedCode || trimmedCode.length !== 6) {
      setOtpRequestError('رمز التحقق يجب أن يتكون من 6 أرقام');
      return;
    }

    setOtpRequestError(null);
    loginWithOtp({
      phone: target,
      code: trimmedCode,
      role: 'PARENT',
    });
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
    <div className="w-full space-y-5 text-start">
      {/* 1. Mode Switcher Tabs */}
      <div className="flex p-1 bg-neutral-100 rounded-2xl border border-neutral-200/80">
        <button
          type="button"
          onClick={() => {
            setAuthMode('PASSWORD');
            if (isError) resetError();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            authMode === 'PASSWORD'
              ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/60'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Lock className="w-4 h-4 text-primary-600" />
          <span>كلمة المرور</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthMode('OTP');
            if (isOtpError) resetOtpError();
            if (identifier && !otpPhone) setOtpPhone(identifier);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            authMode === 'OTP'
              ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/60'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>رمز الواتساب (OTP)</span>
        </button>
      </div>

      {/* 2. PASSWORD LOGIN FORM */}
      {authMode === 'PASSWORD' && (
        <ParentPasswordLoginForm
          identifier={identifier}
          onIdentifierChange={(val) => {
            setIdentifier(val);
            setOtpPhone(val);
            if (fieldErrors.identifier) setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
            if (isError) resetError();
          }}
          password={password}
          onPasswordChange={(val) => {
            setPassword(val);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            if (isError) resetError();
          }}
          fieldErrors={fieldErrors}
          onSubmit={handlePasswordSubmit}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
        />
      )}

      {/* 3. WHATSAPP OTP LOGIN FORM */}
      {authMode === 'OTP' && (
        <ParentOtpLoginForm
          otpStep={otpStep}
          onOtpStepChange={setOtpStep}
          otpPhone={otpPhone}
          onOtpPhoneChange={(val) => {
            setOtpPhone(val);
            setIdentifier(val);
            if (otpRequestError) setOtpRequestError(null);
            if (isOtpError) resetOtpError();
          }}
          otpCode={otpCode}
          onOtpCodeChange={(val) => {
            setOtpCode(val);
            if (otpRequestError) setOtpRequestError(null);
            if (isOtpError) resetOtpError();
          }}
          onRequestOtp={handleRequestOtp}
          onVerifyOtp={handleVerifyOtpSubmit}
          isRequestingOtp={isRequestingOtp}
          isOtpLoading={isOtpLoading}
          isOtpError={isOtpError}
          otpError={otpError}
          otpRequestError={otpRequestError}
          otpCooldown={otpCooldown}
        />
      )}

      {/* Return to main login */}
      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 pt-1"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        <span>العودة لصفحة تسجيل الدخول</span>
      </Link>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialPhone={identifier || otpPhone}
        role="PARENT"
      />
    </div>
  );
}
