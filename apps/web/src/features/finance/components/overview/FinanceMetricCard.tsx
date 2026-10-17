import React from 'react';
import { FinanceDashboardMetric } from '../../types/finance.types';

export const TERM_MONTHS: Record<'FIRST_TERM' | 'SECOND_TERM', number[]> = {
  FIRST_TERM: [8, 9, 10, 11, 12, 1],
  SECOND_TERM: [2, 3, 4, 5, 6, 7],
};

export const MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export interface FinanceMetricCardProps {
  title: string;
  subtitle: string;
  metric: FinanceDashboardMetric;
  icon: React.ReactNode;
  accentColor: 'indigo' | 'amber' | 'purple' | 'emerald';
}

export function FinanceMetricCard({
  title,
  subtitle,
  metric,
  icon,
  accentColor,
}: FinanceMetricCardProps) {
  const { expected, collected, remaining, rate } = metric;
  const rateClamped = Math.min(100, Math.max(0, rate || 0));

  const colorStyles = {
    indigo: {
      border: 'border-indigo-100',
      bg: 'bg-indigo-50/60',
      text: 'text-indigo-700',
      iconBg: 'bg-indigo-600',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      bar: 'bg-indigo-600',
    },
    amber: {
      border: 'border-amber-100',
      bg: 'bg-amber-50/60',
      text: 'text-amber-700',
      iconBg: 'bg-amber-500',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      bar: 'bg-amber-500',
    },
    purple: {
      border: 'border-purple-100',
      bg: 'bg-purple-50/60',
      text: 'text-purple-700',
      iconBg: 'bg-purple-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      bar: 'bg-purple-600',
    },
    emerald: {
      border: 'border-emerald-100',
      bg: 'bg-emerald-50/60',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bar: 'bg-emerald-600',
    },
  }[accentColor];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${colorStyles.border} bg-white p-5 shadow-sm transition-all hover:shadow-md`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorStyles.iconBg} text-white shadow-sm`}>
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">{title}</h4>
            <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
          </div>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${colorStyles.badgeBg}`}
        >
          {rate}%
        </span>
      </div>

      {/* Primary 3-column stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
          <span className="text-[10px] font-medium text-slate-400 block">إجمالي المطلوب</span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 block">
            {expected.toLocaleString()} <span className="text-[10px] font-normal">ج.م</span>
          </span>
        </div>

        <div className="rounded-xl bg-emerald-50/80 p-2 border border-emerald-100/60">
          <span className="text-[10px] font-semibold text-emerald-600 block">المحصل الفعلي</span>
          <span className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 block">
            {collected.toLocaleString()} <span className="text-[10px] font-normal">ج.م</span>
          </span>
        </div>

        <div className="rounded-xl bg-rose-50/80 p-2 border border-rose-100/60">
          <span className="text-[10px] font-semibold text-rose-600 block">المتبقي</span>
          <span className="text-xs sm:text-sm font-bold text-rose-700 mt-0.5 block">
            {remaining.toLocaleString()} <span className="text-[10px] font-normal">ج.م</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 space-y-1">
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorStyles.bar} rounded-full transition-all duration-500`}
            style={{ width: `${rateClamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}
