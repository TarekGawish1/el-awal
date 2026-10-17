'use client';

import React from 'react';
import { ShieldCheck, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AcademicPeriodPasswordStepProps {
  pendingYear: string;
  pendingTermLabel: string;
  password: string;
  setPassword: (val: string) => void;
  passwordError: string;
  setPasswordError: (val: string) => void;
  isSwitching: boolean;
  isOnline: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AcademicPeriodPasswordStep({
  pendingYear,
  pendingTermLabel,
  password,
  setPassword,
  passwordError,
  setPasswordError,
  isSwitching,
  isOnline,
  onCancel,
  onSubmit,
}: AcademicPeriodPasswordStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h5 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
            🔐 تأكيد تغيير الفصل الدراسي
          </h5>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            لتغيير العام أو الفصل الدراسي النشط، يرجى إدخال كلمة مرور الحساب للتأكيد.
          </p>
        </div>
      </div>

      {/* Selected period recap */}
      <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center gap-2 text-xs text-amber-950 font-bold">
        <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>
          التغيير إلى: <span className="underline">{pendingYear}</span> ({pendingTermLabel})
        </span>
      </div>

      <div className="space-y-1.5">
        <Input
          type="password"
          placeholder="كلمة المرور الخاصة بك"
          value={password}
          autoFocus
          autoComplete="current-password"
          disabled={isSwitching}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError('');
          }}
          className="h-10 text-sm bg-white rounded-xl"
        />
        {passwordError && (
          <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {passwordError}
          </p>
        )}
      </div>

      <div className="pt-1 flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 text-xs px-4 rounded-xl cursor-pointer"
          disabled={isSwitching}
          onClick={onCancel}
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          size="sm"
          className="h-9 text-xs px-5 rounded-xl font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isSwitching || !isOnline}
        >
          {isSwitching ? 'جاري التفعيل...' : 'تأكيد وتفعيل'}
        </Button>
      </div>
    </form>
  );
}
