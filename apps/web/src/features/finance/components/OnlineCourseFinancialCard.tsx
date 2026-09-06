'use client';

import React from 'react';
import { Video, Users, DollarSign, Layers } from 'lucide-react';
import { FinanceDashboardOnlineCourse } from '../types/finance.types';

interface OnlineCourseFinancialCardProps {
  course: FinanceDashboardOnlineCourse;
}

export const OnlineCourseFinancialCard: React.FC<OnlineCourseFinancialCardProps> = ({ course }) => {
  const { title, price, enrolledStudents, totalCollected, gradeLevel } = course;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-emerald-100">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base leading-snug line-clamp-1" title={title}>
              {title}
            </h3>
            {gradeLevel && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                <Layers className="h-3 w-3 text-slate-400" />
                {gradeLevel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-purple-50 px-2.5 py-1 text-purple-700 border border-purple-100/70 shrink-0">
            <Video className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{price > 0 ? `${price.toLocaleString()} ج.م` : 'مجاني'}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-slate-50/90 p-3 border border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>الطلاب المشتركون</span>
            </div>
            <p className="text-lg font-extrabold text-slate-800">
              {enrolledStudents.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">طالب</span>
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-100/60">
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-medium mb-1">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span>إجمالي المحصل</span>
            </div>
            <p className="text-lg font-extrabold text-emerald-700">
              {totalCollected.toLocaleString()}{' '}
              <span className="text-xs font-normal text-emerald-600">ج.م</span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>حالة الاشتراك:</span>
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          متاح أونلاين
        </span>
      </div>
    </div>
  );
};
