'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Laptop, UserRound } from 'lucide-react';
import { StepIndicator } from './StepIndicator';

interface RegistrationModeStepProps {
  onSelectMode: (mode: 'CENTER' | 'ONLINE') => void;
}

export function RegistrationModeStep({ onSelectMode }: RegistrationModeStepProps) {
  return (
    <div className="space-y-5" aria-label="اختيار نظام الحضور">
      <StepIndicator current={1} />

      <div className="space-y-3">
        <p className="text-sm font-semibold text-neutral-800 text-center mb-4">
          كيف ستتابع دراستك معنا؟
        </p>

        <button
          type="button"
          onClick={() => onSelectMode('CENTER')}
          className="flex w-full items-center justify-between rounded-xl border-2 border-neutral-200 bg-white p-4 transition-all hover:border-primary-500 hover:bg-primary-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
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
          onClick={() => onSelectMode('ONLINE')}
          className="flex w-full items-center justify-between rounded-xl border-2 border-neutral-200 bg-white p-4 transition-all hover:border-primary-500 hover:bg-primary-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
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
