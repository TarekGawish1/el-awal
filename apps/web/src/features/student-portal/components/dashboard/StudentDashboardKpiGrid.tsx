'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Monitor, FileText, TrendingUp, Calendar } from 'lucide-react';

interface StudentDashboardKpiGridProps {
  coursesCount: number;
  upcomingExamsCount: number;
  attendanceRate: number;
  isCoursesLoading?: boolean;
  isAssessmentsLoading?: boolean;
  isAttendanceLoading?: boolean;
}

export function StudentDashboardKpiGrid({
  coursesCount,
  upcomingExamsCount,
  attendanceRate,
  isCoursesLoading = false,
  isAssessmentsLoading = false,
  isAttendanceLoading = false,
}: StudentDashboardKpiGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* دورات أونلاين */}
      <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">دورات أونلاين</p>
            <h4 className="text-2xl font-bold text-slate-800">{isCoursesLoading ? '-' : coursesCount}</h4>
          </div>
        </CardContent>
      </Card>

      {/* الاختبارات القادمة */}
      <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">الاختبارات القادمة</p>
            <h4 className="text-2xl font-bold text-slate-800">{isAssessmentsLoading ? '-' : upcomingExamsCount}</h4>
          </div>
        </CardContent>
      </Card>

      {/* نسبة الحضور */}
      <Card className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">نسبة الحضور</p>
            <h4 className="text-2xl font-bold text-slate-800">
              {isAttendanceLoading ? '-' : `${attendanceRate}%`}
            </h4>
          </div>
        </CardContent>
      </Card>

      {/* المدفوعات */}
      <Card
        className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => {
          window.location.href = '/student/payments';
        }}
      >
        <CardContent className="p-5 flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">المدفوعات</p>
            <h4 className="text-xs font-bold text-slate-800 mt-1">الاطلاع على السجل</h4>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
