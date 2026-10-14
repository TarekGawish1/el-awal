'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn, MessageSquare, Phone, RotateCcw, ArrowRight } from 'lucide-react';
import { Button, Input, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { useAuth, normalizeAuthErrorMessage } from '../hooks/useAuth';
import { LoginCredentials } from '../types/auth.types';
import { ForgotPasswordModal } from './ForgotPasswordModal';

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
  const [showPassword, setShowPassword] = useState(false);
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
        <form onSubmit={handlePasswordSubmit} className="space-y-4 w-full" noValidate aria-label="نموذج تسجيل الدخول بكلمة المرور">
          {/* Global API Error */}
          {isError && error && (
            <Alert variant="error" className="animate-in fade-in-50 duration-200">
              <AlertCircle className="w-4 h-4 text-error-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <AlertTitle className="text-xs font-bold text-error-800">تعذر تسجيل الدخول</AlertTitle>
                <AlertDescription className="text-xs text-error-700">{error}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Identifier Input */}
          <Input
            id="login-identifier"
            name="identifier"
            type="text"
            label="كود الطالب أو رقم الهاتف"
            placeholder="أدخل كود الطالب أو رقم الهاتف المسجل"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (fieldErrors.identifier) {
                setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
              }
              if (isError) resetError();
            }}
            error={fieldErrors.identifier}
            disabled={isLoading}
            required
            autoComplete="username"
            autoFocus
            startIcon={<Mail className="w-4 h-4" />}
          />

          {/* Password Input */}
          <div className="space-y-1">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="كلمة المرور"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
                if (isError) resetError();
              }}
              error={fieldErrors.password}
              disabled={isLoading}
              required
              autoComplete="current-password"
              startIcon={<Lock className="w-4 h-4" />}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={0}
                  disabled={isLoading}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            {/* Forgot Password Link */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading}
            className="w-full font-bold shadow-sm mt-2"
            aria-label="تسجيل الدخول"
          >
            <LogIn className="w-4 h-4 me-2" />
            <span>تسجيل الدخول</span>
          </Button>
        </form>
      )}

      {/* 3. WHATSAPP OTP LOGIN FORM */}
      {authMode === 'OTP' && (
        <div className="space-y-4 w-full">
          {/* OTP Error Banner */}
          {(otpRequestError || (isOtpError && otpError)) && (
            <Alert variant="error" className="animate-in fade-in-50 duration-200">
              <AlertCircle className="w-4 h-4 text-error-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <AlertDescription className="text-xs font-semibold text-error-800">
                  {otpRequestError || otpError}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {otpStep === 'PHONE' ? (
            /* Step 1: Input Phone to request code */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-xs text-neutral-600 leading-relaxed">
                سجل الدخول فوراً بدون كلمة سر! أدخل رقم هاتفك المسجل وسنرسل لك رمز تحقق مباشر على تطبيق الواتساب.
              </p>

              <Input
                id="otp-phone-input"
                name="phone"
                type="tel"
                label="رقم الهاتف المسجل (واتساب)"
                placeholder="010XXXXXXXX"
                value={otpPhone}
                onChange={(e) => {
                  setOtpPhone(e.target.value);
                  if (otpRequestError) setOtpRequestError(null);
                }}
                disabled={isRequestingOtp}
                required
                autoFocus
                dir="ltr"
                startIcon={<Phone className="w-4 h-4" />}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isRequestingOtp}
                disabled={isRequestingOtp}
                className="w-full font-bold shadow-sm mt-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
              >
                <MessageSquare className="w-4 h-4 me-2 text-emerald-200" />
                <span>إرسال كود الدخول عبر واتساب</span>
              </Button>
            </form>
          ) : (
            /* Step 2: Input 6-Digit OTP */
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200/70 rounded-2xl flex items-start gap-2.5">
                <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-neutral-700 leading-relaxed">
                  تم إرسال كود مكون من 6 أرقام إلى واتساب الرقم:{' '}
                  <span className="font-mono font-bold text-neutral-900 dir-ltr inline-block">{otpPhone}</span>
                </div>
              </div>

              <div>
                <label htmlFor="otp-code-input" className="block text-xs font-bold text-neutral-700 mb-1.5">
                  أدخل رمز التحقق (6 أرقام)
                </label>
                <input
                  id="otp-code-input"
                  name="code"
                  type="text"
                  maxLength={6}
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOtpCode(val);
                    if (otpRequestError) setOtpRequestError(null);
                    if (isOtpError) resetOtpError();
                  }}
                  disabled={isOtpLoading}
                  required
                  autoFocus
                  dir="ltr"
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] font-extrabold py-3 px-4 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>

              {/* Resend & Change Phone Actions */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep('PHONE');
                    setOtpCode('');
                    if (otpRequestError) setOtpRequestError(null);
                  }}
                  className="font-medium text-neutral-500 hover:text-neutral-800 transition-colors"
                >
                  ← تغيير رقم الهاتف
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestOtp()}
                  disabled={isRequestingOtp || otpCooldown > 0}
                  className="font-bold text-emerald-600 hover:text-emerald-700 disabled:text-neutral-400 transition-colors"
                >
                  {otpCooldown > 0 ? `إعادة الإرسال بعد (${otpCooldown}) ث` : 'إعادة إرسال الكود'}
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isOtpLoading}
                disabled={isOtpLoading || otpCode.length !== 6}
                className="w-full font-bold shadow-sm mt-2 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
              >
                <span>تأكيد وتسجيل الدخول</span>
              </Button>
            </form>
          )}
        </div>
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
