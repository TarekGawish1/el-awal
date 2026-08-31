import React from 'react';
import { SessionReportMetrics } from '../types/attendance.types';

interface AttendanceReportCardProps {
  metrics: SessionReportMetrics;
}

export function AttendanceReportCard({ metrics }: AttendanceReportCardProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-3 px-4 bg-slate-50 border border-slate-100 rounded-xl mb-4">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm">
        <span className="text-slate-500 font-medium">الإجمالي:</span>
        <span className="font-bold text-slate-900">{metrics.totalEnrolled}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-sm">
        <span className="text-emerald-600 font-medium">حاضر:</span>
        <span className="font-bold text-emerald-700">{metrics.presentCount}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg text-sm">
        <span className="text-rose-600 font-medium">غائب:</span>
        <span className="font-bold text-rose-700">{metrics.absentCount}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg text-sm">
        <span className="text-amber-600 font-medium">بعذر:</span>
        <span className="font-bold text-amber-700">{metrics.excusedCount}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-sm">
        <span className="text-indigo-600 font-medium">النسبة:</span>
        <span className="font-bold text-indigo-700" dir="ltr">{metrics.attendanceRatePercentage}%</span>
      </div>
    </div>
  );
}
