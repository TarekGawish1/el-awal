import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin, QrCode, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatArabicTime } from '@/lib/utils/formatters';
import { TodaySessionItem } from '../types/dashboard.types';

export interface TodaySessionsSectionProps {
  sessions?: TodaySessionItem[];
  isLoading?: boolean;
}

export function TodaySessionsSection({ sessions = [], isLoading = false }: TodaySessionsSectionProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3.5 border border-neutral-200 rounded-lg space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-8 w-full rounded" />
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
            <div className="p-1.5 bg-primary-50 text-primary-600 rounded">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>جدول حصص اليوم</CardTitle>
              <span className="text-xs text-neutral-500">
                {sessions.length > 0 ? `${sessions.length} حصص مجدولة اليوم` : 'لا توجد حصص مجدولة اليوم'}
              </span>
            </div>
          </div>
          <Link
            href="/teacher/groups"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
          >
            <span>عرض كل المجموعات</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-8 px-4 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
              <Calendar className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
              <p className="text-sm font-semibold text-neutral-700">لا توجد حصص مجدولة لليوم</p>
              <p className="text-xs text-neutral-500 mt-1">
                يمكنك مراجعة المواعيد الأسبوعية أو إنشاء حصة إضافية من صفحة المجموعات.
              </p>
              <Link href="/teacher/groups" className="mt-3 inline-block">
                <Button variant="outline" size="sm">
                  إدارة المجموعات والمواعيد
                </Button>
              </Link>
            </div>
          ) : (
            sessions.map((session) => {
              const isLive = session.status === 'IN_PROGRESS';
              const isCompleted = session.status === 'COMPLETED';

              return (
                <div
                  key={session.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isLive
                      ? 'bg-primary-50/40 border-primary-300 shadow-xs ring-1 ring-primary-400/20'
                      : isCompleted
                      ? 'bg-neutral-50/60 border-neutral-200 opacity-80'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 leading-snug">
                        {session.groupName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-600">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          {formatArabicTime(session.startTime)} - {formatArabicTime(session.endTime)}
                        </span>
                        {session.roomLocation && (
                          <>
                            <span className="text-neutral-300">•</span>
                            <span className="inline-flex items-center gap-1 text-neutral-500">
                              <MapPin className="w-3 h-3 text-neutral-400" />
                              {session.roomLocation}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant={isLive ? 'success' : isCompleted ? 'neutral' : 'info'}
                      size="sm"
                    >
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-ping" />}
                      {isLive ? 'جارية الآن' : isCompleted ? 'مكتملة' : 'قادمة'}
                    </Badge>
                  </div>

                  {/* Attendance progress bar inside session */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-100/80 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px] font-medium text-neutral-600 mb-1">
                        <span>حضور الطلاب: {session.presentCount} / {session.enrolledCount}</span>
                        <span>
                          {session.enrolledCount > 0
                            ? `${Math.round((session.presentCount / session.enrolledCount) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-neutral-500' : 'bg-primary-600'
                          }`}
                          style={{
                            width: `${
                              session.enrolledCount > 0
                                ? Math.min(100, (session.presentCount / session.enrolledCount) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      {isLive ? (
                        <Link href={`/teacher/attendance/${session.id}/scan`}>
                          <Button size="sm" variant="primary" className="text-xs gap-1.5 px-3">
                            <QrCode className="w-3.5 h-3.5" />
                            <span>رصد الحضور</span>
                          </Button>
                        </Link>
                      ) : isCompleted ? (
                        <Link href={`/teacher/attendance`}>
                          <Button size="sm" variant="outline" className="text-xs px-2.5 text-neutral-600">
                            تقرير الحصة
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/teacher/attendance/${session.id}/scan`}>
                          <Button size="sm" variant="outline" className="text-xs px-2.5 text-primary-700">
                            فتح الحصة
                          </Button>
                        </Link>
                      )}
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
          href="/teacher/attendance"
          className="text-xs font-semibold text-neutral-600 hover:text-primary-700 transition-colors"
        >
          سجل الحصص السابقة وتقارير الحضور ←
        </Link>
      </div>
    </Card>
  );
}
