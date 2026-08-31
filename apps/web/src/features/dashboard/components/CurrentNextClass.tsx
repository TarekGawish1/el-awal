import React from 'react';
import Link from 'next/link';
import { Clock, MapPin, QrCode, PlayCircle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatArabicTime } from '@/lib/utils/formatters';
import { TodaySessionItem } from '../types/dashboard.types';

export interface CurrentNextClassProps {
  sessions?: TodaySessionItem[];
  isLoading?: boolean;
}

export function CurrentNextClass({ sessions = [], isLoading = false }: CurrentNextClassProps) {
  if (isLoading) {
    return (
      <Card className="h-full border-neutral-100 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-48 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Find the current or next session
  const now = new Date();
  
  // Sort sessions by start time
  const sortedSessions = [...sessions].sort((a, b) => {
    // Assuming startTime is an ISO string or a format parseable by Date
    // If it's just a time string like "10:00", we might need a different approach.
    // Let's assume the existing logic works or we sort by the string if they are in 24h format.
    // In many implementations, startTime is an ISO string. 
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  const liveSession = sortedSessions.find(s => s.status === 'IN_PROGRESS');
  const nextSession = sortedSessions.find(s => s.status === 'UPCOMING');
  const allCompleted = sortedSessions.length > 0 && sortedSessions.every(s => s.status === 'COMPLETED');

  if (sessions.length === 0) {
    return (
      <Card className="h-full border-neutral-100 shadow-sm bg-neutral-50/50">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3 text-neutral-400">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-neutral-700">مفيش حصص النهارده</h3>
          <p className="text-sm text-neutral-500 mt-1">يوم هادي 👌</p>
        </CardContent>
      </Card>
    );
  }

  if (allCompleted) {
    return (
      <Card className="h-full border-success-100 shadow-sm bg-success-50/30">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
          <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mb-3 text-success-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h3 className="text-lg font-bold text-success-800">خلصت كل حصص النهارده ✓</h3>
          <Link href="/teacher/attendance" className="mt-4">
            <Button variant="outline" size="sm" className="bg-white text-success-700 border-success-200 hover:bg-success-50">
              عرض تقارير الحصص
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const activeSession = liveSession || nextSession;
  
  if (!activeSession) return null;

  const isLive = activeSession.status === 'IN_PROGRESS';
  const attendancePercentage = activeSession.enrolledCount > 0 
    ? Math.round((activeSession.presentCount / activeSession.enrolledCount) * 100) 
    : 0;

  let attendanceText = "الحضور لم يبدأ";
  if (attendancePercentage > 0 && attendancePercentage < 100) {
    attendanceText = `تم تسجيل ${activeSession.presentCount} من ${activeSession.enrolledCount}`;
  } else if (attendancePercentage === 100) {
    attendanceText = "الحضور مكتمل ✓";
  }

  return (
    <Card className={`h-full border shadow-sm transition-all overflow-hidden relative ${isLive ? 'border-primary-300 ring-1 ring-primary-400/20 bg-primary-50/20' : 'border-neutral-200 bg-white'}`}>
      {isLive && <div className="absolute top-0 right-0 w-1.5 h-full bg-primary-500 rounded-r-lg" />}
      
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                  جارية الآن
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold">
                  الحصة القادمة
                </span>
              )}
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
              {activeSession.groupName}
            </h2>
            
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-neutral-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>{formatArabicTime(activeSession.startTime)} - {formatArabicTime(activeSession.endTime)}</span>
              </div>
              
              {activeSession.roomLocation && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  <span>{activeSession.roomLocation}</span>
                </div>
              )}
            </div>

            {isLive && (
              <div className="mt-5 max-w-sm">
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className={attendancePercentage === 100 ? 'text-success-600' : 'text-neutral-600'}>
                    {attendanceText}
                  </span>
                  <span className="text-neutral-500">{attendancePercentage}%</span>
                </div>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${attendancePercentage === 100 ? 'bg-success-500' : 'bg-primary-500'}`}
                    style={{ width: `${attendancePercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-3">
            {isLive ? (
              <Link href={`/teacher/attendance?sessionId=${activeSession.id}&groupId=${activeSession.groupId}`}>
                <Button size="lg" className="w-full sm:w-auto md:w-full h-14 text-base font-bold bg-primary-600 hover:bg-primary-700 shadow-md gap-2">
                  <QrCode className="w-5 h-5" />
                  تسجيل الحضور
                </Button>
              </Link>
            ) : (
              <Link href={`/teacher/attendance?sessionId=${activeSession.id}&groupId=${activeSession.groupId}`}>
                <Button size="lg" variant="outline" className="w-full sm:w-auto md:w-full h-14 text-base font-bold text-primary-700 border-primary-200 hover:bg-primary-50 gap-2">
                  <PlayCircle className="w-5 h-5" />
                  فتح الحصة
                </Button>
              </Link>
            )}
            
            <Link href={`/teacher/groups/${activeSession.groupId}`}>
              <Button size="lg" variant="ghost" className="w-full sm:w-auto md:w-full h-12 text-sm font-semibold text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 gap-2">
                <FileText className="w-4 h-4" />
                تفاصيل المجموعة
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
