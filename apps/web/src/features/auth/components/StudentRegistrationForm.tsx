'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  GraduationCap,
  Hash,
  KeyRound,
  Laptop,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button, Input, Select } from '@/components/ui';
import { useStudentRegistration } from '../hooks/useStudentRegistration';
import { AcademicStage, StudentRegistrationCredentials } from '../types/auth.types';
import {
  ACADEMIC_STAGES,
  GRADE_LEVELS,
  isAcademicStageKey,
  AcademicStageKey,
} from '@/lib/constants/academic-levels';

const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020|0)?1[0125]\d{8}$/;

type Step = 'mode' | 'info' | 'review';

interface FieldErrors {
  fullName?: string;
  studentPhone?: string;
  parentPhone?: string;
  academicStage?: string;
  gradeLevel?: string;
}

function normalizePhone(value: string): string {
  return value.replace(/[\s-]/g, '').trim();
}

export function StudentRegistrationForm() {
  const {
    credentials,
    isRegistering,
    isRegistered,
    registerError,
    registerStudent,
    redirectToDashboard,
  } = useStudentRegistration();

  const [step, setStep] = useState<Step>('mode');
  const [fullName, setFullName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [academicStage, setAcademicStage] = useState<AcademicStage | ''>('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [attendanceMode, setAttendanceMode] = useState<'CENTER' | 'ONLINE' | ''>('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [copied, setCopied] = useState<string | null>(null);

  const validateInfoStep = (): boolean => {
    const errors: FieldErrors = {};

    if (fullName.trim().length < 3) {
      errors.fullName = 'يرجى إدخال الاسم بالكامل (3 أحرف على الأقل)';
    }

    const sPhone = normalizePhone(studentPhone);
    if (!sPhone) {
      errors.studentPhone = 'يرجى إدخال رقم هاتف الطالب';
    } else if (!EGYPTIAN_PHONE_REGEX.test(sPhone)) {
      errors.studentPhone = 'رقم الهاتف غير صحيح';
    }

    const pPhone = normalizePhone(parentPhone);
    if (attendanceMode === 'CENTER') {
      if (!pPhone) {
        errors.parentPhone = 'يرجى إدخال رقم هاتف ولي الأمر';
      } else if (!EGYPTIAN_PHONE_REGEX.test(pPhone)) {
        errors.parentPhone = 'رقم الهاتف غير صحيح';
      } else if (sPhone && pPhone && sPhone === pPhone) {
        errors.parentPhone = 'رقم هاتف ولي الأمر يجب أن يختلف عن رقم هاتف الطالب';
      }
    }

    if (!academicStage) {
      errors.academicStage = 'يرجى اختيار المرحلة الدراسية';
    }

    if (!gradeLevel) {
      errors.gradeLevel = 'يرجى اختيار الصف الدراسي';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInfoSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateInfoStep()) return;
    setStep('review');
  };

  const handleRegister = () => {
    if (!isAcademicStageKey(academicStage)) return;
    registerStudent({
      fullName,
      studentPhone: normalizePhone(studentPhone),
      parentPhone: attendanceMode === 'CENTER' ? normalizePhone(parentPhone) : undefined,
      academicStage,
      gradeLevel,
      attendanceMode: attendanceMode as 'CENTER' | 'ONLINE',
    });
  };

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard unavailable — credentials remain visible for manual copy
    }
  };

  // ==================== STEP 3 — Success / Credentials ====================
  if (isRegistered && credentials) {
    return (
      <div className="space-y-5">
        <StepIndicator current={4} />
        <CredentialsScreen
          credentials={credentials}
          copied={copied}
          onCopy={copyText}
          onContinue={redirectToDashboard}
          attendanceMode={attendanceMode as 'CENTER' | 'ONLINE'}
        />
      </div>
    );
  }

  // ==================== STEP 2.5 — Review & Confirm ====================
  if (step === 'review') {
    const stageLabel = ACADEMIC_STAGES.find((s) => s.id === academicStage)?.label ?? '';
    const attendanceModeLabel = attendanceMode === 'CENTER' ? 'سنتر' : 'أونلاين فقط';

    return (
      <div className="space-y-5" aria-label="خطوة مراجعة وتأكيد البيانات">
        <StepIndicator current={3} />

        {registerError && (
          <Alert variant="error" className="animate-in fade-in-50 duration-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
            <div className="flex-1">
              <AlertTitle className="text-sm font-bold text-error-800">تعذر إنشاء الحساب</AlertTitle>
              <AlertDescription className="text-xs text-error-700">{registerError.message}</AlertDescription>
              {registerError.code === 'PHONE_ALREADY_REGISTERED' && (
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

        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold text-neutral-500">تأكد من صحة البيانات قبل إنشاء الحساب</p>
          <dl className="space-y-2 text-sm">
            <Row label="الاسم بالكامل" value={fullName.trim()} />
            <Row label="رقم هاتف الطالب" value={normalizePhone(studentPhone)} ltr />
            {attendanceMode === 'CENTER' && (
              <Row label="رقم هاتف ولي الأمر" value={normalizePhone(parentPhone)} ltr />
            )}
            <Row label="المرحلة الدراسية" value={stageLabel} />
            <Row label="الصف الدراسي" value={gradeLevel} />
            <Row label="نظام الحضور" value={attendanceModeLabel} />
          </dl>
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          isLoading={isRegistering}
          disabled={isRegistering}
          className="w-full font-bold shadow-sm"
          onClick={handleRegister}
          aria-label="إنشاء الحساب"
        >
          <UserPlus className="h-4 w-4 me-2" />
          <span>إنشاء الحساب</span>
        </Button>

        <button
          type="button"
          onClick={() => setStep('info')}
          disabled={isRegistering}
          className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>تعديل البيانات</span>
        </button>
      </div>
    );
  }

  // ==================== STEP 1 — Mode Selection ====================
  if (step === 'mode') {
    return (
      <div className="space-y-5" aria-label="اختيار نظام الحضور">
        <StepIndicator current={1} />

        <div className="space-y-3">
          <p className="text-sm font-semibold text-neutral-800 text-center mb-4">
            كيف ستتابع دراستك معنا؟
          </p>

          <button
            type="button"
            onClick={() => {
              setAttendanceMode('CENTER');
              setStep('info');
            }}
            className="flex w-full items-center justify-between rounded-xl border-2 border-neutral-200 bg-white p-4 transition-all hover:border-primary-500 hover:bg-primary-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="font-bold text-neutral-900">طالب سنتر</div>
                <div className="text-xs text-neutral-500 mt-1">أحضر الحصص في السنتر فقط</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-neutral-400 rtl:rotate-180" />
          </button>

          <button
            type="button"
            onClick={() => {
              setAttendanceMode('ONLINE');
              setStep('info');
            }}
            className="flex w-full items-center justify-between rounded-xl border-2 border-neutral-200 bg-white p-4 transition-all hover:border-primary-500 hover:bg-primary-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100 text-secondary-600">
                <Laptop className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="font-bold text-neutral-900">أونلاين فقط</div>
                <div className="text-xs text-neutral-500 mt-1">أتابع الحصص والمحتوى عبر المنصة فقط</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-neutral-400 rtl:rotate-180" />
          </button>
        </div>

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>العودة إلى تسجيل الدخول</span>
        </Link>
      </div>
    );
  }

  // ==================== STEP 2 — Student Information ====================
  return (
    <form onSubmit={handleInfoSubmit} className="space-y-5" noValidate aria-label="نموذج إنشاء حساب الطالب">
      <StepIndicator current={2} />

      <Input
        id="reg-full-name"
        name="fullName"
        type="text"
        label="الاسم بالكامل"
        placeholder="مثال: محمود أحمد علي"
        value={fullName}
        onChange={(e) => {
          setFullName(e.target.value);
          if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
        }}
        error={fieldErrors.fullName}
        disabled={isRegistering}
        required
        autoFocus
        startIcon={<User className="h-4 w-4" />}
      />

      <Input
        id="reg-student-phone"
        name="studentPhone"
        type="tel"
        label="رقم هاتف الطالب"
        placeholder="01012345678"
        value={studentPhone}
        onChange={(e) => {
          setStudentPhone(e.target.value);
          if (fieldErrors.studentPhone) setFieldErrors((prev) => ({ ...prev, studentPhone: undefined }));
        }}
        error={fieldErrors.studentPhone}
        disabled={isRegistering}
        required
        autoComplete="tel"
        inputMode="tel"
        dir="ltr"
        startIcon={<Phone className="h-4 w-4" />}
      />

      {attendanceMode === 'CENTER' && (
        <Input
          id="reg-parent-phone"
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
          helperText="سيتم إنشاء حساب لولي الأمر بهذا الرقم"
          disabled={isRegistering}
          required
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
          startIcon={<UserRound className="h-4 w-4" />}
        />
      )}

      <Select
        id="reg-stage"
        label="المرحلة الدراسية"
        value={academicStage}
        onChange={(e) => {
          const value = e.target.value;
          if (value !== academicStage) {
            setAcademicStage(value === '' ? '' : (value as AcademicStage));
            setGradeLevel('');
          }
          if (fieldErrors.academicStage) setFieldErrors((prev) => ({ ...prev, academicStage: undefined }));
        }}
        error={fieldErrors.academicStage}
        disabled={isRegistering}
        options={[
          { label: '-- اختر المرحلة الدراسية --', value: '' },
          ...ACADEMIC_STAGES.map((s) => ({ label: s.label, value: s.id })),
        ]}
      />

      <Select
        id="reg-grade"
        label="الصف الدراسي"
        value={gradeLevel}
        onChange={(e) => {
          setGradeLevel(e.target.value);
          if (fieldErrors.gradeLevel) setFieldErrors((prev) => ({ ...prev, gradeLevel: undefined }));
        }}
        error={fieldErrors.gradeLevel}
        disabled={!academicStage || isRegistering}
        options={[
          { label: '-- اختر الصف الدراسي --', value: '' },
          ...(isAcademicStageKey(academicStage) ? GRADE_LEVELS[academicStage] : []),
        ]}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isRegistering}
        className="w-full font-bold shadow-sm mt-2"
        aria-label="متابعة"
      >
        <span>متابعة</span>
      </Button>

      <button
        type="button"
        onClick={() => setStep('mode')}
        className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        <span>العودة لتعديل نظام الحضور</span>
      </button>
    </form>
  );
}

function StepIndicator({ current }: { current: number }) {
  const steps = ['الحضور', 'البيانات', 'المراجعة', 'بيانات الدخول'];
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`الخطوة ${current} من ${steps.length}`}>
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === current;
        const isDone = stepNumber < current;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isDone
                    ? 'bg-success-500 text-white'
                    : isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-200 text-neutral-500'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : stepNumber}
              </span>
              <span className={`text-[11px] font-semibold ${isActive ? 'text-neutral-800' : 'text-neutral-400'}`}>
                {label}
              </span>
            </div>
            {index < steps.length - 1 && <span className="h-px w-6 bg-neutral-200" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={`font-bold text-neutral-900 ${ltr ? 'text-left' : ''}`} dir={ltr ? 'ltr' : 'auto'}>
        {value}
      </dd>
    </div>
  );
}

function CredentialsScreen({
  credentials,
  copied,
  onCopy,
  onContinue,
  attendanceMode,
}: {
  credentials?: StudentRegistrationCredentials;
  copied?: string | null;
  onCopy?: (text: string, key: string) => void;
  onContinue: () => void;
  attendanceMode?: 'CENTER' | 'ONLINE';
}) {
  const handleCopy = (text: string, key: string) => {
    if (onCopy) {
      onCopy(text, key);
    }
  };

  const copyAll = () => {
    if (!credentials) return;
    const text = [
      '🎓 بيانات حساب الطالب:',
      `• كود الطالب (ID): ${credentials.studentCode}`,
      `• اسم المستخدم/الهاتف: ${credentials.studentPhone}`,
      `• كلمة المرور: ${credentials.studentPassword}`,
    ].join('\n');

    handleCopy(text, 'all');
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200 text-center" aria-live="polite">
      <div className="space-y-3">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 shadow-inner">
          <CheckCircle2 className="h-11 w-11 text-emerald-600" />
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-extrabold text-neutral-900">تم إنشاء الحساب بنجاح! 🎉</h3>
          <p className="text-sm font-medium text-neutral-500">
            احفظ بيانات الدخول الخاصة بك للدخول إلى حسابك في أي وقت
          </p>
        </div>
      </div>

      {credentials && (
        <div className="space-y-4 text-start">
          {/* Student Credentials Card */}
          <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/40 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-primary-100 pb-2.5">
              <div className="flex items-center gap-2 text-primary-900 font-extrabold text-sm">
                <GraduationCap className="h-5 w-5 text-primary-600" />
                <span>بيانات حساب الطالب</span>
              </div>
              <span className="text-[11px] font-bold bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                حساب الطالب
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Student Code / ID */}
              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-primary-100 shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-neutral-500 block">كود الطالب (ID)</span>
                  <span className="font-mono text-base font-extrabold text-primary-900" dir="ltr">
                    {credentials.studentCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(credentials.studentCode, 'studentCode')}
                  className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {copied === 'studentCode' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied === 'studentCode' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>

              {/* Student Phone */}
              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-primary-100 shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-neutral-500 block">رقم هاتف الطالب</span>
                  <span className="font-mono text-sm font-bold text-neutral-900" dir="ltr">
                    {credentials.studentPhone}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(credentials.studentPhone, 'studentPhone')}
                  className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {copied === 'studentPhone' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied === 'studentPhone' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>

              {/* Student Password */}
              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-primary-100 shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-neutral-500 block">كلمة المرور</span>
                  <span className="font-mono text-sm font-bold text-emerald-700" dir="ltr">
                    {credentials.studentPassword}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(credentials.studentPassword, 'studentPassword')}
                  className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {copied === 'studentPassword' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied === 'studentPassword' ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Copy All Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyAll}
            className="w-full text-xs font-bold gap-2 border-primary-200 text-primary-700 hover:bg-primary-50 rounded-xl py-2.5"
          >
            {copied === 'all' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied === 'all' ? 'تم نسخ بيانات الطالب بنجاح ✅' : 'نسخ بيانات حساب الطالب'}</span>
          </Button>

          {/* WhatsApp Notice reminder */}
          {attendanceMode !== 'ONLINE' && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5 flex items-start gap-3 text-xs text-emerald-900 leading-relaxed">
              <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <div>
                <p className="font-bold text-emerald-950">إشعار ولي الأمر عبر واتساب:</p>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  سيتم إرسال بيانات الدخول الخاصة بولي الأمر والطالب تلقائياً في رسالة واتساب لرقم ولي الأمر فور قبول المعلم للحجز. 📲
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full font-bold shadow-md rounded-2xl py-4 flex items-center justify-center gap-2 text-base"
          onClick={onContinue}
          aria-label={attendanceMode === 'ONLINE' ? 'الانتقال للوحة التحكم' : 'اختار المجموعة الدراسية'}
        >
          <span>{attendanceMode === 'ONLINE' ? 'الانتقال للوحة التحكم' : 'اختار المجموعة الدراسية'}</span>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
