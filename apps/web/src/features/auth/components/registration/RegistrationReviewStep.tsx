'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, UserPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle, Button } from '@/components/ui';
import { StepIndicator } from './StepIndicator';
import { ACADEMIC_STAGES } from '@/lib/constants/academic-levels';
import { AcademicStage } from '../../types/auth.types';
import { normalizePhone } from '../../utils/phone-validation.utils';

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

interface RegistrationReviewStepProps {
  fullName: string;
  studentPhone: string;
  parentPhone: string;
  academicStage: AcademicStage | '';
  gradeLevel: string;
  attendanceMode: 'CENTER' | 'ONLINE' | '';
  registerError: any;
  isRegistering: boolean;
  onRegister: () => void;
  onBackToEdit: () => void;
}

export function RegistrationReviewStep({
  fullName,
  studentPhone,
  parentPhone,
  academicStage,
  gradeLevel,
  attendanceMode,
  registerError,
  isRegistering,
  onRegister,
  onBackToEdit,
}: RegistrationReviewStepProps) {
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
          {normalizePhone(studentPhone) ? (
            <Row label="رقم هاتف الطالب" value={normalizePhone(studentPhone)} ltr />
          ) : (
            <Row label="رقم هاتف الطالب" value="غير مسجل (سيتم الدخول بكود الطالب)" />
          )}
          <Row label="رقم هاتف ولي الأمر" value={normalizePhone(parentPhone)} ltr />
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
        onClick={onRegister}
        aria-label="إنشاء الحساب"
      >
        <UserPlus className="h-4 w-4 me-2" />
        <span>إنشاء الحساب</span>
      </Button>

      <button
        type="button"
        onClick={onBackToEdit}
        disabled={isRegistering}
        className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        <span>تعديل البيانات</span>
      </button>
    </div>
  );
}
