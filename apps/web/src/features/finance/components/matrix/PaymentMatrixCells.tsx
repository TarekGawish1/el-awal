'use client';

import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { MatrixLedgerStudent } from '../../types/finance.types';

export const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export function formatAmount(amount: number) {
  return `${Number(amount || 0).toLocaleString('en-US')} ج.م`;
}

export function formatPaidAt(value?: string | Date) {
  return value ? new Date(value).toLocaleDateString('ar-EG-u-nu-latn') : 'غير متاح';
}

export function isMonthStarted(
  academicYear: string,
  academicTerm: 'FIRST_TERM' | 'SECOND_TERM',
  month: number,
  paymentTiming: 'PREPAID' | 'POSTPAID' = 'PREPAID',
) {
  const startYear = Number(academicYear.split('-')[0]) || new Date().getUTCFullYear();
  const actualYear =
    academicTerm === 'FIRST_TERM' && month === 1
      ? startYear + 1
      : academicTerm === 'SECOND_TERM'
      ? startYear + 1
      : startYear;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  if (paymentTiming === 'POSTPAID') {
    return actualYear < currentYear || (actualYear === currentYear && month < currentMonth);
  }

  return actualYear < currentYear || (actualYear === currentYear && month <= currentMonth);
}

export interface PaymentCellProps {
  student: MatrixLedgerStudent;
  kind: 'TUITION' | 'BOOKLET';
  month?: number;
  bookletId?: string;
  academicYear: string;
  academicTerm: 'FIRST_TERM' | 'SECOND_TERM';
  paymentTiming?: 'PREPAID' | 'POSTPAID';
  onSelectPaidCell?: (cell: any) => void;
}

