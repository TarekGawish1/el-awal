'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import { Button, Input, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { useAuth } from '../hooks/useAuth';
import { LoginCredentials } from '../types/auth.types';

export interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading, isError, error, resetError } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  const validateForm = (): boolean => {
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isError) {
      resetError();
    }

    if (!validateForm()) {
      return;
    }

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

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full" noValidate aria-label="نموذج تسجيل الدخول">
      {/* 1. Global API Error Banner */}
      {isError && error && (
        <Alert variant="error" className="animate-in fade-in-50 duration-200">
          <AlertCircle className="w-5 h-5 text-error-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-sm font-bold text-error-800">تعذر تسجيل الدخول</AlertTitle>
            <AlertDescription className="text-xs text-error-700">{error}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* 2. Identifier Input (Email / Phone) */}
      <Input
        id="login-identifier"
        name="identifier"
        type="text"
        label="كود الطالب أو رقم الهاتف"
        placeholder="STU-2026-00048 أو 01012345678"
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

      {/* 3. Password Input with Show/Hide Toggle */}
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

      {/* 4. Submit Button */}
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
