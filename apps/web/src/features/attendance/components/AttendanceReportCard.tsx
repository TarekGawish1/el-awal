import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SessionReportMetrics } from '../types/attendance.types';

interface AttendanceReportCardProps {
  metrics: SessionReportMetrics;
}

export function AttendanceReportCard({ metrics }: AttendanceReportCardProps) {
  return (
    <Card className="mb-8 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          ملخص الحصة
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-sm text-slate-500 mb-1 font-medium">الإجمالي</p>
            <p className="text-3xl font-extrabold text-slate-900">{metrics.totalEnrolled}</p>
          </div>
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <p className="text-sm text-emerald-600 mb-1 font-medium">حاضر</p>
            <p className="text-3xl font-extrabold text-emerald-700">{metrics.presentCount}</p>
          </div>
          <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
            <p className="text-sm text-rose-600 mb-1 font-medium">غائب</p>
            <p className="text-3xl font-extrabold text-rose-700">{metrics.absentCount}</p>
          </div>
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
            <p className="text-sm text-amber-600 mb-1 font-medium">بعذر</p>
            <p className="text-3xl font-extrabold text-amber-700">{metrics.excusedCount}</p>
          </div>
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <p className="text-sm text-indigo-600 mb-1 font-medium">النسبة</p>
            <p className="text-3xl font-extrabold text-indigo-700" dir="ltr">{metrics.attendanceRatePercentage}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
