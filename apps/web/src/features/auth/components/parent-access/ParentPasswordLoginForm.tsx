'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Phone,
  UserRound,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Input } from '@/components/ui';

interface ParentPasswordLoginFormProps {
  identifier: string;
  onIdentifierChange: (val: string) => void;
  password: string;
  onPasswordChange: (val: string) => void;
  fieldErrors: { identifier?: string; password?: string };
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  onOpenForgotPassword: () => void;
}

export function ParentPasswordLoginForm({
  identifier,
  onIdentifierChange,
  password,
  onPasswordChange,
  fieldErrors,
  onSubmit,
  isLoading,
  isError,
  error,
  onOpenForgotPassword,
}: ParentPasswordLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate aria-label="نموذج دخول ولي الأمر بكلمة المرور">
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
        placeholder="أدخل رقم الهاتف أو كود الطالب"
        value={identifier}
        onChange={(event) => onIdentifierChange(event.target.value)}
        error={fieldErrors.identifier}
        helperText="أدخل رقم هاتف الحساب أو رقم الطالب"
        required
        autoComplete="username"
        autoFocus={!identifier}
        dir="ltr"
        startIcon={<Phone className="h-4 w-4" />}
      />

      <div className="space-y-1">
        <Input
          id="parent-access-password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          label="كلمة المرور"
          placeholder="••••••••"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          error={fieldErrors.password}
          helperText="كلمة المرور المستلمة في رسالة الواتساب أو الخاصة بالحساب"
          required
          autoComplete="current-password"
          autoFocus={Boolean(identifier)}
          dir="ltr"
          startIcon={<KeyRound className="h-4 w-4" />}
          endIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={0}
              className="p-1 rounded text-neutral-400 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors cursor-pointer"
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
            onClick={onOpenForgotPassword}
            className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline transition-colors focus:outline-none cursor-pointer"
          >
            نسيت كلمة المرور؟
          </button>
        </div>
      </div>

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
    </form>
  );
}
