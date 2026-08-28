'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Loader2,
  Phone,
  RefreshCw,
  School,
  User,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Input } from '@/components/ui';
import { useGroupInvite, useGroupRegistration } from '../hooks/useGroupRegistration';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

interface FieldErrors {
  fullName?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  password?: string;
  confirmPassword?: string;
}

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, '').trim();
}

export function GroupRegistrationForm({ token }: { token: string }) {
  const {
    data: invite,
    isLoading: isInviteLoading,
    isError: isInviteError,
    refetch: refetchInvite,
  } = useGroupInvite(token);

  const {
    isRegistering,
    isRegistered,
    registerError,
    registerStudent,
    redirectToDashboard,
  } = useGroupRegistration(token);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (isRegistered) {
      redirectToDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegistered]);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (fullName.trim().length < 3) {
      errors.fullName = 'يرجى إدخال اسم الطالب رباعياً (3 أحرف على الأقل)';
    }

    const studentPhone = normalizePhone(phone);
    if (!studentPhone) {
      errors.phone = 'يرجى إدخال رقم هاتف الطالب';
    } else if (!EGYPTIAN_PHONE_REGEX.test(studentPhone)) {
      errors.phone = 'رقم الهاتف غير صحيح';
    }

    if (!parentName.trim()) {
      errors.parentName = 'يرجى إدخال اسم ولي الأمر';
    }

    const guardianPhone = normalizePhone(parentPhone);
    if (!guardianPhone) {
      errors.parentPhone = 'يرجى إدخال رقم هاتف ولي الأمر';
    } else if (!EGYPTIAN_PHONE_REGEX.test(guardianPhone)) {
      errors.parentPhone = 'رقم الهاتف غير صحيح';
    } else if (studentPhone && guardianPhone === studentPhone) {
      errors.parentPhone = 'رقم هاتف ولي الأمر يجب أن يختلف عن رقم هاتف الطالب';
    }

    if (!password) {
      errors.password = 'يرجى إدخال كلمة المرور';
    } else if (password.length < 8) {
      errors.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'يرجى تأكيد كلمة المرور';
    } else if (password && confirmPassword !== password) {
      errors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    registerStudent({
      fullName: fullName.trim(),
      phone: normalizePhone(phone),
      parentName: parentName.trim(),
      parentPhone: normalizePhone(parentPhone),
      password,
    });
  };

  if (isRegistered) {
    return (
      <div className="space-y-6 text-center animate-in fade-in-50 duration-200" aria-live="polite">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
          <CheckCircle2 className="h-11 w-11 text-emerald-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-extrabold text-neutral-900">تم التسجيل بنجاح! 🎉</h3>
          <p className="text-sm font-medium text-neutral-500">
            تم إنشاء حسابك وانضمامك للمجموعة، جاري تحويلك إلى لوحة التحكم...
          </p>
        </div>
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary-600" />
      </div>
    );
  }

  if (isInviteLoading) {
    return (
      <div className="space-y-4 animate-pulse" aria-label="جاري التحقق من رابط التسجيل">
        <div className="h-24 rounded-2xl bg-neutral-100" />
        <div className="h-11 rounded-xl bg-neutral-100" />
        <div className="h-11 rounded-xl bg-neutral-100" />
        <div className="h-11 rounded-xl bg-neutral-100" />
        <div className="h-12 rounded-xl bg-neutral-100" />
      </div>
    );
  }

  if (isInviteError || !invite || !invite.isValid) {
    return (
      <div className="space-y-5 text-center" aria-live="polite">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-error-50 ring-8 ring-error-50/60">
          <AlertCircle className="h-11 w-11 text-error-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-neutral-900">رابط التسجيل غير صالح</h3>
          <p className="text-sm text-neutral-500">
            {isInviteError
              ? 'تعذر التحقق من رابط التسجيل، يرجى المحاولة مرة أخرى.'
              : 'هذا الرابط منتهي أو مغلق، يرجى طلب رابط تسجيل جديد من المدرس.'}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => refetchInvite()} className="w-full">
          <RefreshCw className="w-4 h-4 ml-2" />
          <span>إعادة المحاولة</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card: group & teacher details */}
      <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-4 space-y-2" data-testid="group-invite-header">
        <div className="flex items-center gap-3">
          <div className="bg-primary-600 text-white p-2.5 rounded-xl shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-primary-900 truncate" data-testid="invite-group-name">
              {invite.groupName}
            </p>
            <p className="text-xs text-primary-700 mt-0.5">
              {invite.gradeLevel} • {invite.stage} • <span data-testid="invite-teacher-name">{invite.teacherName}</span>
            </p>
          </div>
        </div>
        {invite.monthlyFee > 0 && (
          <p className="text-[11px] font-semibold text-primary-800 bg-white/70 rounded-lg px-2.5 py-1.5 inline-block">
            الاشتراك الشهري: {invite.monthlyFee} جنيه
          </p>
        )}
      </div>

      {registerError && (
        <Alert variant="error" className="animate-in fade-in-50 duration-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
          <div className="flex-1">
            <AlertTitle className="text-sm font-bold text-error-800">تعذر إتمام التسجيل</AlertTitle>
            <AlertDescription className="text-xs text-error-700">{registerError.message}</AlertDescription>
          </div>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate aria-label="نموذج التسجيل في المجموعة">
        <Input
          id="group-reg-full-name"
          name="fullName"
          type="text"
          label="اسم الطالب رباعي"
          placeholder="مثال: محمود أحمد علي"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
          }}
          error={fieldErrors.fullName}
          disabled={isRegistering}
          required
          startIcon={<User className="h-4 w-4" />}
        />

        <Input
          id="group-reg-phone"
          name="phone"
          type="tel"
          label="رقم هاتف الطالب (واتساب)"
          placeholder="01012345678"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
          }}
          error={fieldErrors.phone}
          disabled={isRegistering}
          required
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
          startIcon={<Phone className="h-4 w-4" />}
        />

        <Input
          id="group-reg-parent-name"
          name="parentName"
          type="text"
          label="اسم ولي الأمر"
          placeholder="مثال: محمد أحمد علي"
          value={parentName}
          onChange={(e) => {
            setParentName(e.target.value);
            if (fieldErrors.parentName) setFieldErrors((prev) => ({ ...prev, parentName: undefined }));
          }}
          error={fieldErrors.parentName}
          disabled={isRegistering}
          required
          startIcon={<UserRound className="h-4 w-4" />}
        />

        <Input
          id="group-reg-parent-phone"
          name="parentPhone"
          type="tel"
          label="رقم هاتف ولي الأمر"
          placeholder="01098765432"
          value={parentPhone}
          onChange={(e) => {
            setParentPhone(e.target.value);
            if (fieldErrors.parentPhone) setFieldErrors((prev) => ({ ...prev, parentPhone: undefined }));
          }}
          error={fieldErrors.parentPhone}
          disabled={isRegistering}
          required
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
          startIcon={<Phone className="h-4 w-4" />}
        />

        <Input
          id="group-reg-password"
          name="password"
          type="password"
          label="كلمة المرور"
          placeholder="8 أحرف على الأقل"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={fieldErrors.password}
          helperText="ستستخدمها لتسجيل الدخول إلى حسابك"
          disabled={isRegistering}
          required
          autoComplete="new-password"
          startIcon={<KeyRound className="h-4 w-4" />}
        />

        <Input
          id="group-reg-confirm-password"
          name="confirmPassword"
          type="password"
          label="تأكيد كلمة المرور"
          placeholder="أعد إدخال كلمة المرور"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          error={fieldErrors.confirmPassword}
          disabled={isRegistering}
          required
          autoComplete="new-password"
          startIcon={<KeyRound className="h-4 w-4" />}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isRegistering}
          disabled={isRegistering}
          className="w-full font-bold shadow-sm"
          aria-label="التسجيل والانضمام للمجموعة"
        >
          <UserPlus className="h-4 w-4 me-2" />
          <span>التسجيل والانضمام للمجموعة</span>
        </Button>

        <p className="text-center text-[11px] text-neutral-400 flex items-center justify-center gap-1">
          <GraduationCap className="w-3.5 h-3.5" />
          بالتسجيل أنت توافق على الانضمام إلى {invite.groupName}
          <ArrowLeft className="w-3 h-3" />
        </p>
      </form>
    </div>
  );
}
