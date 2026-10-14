'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GraduationCap, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent, Button, Input, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { confirmPasswordReset } from '../api/auth.api';
import { normalizeAuthErrorMessage } from '../hooks/useAuth';

export function ResetPasswordContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validate = (): boolean => {
    const errors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      errors.password = 'يرجى إدخال كلمة المرور الجديدة';
    } else if (password.length < 6) {
      errors.password = 'يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'يرجى تأكيد كلمة المرور';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('رابط استعادة كلمة المرور غير صالح أو مفقود');
      return;
    }

    if (!validate()) return;

    setIsLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(token, password);
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(normalizeAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-start">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-primary-600 text-white rounded-2xl shadow-md ring-4 ring-primary-100 animate-in zoom-in-95 duration-200">
            <GraduationCap className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              منصة الأول التعليمية
            </h1>
            <p className="text-xs sm:text-sm font-medium text-neutral-500">
              استعادة وتعيين كلمة المرور الجديدة
            </p>
          </div>
        </div>

        {/* Card */}
        <Card className="shadow-sm border-neutral-200/90 bg-white rounded-2xl sm:rounded-3xl">
          <CardContent className="p-5 sm:p-8 space-y-5">
            {!token ? (
              /* Missing Token Error */
              <div className="space-y-4 py-2">
                <Alert variant="error">
                  <AlertCircle className="w-5 h-5 text-error-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <AlertTitle className="text-sm font-bold text-error-800">رابط غير صالح</AlertTitle>
                    <AlertDescription className="text-xs text-error-700">
                      لم يتم العثور على رمز الاستعادة في هذا الرابط. يرجى طلب رابط جديد من صفحة تسجيل الدخول.
                    </AlertDescription>
                  </div>
                </Alert>

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => router.push('/login')}
                  className="w-full font-bold shadow-sm"
                >
                  الذهاب إلى تسجيل الدخول
                </Button>
              </div>
            ) : isSuccess ? (
              /* Success View */
              <div className="py-4 text-center space-y-5 animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-neutral-900">تم تغيير كلمة المرور بنجاح!</h2>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-xs mx-auto">
                    تم تحديث كلمة المرور لحسابك. يمكنك الآن تسجيل الدخول مباشرة بكلمة المرور الجديدة.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => router.push('/login')}
                  className="w-full font-bold shadow-sm"
                >
                  تسجيل الدخول الآن
                </Button>
              </div>
            ) : (
              /* Password Reset Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-start mb-2">
                  <h2 className="text-base font-bold text-neutral-900">تعيين كلمة المرور الجديدة</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    اختر كلمة مرور قوية تتكون من 6 أحرف أو أرقام على الأقل
                  </p>
                </div>

                {error && (
                  <Alert variant="error" className="animate-in fade-in-50 duration-200">
                    <AlertCircle className="w-4 h-4 text-error-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <AlertDescription className="text-xs font-semibold text-error-800">{error}</AlertDescription>
                    </div>
                  </Alert>
                )}

                {/* New Password Input */}
                <Input
                  id="reset-new-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  label="كلمة المرور الجديدة"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    if (error) setError(null);
                  }}
                  error={fieldErrors.password}
                  disabled={isLoading}
                  required
                  autoFocus
                  startIcon={<Lock className="w-4 h-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                {/* Confirm Password Input */}
                <Input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="تأكيد كلمة المرور الجديدة"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                    if (error) setError(null);
                  }}
                  error={fieldErrors.confirmPassword}
                  disabled={isLoading}
                  required
                  startIcon={<Lock className="w-4 h-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                      aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  disabled={isLoading}
                  className="w-full font-bold shadow-sm mt-3"
                >
                  <span>حفظ وتحديث كلمة المرور</span>
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="text-xs font-medium text-neutral-500 hover:text-primary-600 transition-colors"
                  >
                    ← العودة لصفحة تسجيل الدخول
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-[11px] text-neutral-400">
            جميع الحقوق محفوظة © {new Date().getFullYear()} منصة الأول لإدارة التعليم
          </p>
        </div>
      </div>
    </div>
  );
}
