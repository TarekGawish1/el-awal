'use client';

import React, { useState, useEffect } from 'react';
import { Lock, MessageSquare } from 'lucide-react';
import { useAuth, normalizeAuthErrorMessage } from '../hooks/useAuth';
import { LoginCredentials } from '../types/auth.types';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { PasswordLoginForm } from './login/PasswordLoginForm';
import { OtpLoginForm } from './login/OtpLoginForm';

export interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const {
    login,
    isLoading,
    isError,
    error,
    resetError,
    loginWithOtp,
    isOtpLoading,
    isOtpError,
    otpError,
    resetOtpError,
    requestLoginOtp,
  } = useAuth();

  // Mode: standard password login vs WhatsApp OTP
  const [authMode, setAuthMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');

  // Standard login states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  // WhatsApp OTP states
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'PHONE' | 'CODE'>('PHONE');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [otpRequestError, setOtpRequestError] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Forgot password modal
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // OTP Cooldown Timer countdown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const validatePasswordForm = (): boolean => {
    const errors: { identifier?: string; password?: string } = {};
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier) {
      errors.identifier = 'يرجى إدخال كود الطالب أو رقم الهاتف';
    }

    if (!password) {
      errors.password = 'يرجى إدخال كلمة المرور';
    } else if (password.length < 6) {
      errors.password = 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isError) resetError();

    if (!validatePasswordForm()) return;

    const credentials: LoginCredentials = {
      identifier: identifier.trim(),
      password,
    };

    login(credentials, {
      onSuccess: () => {
        if (onSuccess) onSuccess();
      },
    });
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = otpPhone.trim();
    if (!trimmed) {
      setOtpRequestError('يرجى إدخال رقم الهاتف المسجل');
      return;
    }

    setIsRequestingOtp(true);
    setOtpRequestError(null);
    if (isOtpError) resetOtpError();

    try {
      const res = await requestLoginOtp(trimmed);
      setOtpStep('CODE');
      setOtpCooldown(res.cooldownSeconds || 60);
    } catch (err: unknown) {
      setOtpRequestError(normalizeAuthErrorMessage(err));
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOtpError) resetOtpError();

    const trimmedCode = otpCode.trim();
    if (!trimmedCode || trimmedCode.length !== 6) {
      setOtpRequestError('رمز التحقق يجب أن يتكون من 6 أرقام');
      return;
    }

    loginWithOtp(
      { phone: otpPhone.trim(), code: trimmedCode },
      {
        onSuccess: () => {
          if (onSuccess) onSuccess();
        },
      },
    );
  };

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
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
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
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            authMode === 'OTP'
              ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/60'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>رمز الواتساب</span>
        </button>
      </div>

      {/* 2. PASSWORD LOGIN FORM */}
      {authMode === 'PASSWORD' && (
        <PasswordLoginForm
          identifier={identifier}
          setIdentifier={setIdentifier}
          password={password}
          setPassword={setPassword}
          isLoading={isLoading}
          isError={isError}
          error={error}
          resetError={resetError}
          onSubmit={handlePasswordSubmit}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
        />
      )}

      {/* 3. WHATSAPP OTP LOGIN FORM */}
      {authMode === 'OTP' && (
        <OtpLoginForm
          otpStep={otpStep}
          setOtpStep={setOtpStep}
          otpPhone={otpPhone}
          setOtpPhone={setOtpPhone}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          isRequestingOtp={isRequestingOtp}
          otpRequestError={otpRequestError}
          setOtpRequestError={setOtpRequestError}
          isOtpError={isOtpError}
          otpError={otpError}
          resetOtpError={resetOtpError}
          isOtpLoading={isOtpLoading}
          otpCooldown={otpCooldown}
          onRequestOtp={handleRequestOtp}
          onVerifyOtpSubmit={handleVerifyOtpSubmit}
        />
      )}

      {/* 4. Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialPhone={identifier}
      />
    </div>
  );
}