export function PaymentCell({
  student,
  kind,
  month,
  bookletId,
  academicYear,
  academicTerm,
  paymentTiming = 'PREPAID',
  onSelectPaidCell,
}: PaymentCellProps) {
  const cell = kind === 'TUITION' ? student.monthlyPayments[month || 0] : student.bookletPayments[bookletId || ''];
  const started =
    kind === 'BOOKLET' || !month || (cell?.isStarted ?? isMonthStarted(academicYear, academicTerm, month, paymentTiming));

  // 0. Not applicable
  if (cell?.isApplicable === false) {
    return (
      <span
        title={kind === 'TUITION' ? 'قبل تاريخ التحاق الطالب بالمجموعة' : 'غير مخصص لصف الطالب'}
        className="text-lg font-bold text-slate-300 select-none"
      >
        —
      </span>
    );
  }

  // 0.1 Exemption by mid-month enrollment (enrolled day 21+)
  if (
    kind === 'TUITION' &&
    (cell?.rateMultiplier === 0 || (cell?.amountExpected === 0 && cell?.isPaid && Number(cell?.amountPaid || 0) === 0))
  ) {
    return (
      <span
        title={cell?.calculationReason || 'معفى من اشتراك الشهر الحالي (انضمام بعد يوم 20)'}
        className="inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/80 text-[10px] font-bold select-none cursor-default"
      >
        <span>معفى</span>
        <span className="text-[9px] text-sky-500 font-medium">طالب جديد</span>
      </span>
    );
  }

  const isHalfProrated =
    kind === 'TUITION' &&
    (cell?.rateMultiplier === 0.5 ||
      (cell?.amountExpected !== undefined && cell.amountExpected < student.monthlyFee && cell.amountExpected > 0));

  // 1. Full Payment
  if (cell?.isPaid) {
    return (
      <button
        type="button"
        onClick={() => onSelectPaidCell?.(cell)}
        className="flex min-w-24 flex-col items-center gap-1 p-1 rounded-lg hover:bg-emerald-50 active:scale-95 transition-all group cursor-pointer"
        title={`سداد كامل ${isHalfProrated ? `(نصف شهر: ${cell?.calculationReason || ''})` : ''} • تاريخ السداد: ${formatPaidAt(cell.paidAt)} - ${formatAmount(cell.amountPaid)} • اضغط لعرض التفاصيل أو الإلغاء`}
      >
        <div className="flex items-center gap-1 text-emerald-600 group-hover:scale-110 transition-transform">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-bold text-emerald-700 group-hover:underline">
          مدفوع {formatAmount(cell.amountPaid)}
        </span>
        {isHalfProrated && (
          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-1 rounded">
            نصف شهر
          </span>
        )}
      </button>
    );
  }

  // 2. Partial Payment
  if (cell && Number(cell.amountPaid) > 0) {
    const expected = cell.amountExpected || (kind === 'TUITION' ? student.monthlyFee : 0);
    const remaining = Math.max(0, expected - Number(cell.amountPaid));
    return (
      <button
        type="button"
        onClick={() => onSelectPaidCell?.(cell)}
        className="flex min-w-24 flex-col items-center gap-1 p-1.5 rounded-xl border border-amber-200/90 bg-amber-50/80 hover:bg-amber-100 active:scale-95 transition-all group cursor-pointer shadow-xs"
        title={`سداد جزئي: مدفوع ${formatAmount(cell.amountPaid)} من أصل ${formatAmount(expected)} ${isHalfProrated ? `(نصف شهر)` : ''} • المتبقي: ${formatAmount(remaining)} • اضغط لعرض التفاصيل أو الإلغاء`}
      >
        <div className="flex items-center gap-1 text-amber-600 group-hover:scale-110 transition-transform">
          <Clock className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-bold text-amber-800 group-hover:underline">
          سدد جزئياً ({formatAmount(cell.amountPaid)})
        </span>
        {isHalfProrated && (
          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-1 rounded">
            نصف شهر
          </span>
        )}
        {remaining > 0 && (
          <span className="text-[9px] font-extrabold text-rose-600">
            متبقي {formatAmount(remaining)}
          </span>
        )}
      </button>
    );
  }

  // 3. Not started yet
  if (!started) {
    return <span aria-label={`شهر ${month} لم يبدأ بعد`} className="text-lg font-bold text-slate-300">—</span>;
  }

  // 4. Completely Unpaid
  return (
    <span
      title={cell?.calculationReason || (isHalfProrated ? `نصف شهر مطلوب (${cell?.amountExpected} ج.م)` : 'غير مدفوع')}
      className="flex min-w-24 flex-col items-center gap-1"
    >
      <XCircle className="h-4 w-4 text-rose-500" />
      <span className="text-[10px] font-bold text-rose-600">
        غير مدفوع {isHalfProrated && cell?.amountExpected ? `(${formatAmount(cell.amountExpected)})` : ''}
      </span>
      {isHalfProrated && (
        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/70 px-1 rounded">
          نصف شهر
        </span>
      )}
    </span>
  );
}

export function calculateTotals(
  student: MatrixLedgerStudent,
  months: number[],
  booklets: Array<{ id: string; price: number; gradeLevel: string }>,
  academicYear: string,
  academicTerm: 'FIRST_TERM' | 'SECOND_TERM',
  paymentTiming: 'PREPAID' | 'POSTPAID' = 'PREPAID',
) {
  let totalPaid = 0;
  let totalDue = 0;
  months.forEach((month) => {
    const payment = student.monthlyPayments[month];
    if (payment?.isApplicable === false) return;
    const amountPaid = payment?.amountPaid || 0;
    const expected = payment?.amountExpected ?? student.monthlyFee;
    totalPaid += amountPaid;
    if (payment?.isStarted ?? isMonthStarted(academicYear, academicTerm, month, paymentTiming)) {
      totalDue += Math.max(0, expected - amountPaid);
    }
  });
  booklets
    .filter((booklet) => booklet.gradeLevel === student.gradeLevel)
    .forEach((booklet) => {
      const payment = student.bookletPayments[booklet.id];
      if (payment?.isApplicable === false) return;
      const amountPaid = payment?.amountPaid || 0;
      totalPaid += amountPaid;
      const price = Number(booklet.price);
      if (!payment?.isPaid) {
        totalDue += Math.max(0, price - amountPaid);
      }
    });
  return { totalPaid, totalDue };
}
