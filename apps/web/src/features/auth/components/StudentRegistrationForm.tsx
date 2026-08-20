'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Hash,
  KeyRound,
  Lock,
  Mail,
  Phone,
  UserPlus,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Input } from '@/components/ui';
import { useStudentRegistration } from '../hooks/useStudentRegistration';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

interface StepErrors {
  studentCode?: string;
  registrationCode?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function StudentRegistrationForm() {
  const {
    verifiedStudent,
    isVerifying,
    verifyError,
    verifyStudent,
    resetVerifyError,
    isRegistering,
    isRegistered,
    registerError,
    registerStudent,
    redirectToDashboard,
    resetFlow,
  } = useStudentRegistration();

  const [studentCode, setStudentCode] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  useEffect(() => {
    if (!isRegistered) return;
    const timer = window.setTimeout(() => {
      redirectToDashboard();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [isRegistered, redirectToDashboard]);

  // ==================== STEP 1 — Verification ====================
  const validateVerificationStep = (): boolean => {
    const errors: StepErrors = {};
    const trimmedCode = studentCode.trim();

    if (!trimmedCode) {
      errors.studentCode = 'يرجى إدخال كود الطالب';
    } else if (!/^[A-Za-z0-9-]{3,50}$/.test(trimmedCode)) {
      errors.studentCode = 'كود الطالب غير صحيح';
    }

    const trimmedActivation = registrationCode.trim();
    if (!trimmedActivation) {
      errors.registrationCode = 'يرجى إدخال كود التفعيل';
    } else if (!/^[A-Za-z0-9\s-]{6,20}$/.test(trimmedActivation)) {
      errors.registrationCode = 'كود التفعيل غير صحيح';
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleVerifySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (verifyError) resetVerifyError();

    if (!validateVerificationStep()) return;

    verifyStudent({
      studentCode: studentCode.trim(),
      registrationCode: registrationCode.trim(),
    });
  };

  // ==================== STEP 2 — Account Creation ====================
  const validateAccountStep = (): boolean => {
    const errors: StepErrors = {};
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (trimmedPhone && !EGYPTIAN_PHONE_REGEX.test(trimmedPhone)) {
      errors.phone = 'يرجى إدخال رقم هاتف مصري صحيح مثل 01012345678';
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'يرجى إدخال بريد إلكتروني صحيح';
    }

    if (!trimmedPhone && !trimmedEmail) {
      errors.phone = 'يجب إدخال رقم هاتف أو بريد إلكتروني ليكون وسيلة تسجيل الدخول';
    }

    if (!password) {
      errors.password = 'يرجى إدخال كلمة المرور';
    } else if (password.length < 6) {
      errors.password = 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'يرجى تأكيد كلمة المرور';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateAccountStep() || !verifiedStudent) return;

    registerStudent({
      registrationToken: verifiedStudent.registrationToken,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      password,
    });
  };

  // ==================== SUCCESS STATE ====================
  if (isRegistered) {
    return (
      <div className="space-y-6 text-center animate-in fade-in-50 duration-200" aria-live="polite">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
          <CheckCircle2 className="h-9 w-9 text-success-600" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-neutral-900">تم إنشاء حسابك بنجاح</h3>
          <p className="text-sm text-neutral-500">جاري تحويلك إلى لوحة التحكم الخاصة بك...</p>
        </div>
        <Button type="button" variant="primary" size="lg" className="w-full font-bold shadow-sm" onClick={redirectToDashboard}>
          <span>الانتقال إلى لوحة التحكم</span>
        </Button>
        <Link
          href="/login"
          className="block text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  // ==================== STEP 2 — Credentials Form ====================
  if (verifiedStudent) {
    const alreadyRegistered = registerError?.code === 'STUDENT_ALREADY_REGISTERED';

    return (
      <form onSubmit={handleRegisterSubmit} className="space-y-5 w-full" noValidate aria-label="نموذج إنشاء حساب الطالب">
        {registerError && (
          <Alert variant={alreadyRegistered ? 'warning' : 'error'} className="animate-in fade-in-50 duration-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
            <div className="flex-1">
              <AlertTitle className="text-sm font-bold text-error-800">تعذر إنشاء الحساب</AlertTitle>
              <AlertDescription className="text-xs text-error-700">{registerError.message}</AlertDescription>
              {alreadyRegistered && (
                <Link
                  href="/login"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary-700 transition-colors hover:text-primary-800"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>العودة إلى تسجيل الدخول</span>
                </Link>
              )}
            </div>
          </Alert>
        )}

        {/* Verified student confirmation banner */}
        <div className="rounded-lg border border-success-200 bg-success-50 p-4 flex items-start gap-3" aria-live="polite">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-success-800">{verifiedStudent.fullName}</p>
            <p className="text-xs text-success-700 mt-0.5">
              {verifiedStudent.studentCode} • {verifiedStudent.gradeLevel}
            </p>
            <p className="text-xs text-success-700 mt-1">
              تم التحقق من بيانات الطالب بنجاح، أنشئ الآن بيانات الدخول الخاصة بك
            </p>
          </div>
        </div>

        <Input
          id="student-phone"
          name="phone"
          type="tel"
          label="رقم الهاتف (وسيلة تسجيل الدخول)"
          placeholder="01012345678"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (stepErrors.phone) setStepErrors((prev) => ({ ...prev, phone: undefined }));
          }}
          error={stepErrors.phone}
          helperText="أدخل رقم هاتفك ليكون وسيلة تسجيل الدخول"
          disabled={isRegistering}
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
          startIcon={<Phone className="h-4 w-4" />}
        />

        <Input
          id="student-email"
          name="email"
          type="email"
          label="البريد الإلكتروني (اختياري)"
          placeholder="student@elawal.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (stepErrors.email) setStepErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={stepErrors.email}
          helperText="يمكنك استخدام البريد الإلكتروني بدلاً من رقم الهاتف"
          disabled={isRegistering}
          autoComplete="email"
          dir="ltr"
          startIcon={<Mail className="h-4 w-4" />}
        />

        <Input
          id="student-password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          label="كلمة المرور"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (stepErrors.password) setStepErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={stepErrors.password}
          helperText="6 أحرف على الأقل"
          disabled={isRegistering}
          required
          autoComplete="new-password"
          startIcon={<Lock className="h-4 w-4" />}
          endIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={0}
              disabled={isRegistering}
              className="p-1 rounded text-neutral-400 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <Input
          id="student-confirm-password"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          label="تأكيد كلمة المرور"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (stepErrors.confirmPassword) setStepErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          error={stepErrors.confirmPassword}
          disabled={isRegistering}
          required
          autoComplete="new-password"
          startIcon={<Lock className="h-4 w-4" />}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isRegistering}
          disabled={isRegistering}
          className="w-full font-bold shadow-sm mt-2"
          aria-label="إنشاء الحساب"
        >
          <UserPlus className="w-4 h-4 me-2" />
          <span>إنشاء الحساب</span>
        </Button>

        <button
          type="button"
          onClick={resetFlow}
          disabled={isRegistering}
          className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>العودة إلى خطوة التحقق</span>
        </button>
      </form>
    );
  }

  // ==================== STEP 1 — Identification Form ====================
  const alreadyRegistered = verifyError?.code === 'STUDENT_ALREADY_REGISTERED';

  return (
    <form onSubmit={handleVerifySubmit} className="space-y-5 w-full" noValidate aria-label="نموذج التحقق من الطالب">
      {verifyError && (
        <Alert variant={alreadyRegistered ? 'warning' : 'error'} className="animate-in fade-in-50 duration-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
          <div className="flex-1">
            <AlertTitle className="text-sm font-bold text-error-800">تعذر التحقق من البيانات</AlertTitle>
            <AlertDescription className="text-xs text-error-700">{verifyError.message}</AlertDescription>
            {alreadyRegistered && (
              <Link
                href="/login"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary-700 transition-colors hover:text-primary-800"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>العودة إلى تسجيل الدخول</span>
              </Link>
            )}
          </div>
        </Alert>
      )}

      <Input
        id="student-code"
        name="studentCode"
        type="text"
        label="كود الطالب"
        placeholder="STU-2026-0001"
        value={studentCode}
        onChange={(e) => {
          setStudentCode(e.target.value);
          if (stepErrors.studentCode) setStepErrors((prev) => ({ ...prev, studentCode: undefined }));
          if (verifyError) resetVerifyError();
        }}
        error={stepErrors.studentCode}
        helperText="الكود المدرسي الصادر من الإدارة والموجود في بطاقة الطالب"
        disabled={isVerifying}
        required
        autoFocus
        dir="ltr"
        startIcon={<Hash className="h-4 w-4" />}
      />

      <Input
        id="registration-code"
        name="registrationCode"
        type="text"
        label="كود التفعيل"
        placeholder="A7K2-9M4P-QX"
        value={registrationCode}
        onChange={(e) => {
          setRegistrationCode(e.target.value);
          if (stepErrors.registrationCode) setStepErrors((prev) => ({ ...prev, registrationCode: undefined }));
          if (verifyError) resetVerifyError();
        }}
        error={stepErrors.registrationCode}
        helperText="كود التفعيل الخاص بك والمُسلّم إليك من إدارة المدرسة"
        disabled={isVerifying}
        required
        dir="ltr"
        startIcon={<KeyRound className="h-4 w-4" />}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isVerifying}
        disabled={isVerifying}
        className="w-full font-bold shadow-sm mt-2"
        aria-label="التحقق من الحساب"
      >
        <BadgeCheck className="w-4 h-4 me-2" />
        <span>التحقق من الحساب</span>
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        <span>العودة إلى تسجيل الدخول</span>
      </Link>
    </form>
  );
}
