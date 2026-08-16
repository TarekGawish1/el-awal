import React from 'react';
import Link from 'next/link';
import { Calendar, Users, CheckCircle, Clock, TrendingUp, TrendingDown, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNumber, formatPercentage } from '@/lib/utils/formatters';
import { DashboardKpiData } from '../types/dashboard.types';

export interface DashboardKpiGridProps {
  kpis?: DashboardKpiData;
  isLoading?: boolean;
}

export function DashboardKpiGrid({ kpis, isLoading = false }: DashboardKpiGridProps) {
  if (isLoading || !kpis) {
    return (
      <section aria-label="تحميل المؤشرات الرئيسية" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3.5 w-36 mb-4" />
            <Skeleton className="h-8 w-full rounded" />
          </Card>
        ))}
      </section>
    );
  }

  // Attendance Status calculation
  const attendanceRate = kpis.weeklyAttendanceRate;
  const isHealthyAttendance = attendanceRate >= 90;
  const isWarningAttendance = attendanceRate >= 75 && attendanceRate < 90;

  return (
    <section aria-label="المؤشرات الرئيسية للأداء" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Today's Sessions */}
      <Card className="hover:border-primary-300 transition-colors flex flex-col justify-between">
        <CardContent className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-neutral-600">حصص اليوم</span>
              <div className="p-2 bg-primary-50 text-primary-600 rounded-md">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {formatNumber(kpis.todaySessionsCount)}
              </span>
              <span className="text-xs text-neutral-500 font-medium">حصص مجدولة</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {kpis.activeSessionsCount > 0 ? (
                <Badge variant="success" size="sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                  {kpis.activeSessionsCount} حصة جارية الآن
                </Badge>
              ) : (
                <span className="text-xs text-neutral-500">لا توجد حصص جارية حالياً</span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100">
            <Link
              href="/teacher/attendance"
              className="inline-flex items-center justify-between w-full text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              <span>بدء رصد الحضور الذكي</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* KPI 2: Total Active Students */}
      <Card className="hover:border-primary-300 transition-colors flex flex-col justify-between">
        <CardContent className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-neutral-600">الطلاب النشطون</span>
              <div className="p-2 bg-secondary-50 text-secondary-600 rounded-md">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {formatNumber(kpis.totalActiveStudents)}
              </span>
              <span className="text-xs text-neutral-500 font-medium">طالب مسجل</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-xs text-neutral-500">
                موزعون على {formatNumber(kpis.totalActiveGroups)} مجموعات دراسية
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100">
            <Link
              href="/teacher/students"
              className="inline-flex items-center justify-between w-full text-xs font-semibold text-secondary-600 hover:text-secondary-700 transition-colors"
            >
              <span>إدارة سجلات الطلاب</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* KPI 3: Weekly Attendance Rate */}
      <Card className="hover:border-primary-300 transition-colors flex flex-col justify-between">
        <CardContent className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-neutral-600">نسبة الحضور الأسبوعي</span>
              <div className="p-2 bg-success-50 text-success-600 rounded-md">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {formatPercentage(attendanceRate)}
              </span>
              {kpis.attendanceRateDelta !== undefined && (
                <span
                  className={`inline-flex items-center text-xs font-semibold ${
                    kpis.attendanceRateDelta >= 0 ? 'text-success-600' : 'text-error-600'
                  }`}
                >
                  {kpis.attendanceRateDelta >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 me-0.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 me-0.5" />
                  )}
                  {kpis.attendanceRateDelta > 0 ? `+${kpis.attendanceRateDelta}%` : `${kpis.attendanceRateDelta}%`}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge
                variant={isHealthyAttendance ? 'success' : isWarningAttendance ? 'warning' : 'error'}
                size="sm"
              >
                {isHealthyAttendance ? 'مستوى مستقر (≥90%)' : isWarningAttendance ? 'متوسط (75-89%)' : 'يحتاج متابعة (<75%)'}
              </Badge>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100">
            <Link
              href="/teacher/attendance"
              className="inline-flex items-center justify-between w-full text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              <span>تقرير الحضور والغياب</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* KPI 4: Pending Grading */}
      <Card className="hover:border-primary-300 transition-colors flex flex-col justify-between">
        <CardContent className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-neutral-600">واجبات بانتظار التصحيح</span>
              <div
                className={`p-2 rounded-md ${
                  kpis.pendingGradingCount > 0 ? 'bg-warning-50 text-warning-600' : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {formatNumber(kpis.pendingGradingCount)}
              </span>
              <span className="text-xs text-neutral-500 font-medium">إجابة معلقة</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {kpis.pendingGradingCount > 0 ? (
                <span className="text-xs text-warning-700 font-medium">
                  عبر {kpis.pendingGradingAssessmentsCount} اختبارات وواجبات نشطة
                </span>
              ) : (
                <span className="text-xs text-success-700 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-success-600" />
                  تم تصحيح جميع التسليمات
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100">
            <Link
              href="/teacher/assessments"
              className="inline-flex items-center justify-between w-full text-xs font-semibold text-warning-700 hover:text-warning-800 transition-colors"
            >
              <span>مراجعة تسليمات الواجبات</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
