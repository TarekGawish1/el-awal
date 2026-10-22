'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Phone,
  User,
  UserRound,
} from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { useStudentRegistration } from '../hooks/useStudentRegistration';
import { AcademicStage } from '../types/auth.types';
import {
  ACADEMIC_STAGES,
  GRADE_LEVELS,
  isAcademicStageKey,
} from '@/lib/constants/academic-levels';
import {
  isEgyptianPhone,
  arePhonesTooSimilar,
  normalizePhone,
} from '../utils/phone-validation.utils';
import { StepIndicator } from './registration/StepIndicator';
import { RegistrationModeStep } from './registration/RegistrationModeStep';
import { RegistrationReviewStep } from './registration/RegistrationReviewStep';
import { CredentialsScreen } from './registration/CredentialsScreen';
import {
  sanitizeNameInput,
  validatePersonName,
} from '@/lib/validation/name-validator';

type Step = 'mode' | 'info' | 'review';

interface FieldErrors {
  fullName?: string;
  studentPhone?: string;
  parentPhone?: string;
  academicStage?: string;
  gradeLevel?: string;
  termsAgreed?: string;
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
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [copied, setCopied] = useState<string | null>(null);

  const validateInfoStep = (): boolean => {
    const errors: FieldErrors = {};

    const nameCheck = validatePersonName(fullName, {
      fieldName: 'الاسم بالكامل',
      minLength: 3,
    });
    if (!fullName.trim() || fullName.trim().length < 3) {
      errors.fullName = 'يرجى إدخال الاسم بالكامل (3 أحرف على الأقل)';
    } else if (!nameCheck.isValid) {
      errors.fullName = nameCheck.errorMessage;
    }

    const sPhone = normalizePhone(studentPhone);
    if (sPhone) {
      if (!isEgyptianPhone(sPhone)) {
        errors.studentPhone = 'رقم هاتف الطالب غير صحيح، يرجى كتابة رقم محمول مصري صحيح';
      }
    }

    const pPhone = normalizePhone(parentPhone);
    if (!pPhone) {
      errors.parentPhone = 'رقم هاتف ولي الأمر مطلوب للتواصل والمتابعة';
    } else if (!isEgyptianPhone(pPhone)) {
      errors.parentPhone = 'رقم هاتف ولي الأمر غير صحيح، يرجى كتابة رقم محمول مصري صحيح';
    } else if (sPhone && pPhone && sPhone === pPhone) {
      errors.parentPhone = 'رقم هاتف ولي الأمر يجب أن يختلف عن رقم هاتف الطالب';
    } else if (sPhone && pPhone && arePhonesTooSimilar(sPhone, pPhone)) {
      errors.parentPhone = 'رقم ولي الأمر متشابه جداً مع رقم الطالب (لا يمكن تكرار نفس الرقم)';
    }

    if (!academicStage) {
      errors.academicStage = 'يرجى اختيار المرحلة الدراسية';
    }

    if (!gradeLevel) {
      errors.gradeLevel = 'يرجى اختيار الصف الدراسي';
    }

    if (!termsAgreed) {
      errors.termsAgreed = 'يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة';
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
    const sPhone = normalizePhone(studentPhone);
    const pPhone = normalizePhone(parentPhone);
    registerStudent({
      fullName: fullName.trim(),
      studentPhone: sPhone ? sPhone : undefined,
      parentPhone: pPhone,
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

  // STEP 3 — Success / Credentials
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

  // STEP 2.5 — Review & Confirm
  if (step === 'review') {
    return (
      <RegistrationReviewStep
        fullName={fullName}
        studentPhone={studentPhone}
        parentPhone={parentPhone}
        academicStage={academicStage}
        gradeLevel={gradeLevel}
        attendanceMode={attendanceMode}
        registerError={registerError}
        isRegistering={isRegistering}
        onRegister={handleRegister}
        onBackToEdit={() => setStep('info')}
      />
    );
  }

  // STEP 1 — Mode Selection
  if (step === 'mode') {
    return (
      <RegistrationModeStep
        onSelectMode={(mode) => {
          setAttendanceMode(mode);
          setStep('info');
        }}
      />
    );
  }

  // STEP 2 — Student Information
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
          const sanitized = sanitizeNameInput(e.target.value);
          setFullName(sanitized);
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
        label="رقم هاتف الطالب (اختياري)"
        placeholder="01xxxxxxxxx (يمكن تركه فارغاً)"
        value={studentPhone}
        onChange={(e) => {
          setStudentPhone(e.target.value);
          if (fieldErrors.studentPhone) setFieldErrors((prev) => ({ ...prev, studentPhone: undefined }));
        }}
        error={fieldErrors.studentPhone}
        helperText="إذا لم يكن لدى الطالب هاتف خاص، يمكن تركه فارغاً وسيتم الدخول بكود الطالب"
        disabled={isRegistering}
        autoComplete="tel"
        inputMode="tel"
        dir="ltr"
        startIcon={<Phone className="h-4 w-4" />}
      />

      <Input
        id="reg-parent-phone"
        name="parentPhone"
        type="tel"
        label="رقم هاتف ولي الأمر (مطلوب)"
        placeholder="01xxxxxxxxx"
        value={parentPhone}
        onChange={(e) => {
          setParentPhone(e.target.value);
          if (fieldErrors.parentPhone) setFieldErrors((prev) => ({ ...prev, parentPhone: undefined }));
        }}
        error={fieldErrors.parentPhone}
        helperText="ضروري للتواصل، وإرسال تقارير الحضور والغياب والدرجات عبر واتساب"
        disabled={isRegistering}
        required
        autoComplete="tel"
        inputMode="tel"
        dir="ltr"
        startIcon={<UserRound className="h-4 w-4" />}
      />

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

      <div className="space-y-1 pt-1 text-start">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            id="reg-terms-agreed"
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => {
              setTermsAgreed(e.target.checked);
              if (fieldErrors.termsAgreed) {
                setFieldErrors((prev) => ({ ...prev, termsAgreed: undefined }));
              }
            }}
            disabled={isRegistering}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-2 transition-colors cursor-pointer"
            aria-describedby={fieldErrors.termsAgreed ? 'reg-terms-error' : undefined}
          />
          <span className="text-xs text-neutral-600 leading-relaxed">
            أوافق على{' '}
            <Link href="/terms" target="_blank" className="font-bold text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 rounded">
              شروط الاستخدام
            </Link>{' '}
            و{' '}
            <Link href="/privacy" target="_blank" className="font-bold text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 rounded">
              سياسة الخصوصية
            </Link>{' '}
            الخاصة بمنصة الأول وأؤكد صحة البيانات المدخلة.
          </span>
        </label>
        {fieldErrors.termsAgreed && (
          <p id="reg-terms-error" role="alert" className="text-xs text-error-600 font-medium">
            {fieldErrors.termsAgreed}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isRegistering}
        className="w-full font-bold shadow-sm mt-2 cursor-pointer"
        aria-label="متابعة"
      >
        <span>متابعة</span>
      </Button>

      <button
        type="button"
        onClick={() => setStep('mode')}
        className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        <span>العودة لتعديل نظام الحضور</span>
      </button>
    </form>
  );
}

export default StudentRegistrationForm;
