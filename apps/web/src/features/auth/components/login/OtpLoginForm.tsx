'use client';

import React from 'react';
import { MessageSquare, Phone, AlertCircle } from 'lucide-react';
import { Button, Input, Alert, AlertDescription } from '@/components/ui';

export interface OtpLoginFormProps {
  otpStep: 'PHONE' | 'CODE';
  setOtpStep: (val: 'PHONE' | 'CODE') => void;
  otpPhone: string;
  setOtpPhone: (val: string) => void;
  otpCode: string;
  setOtpCode: (val: string) => void;
  isRequestingOtp: boolean;
  otpRequestError: string | null;
  setOtpRequestError: (val: string | null) => void;
  isOtpError: boolean;
  otpError: string | null;
  resetOtpError: () => void;
  isOtpLoading: boolean;
  otpCooldown: number;
  onRequestOtp: (e?: React.FormEvent) => Promise<void>;
  onVerifyOtpSubmit: (e: React.FormEvent) => void;
}

export function OtpLoginForm({
  otpStep,
  setOtpStep,
  otpPhone,
  setOtpPhone,
  otpCode,
  setOtpCode,
  isRequestingOtp,
  otpRequestError,
  setOtpRequestError,
  isOtpError,
  otpError,
  resetOtpError,
  isOtpLoading,
  otpCooldown,
  onRequestOtp,
  onVerifyOtpSubmit,
}: OtpLoginFormProps) {
  return (
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
        <form onSubmit={onRequestOtp} className="space-y-4">
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
        <form onSubmit={onVerifyOtpSubmit} className="space-y-4">
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
              onClick={() => onRequestOtp()}
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
  );
}
