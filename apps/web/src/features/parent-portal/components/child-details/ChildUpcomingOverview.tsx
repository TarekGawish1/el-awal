'use client';

import React from 'react';
import { Clock, BookOpen, FileText } from 'lucide-react';
import { formatArabicDate } from '@/lib/utils/formatters';

interface ChildUpcomingOverviewProps {
  nextSessionStr: string;
  primaryGroup: any;
  upcomingExam: any;
  pendingAssignmentsCount: number;
  assignments: any[];
  currentHomework: any;
}

export function ChildUpcomingOverview({
  nextSessionStr,
  primaryGroup,
  upcomingExam,
  pendingAssignmentsCount,
  assignments,
  currentHomework,
}: ChildUpcomingOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Next Session */}
      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex items-start gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl mt-0.5">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-blue-600 mb-1">معاد الحصة القادمة</p>
          <p className="text-sm font-bold text-slate-800">{nextSessionStr}</p>
          {primaryGroup && <p className="text-[10px] text-slate-500 mt-1 font-semibold">{primaryGroup.name}</p>}
        </div>
      </div>

      {/* Next Exam */}
      <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 flex items-start gap-3">
        <div className="p-2 bg-amber-100 text-amber-600 rounded-xl mt-0.5">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-amber-600 mb-1">الامتحان القادم</p>
          {upcomingExam ? (
            <>
              <p className="text-sm font-bold text-slate-800 line-clamp-1">{upcomingExam.title}</p>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                {upcomingExam.dueDate || upcomingExam.startTime
                  ? `${formatArabicDate(upcomingExam.dueDate || upcomingExam.startTime)}`
                  : upcomingExam.group?.name || 'مجموعتك الدراسية'}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-800">لا يوجد امتحانات قادمة مسجلة</p>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">سيتم إشعارك عند تحديد موعد</p>
            </>
          )}
        </div>
      </div>

      {/* Current Homework */}
      <div
        className={`p-4 rounded-2xl border flex items-start gap-3 ${
          pendingAssignmentsCount > 0
            ? 'bg-purple-50/50 border-purple-100/50'
            : assignments.length > 0
            ? 'bg-emerald-50/50 border-emerald-100/50'
            : 'bg-slate-50 border-slate-100'
        }`}
      >
        <div
          className={`p-2 rounded-xl mt-0.5 ${
            pendingAssignmentsCount > 0
              ? 'bg-purple-100 text-purple-600'
              : assignments.length > 0
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p
            className={`text-xs font-bold mb-1 ${
              pendingAssignmentsCount > 0
                ? 'text-purple-700'
                : assignments.length > 0
                ? 'text-emerald-700'
                : 'text-slate-500'
            }`}
          >
            الواجب المنزلي المطلوب
          </p>
          {pendingAssignmentsCount > 0 && currentHomework ? (
            <>
              <p className="text-sm font-bold text-slate-800 line-clamp-1">{currentHomework.title}</p>
              <p className="text-[10px] text-purple-700 mt-1 font-bold flex items-center gap-1">
                {currentHomework.dueDate ? `التسليم: ${formatArabicDate(currentHomework.dueDate)}` : 'مطلوب إنجازه'}
              </p>
            </>
          ) : assignments.length > 0 ? (
            <>
              <p className="text-sm font-bold text-emerald-800">تم تسليم كافة الواجبات ✅</p>
              <p className="text-[10px] text-emerald-600 mt-1 font-semibold">مستوى ممتاز ومتابعة مستمرة</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-700">لا توجد واجبات حالياً</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">سيتم إشعارك عند تعيين واجب</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
