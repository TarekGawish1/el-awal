import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, UserX, FileCheck, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AtRiskStudentAlert, PendingGradingAlert } from '@/types/dashboard.types';

export interface AttentionSectionProps {
  atRiskStudents?: AtRiskStudentAlert[];
  pendingGrading?: PendingGradingAlert[];
  isLoading?: boolean;
}

export function AttentionSection({
  atRiskStudents = [],
  pendingGrading = [],
  isLoading = false,
}: AttentionSectionProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalAlertsCount = atRiskStudents.length + pendingGrading.length;

  return (
    <Card className="h-full flex flex-col justify-between border-neutral-200">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-warning-50 text-warning-600 rounded">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>عناصر تتطلب انتباهك والمتابعة</CardTitle>
              <span className="text-xs text-neutral-500">
                {totalAlertsCount > 0 ? `${totalAlertsCount} تنبيهات تحتاج إجراء سريع` : 'جميع الأمور مستقرة ومحدثة'}
              </span>
            </div>
          </div>

          <Badge variant={totalAlertsCount > 0 ? 'warning' : 'success'} size="sm">
            {totalAlertsCount > 0 ? `${totalAlertsCount} تنبيهات` : 'لا توجد تنبيهات'}
          </Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {totalAlertsCount === 0 ? (
            <div className="text-center py-8 px-4 bg-success-50/40 rounded-lg border border-success-200/60">
              <CheckCircle2 className="w-8 h-8 mx-auto text-success-600 mb-2" />
              <p className="text-sm font-semibold text-success-900">لا توجد تنبيهات معلقة حالياً</p>
              <p className="text-xs text-success-700 mt-1">
                نسب الحضور مستقرة وجميع الواجبات والاختبارات تم تصحيحها بالكامل.
              </p>
            </div>
          ) : (
            <>
              {/* Consecutive Absence Alerts */}
              {atRiskStudents.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 bg-error-50/40 border border-error-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-error-100 text-error-700 rounded-md shrink-0 mt-0.5">
                      <UserX className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-neutral-900">
                          {alert.studentName}
                        </h4>
                        <Badge variant="error" size="sm">
                          غياب {alert.consecutiveAbsences} حصص متتالية
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        المجموعة: <span className="font-medium text-neutral-800">{alert.groupName}</span>
                        {alert.lastAttendedDate && (
                          <span className="text-neutral-500"> • آخر حضور: {alert.lastAttendedDate}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link href={`/teacher/students`}>
                      <Button size="sm" variant="outline" className="text-xs bg-white text-error-700 border-error-300 hover:bg-error-50">
                        متابعة الطالب
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

              {/* Pending Grading Alerts */}
              {pendingGrading.map((item) => (
                <div
                  key={item.assessmentId}
                  className="p-3.5 bg-warning-50/40 border border-warning-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-warning-100 text-warning-700 rounded-md shrink-0 mt-0.5">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-neutral-900">
                          {item.assessmentTitle}
                        </h4>
                        <Badge variant="warning" size="sm">
                          {item.pendingCount} إجابات معلقة
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        {item.groupName} • معلقة منذ {item.daysPending} أيام
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link href={`/teacher/assessments/${item.assessmentId}/submissions`}>
                      <Button size="sm" variant="primary" className="text-xs gap-1.5 bg-warning-600 hover:bg-warning-700">
                        <span>تصحيح الإجابات</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </div>

      <div className="p-3 bg-neutral-50/80 border-t border-neutral-100 text-center rounded-b-lg">
        <Link
          href="/teacher/attendance"
          className="text-xs font-semibold text-neutral-600 hover:text-warning-800 transition-colors"
        >
          عرض سجل الغياب والإنذارات الأكاديمية ←
        </Link>
      </div>
    </Card>
  );
}
