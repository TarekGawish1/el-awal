'use client';

import React from 'react';
import {
  AlertCircle,
  KeyRound,
  MessageSquare,
  Phone,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Input } from '@/components/ui';

interface ParentOtpLoginFormProps {
  otpStep: 'PHONE' | 'CODE';
  onOtpStepChange: (step: 'PHONE' | 'CODE') => void;
  otpPhone: string;
  onOtpPhoneChange: (val: string) => void;
  otpCode: string;
  onOtpCodeChange: (val: string) => void;
  onRequestOtp: (e?: React.FormEvent) => void;
  onVerifyOtp: (e: React.FormEvent) => void;
  isRequestingOtp: boolean;
  isOtpLoading: boolean;
  isOtpError: boolean;
  otpError: string | null;
  otpRequestError: string | null;
  otpCooldown: number;
}

export function ParentOtpLoginForm({
  otpStep,
  onOtpStepChange,
  otpPhone,
  onOtpPhoneChange,
  otpCode,
  onOtpCodeChange,
  onRequestOtp,
  onVerifyOtp,
  isRequestingOtp,
  isOtpLoading,
  isOtpError,
  otpError,
  otpRequestError,
  otpCooldown,
}: ParentOtpLoginFormProps) {
  return (
    <div className="space-y-4">
      {(isOtpError || otpRequestError) && (
        <Alert variant="error" className="animate-in fade-in-50 duration-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
          <div className="flex-1">
            <AlertTitle className="text-sm font-bold text-error-800">تعذر التحقق</AlertTitle>
            <AlertDescription className="text-xs text-error-700">
              {otpRequestError || otpError}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {otpStep === 'PHONE' ? (
        <form onSubmit={onRequestOtp} className="space-y-4" noValidate>
          <Input
            id="parent-otp-phone"
            name="otpPhone"
            type="text"
            label="رقم الهاتف أو كود الطالب"
            placeholder="أدخل رقم الهاتف أو كود الطالب المسجل"
            value={otpPhone}
            onChange={(e) => onOtpPhoneChange(e.target.value)}
            disabled={isRequestingOtp}
            required
            autoComplete="tel"
            autoFocus
            dir="ltr"
            startIcon={<Phone className="w-4 h-4" />}
            helperText="سيتم إرسال رمز تحقق مكوّن من 6 أرقام إلى حساب الواتساب المسجل"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isRequestingOtp}
            disabled={isRequestingOtp}
            className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm mt-2"
          >
            <MessageSquare className="w-4 h-4 me-2" />
            <span>إرسال رمز التحقق عبر واتساب</span>
          </Button>
        </form>
      ) : (
        <form onSubmit={onVerifyOtp} className="space-y-4 animate-in fade-in-50 duration-200" noValidate>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                تم إرسال رمز التحقق إلى: <strong className="font-mono">{otpPhone}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onOtpStepChange('PHONE');
                onOtpCodeChange('');
              }}
              className="font-bold text-emerald-700 underline hover:text-emerald-900 cursor-pointer"
            >
              تغيير
            </button>
          </div>

          <Input
            id="parent-otp-code"
            name="otpCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            label="رمز التحقق (OTP)"
            placeholder="••••••"
            value={otpCode}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
              onOtpCodeChange(cleaned);
            }}
            disabled={isOtpLoading}
            required
            autoFocus
            dir="ltr"
            startIcon={<KeyRound className="w-4 h-4" />}
            className="text-center font-mono text-lg tracking-[0.3em]"
            helperText="أدخل الرمز المكون من 6 أرقام المستلم على واتساب"
          />

          <div className="flex items-center justify-between text-xs pt-1">
            {otpCooldown > 0 ? (
              <span className="text-neutral-500 font-medium">
                إعادة إرسال الرمز خلال ({otpCooldown}) ثانية
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onRequestOtp()}
                disabled={isRequestingOtp}
                className="flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة إرسال الرمز عبر واتساب</span>
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isOtpLoading}
            disabled={isOtpLoading || otpCode.length !== 6}
            className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm mt-2"
          >
            <ShieldCheck className="w-4 h-4 me-2" />
            <span>تأكيد ودخول ولي الأمر</span>
          </Button>
        </form>
      )}
    </div>
  );
}
