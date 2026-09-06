'use client';

import React from 'react';
import { Users, FileText, BookOpen, Layers, ArrowLeft } from 'lucide-react';
import { FinanceDashboardGroup } from '../types/finance.types';

interface GroupFinancialCardProps {
  group: FinanceDashboardGroup;
  onOpenMatrix?: (groupId: string) => void;
}

export const GroupFinancialCard: React.FC<GroupFinancialCardProps> = ({ group, onOpenMatrix }) => {
  const { name, stage, gradeLevel, studentCount, subscription, booklets, total } = group;

  // Format stage to friendly Arabic if english
  const stageName =
    stage === 'SECONDARY'
      ? 'المرحلة الثانوية'
      : stage === 'PREPARATORY'
      ? 'المرحلة الإعدادية'
      : stage === 'PRIMARY'
      ? 'المرحلة الابتدائية'
      : stage;

  const totalRateClamped = Math.min(100, Math.max(0, total.rate || 0));

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-100">
      {/* Group Header */}
      <div>
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-base lg:text-lg leading-tight">{name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                <Layers className="h-3 w-3 text-slate-400" />
                {stageName}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                {gradeLevel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-blue-50/80 px-2.5 py-1 text-blue-700 border border-blue-100/60 shrink-0">
            <Users className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{studentCount} طالب</span>
          </div>
        </div>

        {/* Breakdown Sections */}
        <div className="mt-4 space-y-3">
          {/* Subscriptions Section */}
          <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                اشتراكات الحصص
              </span>
              <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {subscription.rate}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white p-1.5 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-medium">المطلوب</p>
                <p className="font-bold text-slate-700 mt-0.5">{subscription.expected.toLocaleString()} ج.م</p>
              </div>
              <div className="rounded-lg bg-white p-1.5 border border-slate-100">
                <p className="text-[10px] text-emerald-600 font-medium">المحصل</p>
                <p className="font-bold text-emerald-700 mt-0.5">{subscription.collected.toLocaleString()} ج.م</p>
              </div>
              <div className="rounded-lg bg-white p-1.5 border border-slate-100">
                <p className="text-[10px] text-rose-500 font-medium">المتبقي</p>
                <p className="font-bold text-rose-600 mt-0.5">{subscription.remaining.toLocaleString()} ج.م</p>
              </div>
            </div>
          </div>

          {/* Booklets Section */}
          <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-amber-500" />
                المذكرات والملازم
              </span>
              <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {booklets.rate}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white p-1.5 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-medium">المطلوب</p>
                <p className="font-bold text-slate-700 mt-0.5">{booklets.expected.toLocaleString()} ج.م</p>
              </div>
              <div className="rounded-lg bg-white p-1.5 border border-slate-100">
                <p className="text-[10px] text-emerald-600 font-medium">المحصل</p>
                <p className="font-bold text-emerald-700 mt-0.5">{booklets.collected.toLocaleString()} ج.م</p>
              </div>
              <div className="rounded-lg bg-white p-1.5 border border-slate-100">
                <p className="text-[10px] text-rose-500 font-medium">المتبقي</p>
                <p className="font-bold text-rose-600 mt-0.5">{booklets.remaining.toLocaleString()} ج.م</p>
              </div>
            </div>
          </div>
        </div>

        {/* Group Grand Total & Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-700">إجمالي تحصيل المجموعة:</span>
            <span className="text-slate-900 font-extrabold">
              <span className="text-emerald-600">{total.collected.toLocaleString()}</span> /{' '}
              <span>{total.expected.toLocaleString()} ج.م</span>
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                totalRateClamped >= 100
                  ? 'bg-emerald-500'
                  : totalRateClamped >= 50
                  ? 'bg-indigo-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${totalRateClamped}%` }}
              role="progressbar"
              aria-valuenow={totalRateClamped}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
            <span>نسبة الإنجاز</span>
            <span className="font-bold text-indigo-700">{total.rate}%</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {onOpenMatrix && (
        <button
          type="button"
          onClick={() => onOpenMatrix(group.id)}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-700 font-bold text-xs transition-colors duration-150"
        >
          <span>📋 كشف حساب المجموعة</span>
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
        </button>
      )}
    </div>
  );
};
