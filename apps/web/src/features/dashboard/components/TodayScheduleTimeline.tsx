import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatArabicTime } from '@/lib/utils/formatters';
import { TodaySessionItem } from '../types/dashboard.types';

export interface TodayScheduleTimelineProps {
  sessions?: TodaySessionItem[];
  isLoading?: boolean;
}

export function TodayScheduleTimeline({ sessions = [], isLoading = false }: TodayScheduleTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-neutral-800">جدول النهارده</h3>
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return null; // Empty state handled by CurrentNextClass
  }

  // Sort sessions by start time
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      return d.getHours() * 60 + d.getMinutes();
    }
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const processedSessions = sessions.map(s => {
    const endMins = parseTimeToMinutes(s.endTime);
    if (endMins > 0 && currentTotalMinutes >= endMins && s.status !== 'COMPLETED') {
      return { ...s, status: 'COMPLETED' as const };
    }
    return s;
  });

  const sortedSessions = [...processedSessions].sort((a, b) => {
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });

  return (
    <Card className="border-neutral-200 shadow-sm overflow-hidden bg-white">
      <CardHeader className="p-4 sm:px-5 sm:py-3.5 border-b border-neutral-100">
        <CardTitle className="text-base font-bold text-neutral-900">جدول النهارده</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="relative border-r-2 border-neutral-100 pr-5 space-y-5 before:hidden">
          {sortedSessions.map((session, index) => {
            const isLive = session.status === 'IN_PROGRESS';
            const isCompleted = session.status === 'COMPLETED';
            
            return (
              <div key={session.id} className="relative">
                {/* Timeline node */}
                <span 
                  className={`absolute -right-[25px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                    isLive ? 'bg-primary-500 animate-pulse' : isCompleted ? 'bg-neutral-300' : 'bg-neutral-200 border-2 border-neutral-400'
                  }`} 
                />
                
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold tracking-tight ${isLive ? 'text-primary-600' : isCompleted ? 'text-neutral-400 line-through' : 'text-neutral-700'}`}>
                      {formatArabicTime(session.startTime)}
                    </span>
                    {isLive && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded">جارية الآن</span>}
                  </div>
                  
                  <h4 className={`text-sm font-semibold ${isCompleted ? 'text-neutral-500' : 'text-neutral-900'}`}>
                    {session.groupName}
                  </h4>
                  
                  {isCompleted ? (
                    <Link href={`/teacher/attendance?sessionId=${session.id}&groupId=${session.groupId}`} className="text-xs font-medium text-neutral-400 hover:text-neutral-600 inline-flex w-fit">
                      عرض تقرير الحصة
                    </Link>
                  ) : (
                    <span className="text-xs text-neutral-500">
                      {session.roomLocation ? `القاعة: ${session.roomLocation}` : 'بدون قاعة محددة'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {sessions.length > 5 && (
          <div className="mt-4 pt-3 border-t border-neutral-50 text-center">
            <Link href="/teacher/schedules" className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1.5">
              <span>عرض الجدول الكامل</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
