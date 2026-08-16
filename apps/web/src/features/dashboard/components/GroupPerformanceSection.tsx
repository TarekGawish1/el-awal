import React from 'react';
import Link from 'next/link';
import { BarChart3, Users, Award, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatPercentage, formatNumber } from '@/lib/utils/formatters';
import { GroupPerformanceItem } from '../types/dashboard.types';

export interface GroupPerformanceSectionProps {
  groups?: GroupPerformanceItem[];
  isLoading?: boolean;
}

export function GroupPerformanceSection({ groups = [], isLoading = false }: GroupPerformanceSectionProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-full rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col justify-between">
      <div>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-secondary-50 text-secondary-600 rounded">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>مقارنة أداء المجموعات الدراسية</CardTitle>
              <span className="text-xs text-neutral-500">
                مقارنة نسب الحضور ومتوسط درجات الاختبارات
              </span>
            </div>
          </div>
          <Link
            href="/teacher/groups"
            className="text-xs font-semibold text-secondary-600 hover:text-secondary-700 inline-flex items-center gap-1"
          >
            <span>تفاصيل المجموعات</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs">
              لا توجد بيانات مجموعات مسجلة حالياً
            </div>
          ) : (
            groups.map((group) => {
              const isHighAttendance = group.attendanceRate >= 90;
              const isGoodScore = group.averageExamScore >= 75;

              return (
                <div
                  key={group.groupId}
                  className="p-3 bg-neutral-50/60 border border-neutral-200/80 rounded-lg hover:bg-white hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 leading-snug">
                        {group.groupName}
                      </h4>
                      <span className="text-xs text-neutral-500">
                        {group.gradeLevel} • {formatNumber(group.enrolledCount)} طالب
                      </span>
                    </div>

                    <Link
                      href={`/teacher/groups/${group.groupId}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                    >
                      فتح المجموعة ←
                    </Link>
                  </div>

                  {/* Attendance Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-neutral-400" />
                        نسبة الحضور:
                      </span>
                      <span className={`font-semibold ${isHighAttendance ? 'text-success-700' : 'text-warning-700'}`}>
                        {formatPercentage(group.attendanceRate)}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isHighAttendance ? 'bg-success-500' : 'bg-warning-500'
                        }`}
                        style={{ width: `${Math.min(100, group.attendanceRate)}%` }}
                      />
                    </div>
                  </div>

                  {/* Exam Score Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-neutral-400" />
                        متوسط درجات الاختبارات:
                      </span>
                      <span className={`font-semibold ${isGoodScore ? 'text-primary-700' : 'text-neutral-700'}`}>
                        {formatPercentage(group.averageExamScore)}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary-600"
                        style={{ width: `${Math.min(100, group.averageExamScore)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </div>

      <div className="p-3 bg-neutral-50/80 border-t border-neutral-100 text-center rounded-b-lg">
        <Link
          href="/teacher/assessments"
          className="text-xs font-semibold text-neutral-600 hover:text-secondary-700 transition-colors"
        >
          عرض تقارير الاختبارات الشاملة للمجموعات ←
        </Link>
      </div>
    </Card>
  );
}
