'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import { Button, Input, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { LoginCredentials } from '../../types/auth.types';

export interface PasswordLoginFormProps {
  identifier: string;
  setIdentifier: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  resetError: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  fieldErrors: { identifier?: string; password?: string };
  setFieldErrors: React.Dispatch<React.SetStateAction<{ identifier?: string; password?: string }>>;
  onOpenForgotPassword: () => void;
}

export function PasswordLoginForm({
  identifier,
  setIdentifier,
  password,
  setPassword,
  isLoading,
  isError,
  error,
  resetError,
  onSubmit,
  fieldErrors,
  setFieldErrors,
  onOpenForgotPassword,
}: PasswordLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-4 w-full" noValidate aria-label="نموذج تسجيل الدخول بكلمة المرور">
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
            onClick={onOpenForgotPassword}
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
  );
}
