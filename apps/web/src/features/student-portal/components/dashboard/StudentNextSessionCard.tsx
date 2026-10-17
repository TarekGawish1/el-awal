'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Clock } from 'lucide-react';

interface StudentNextSessionCardProps {
  nextSession: {
    sessionDate: string;
    startTime: string;
    topic?: string;
    schedule?: {
      location?: string;
    };
  } | null;
}

export function formatSessionDateTime(sessionDateStr: string, startTime: string) {
  if (!sessionDateStr) return '';
  const date = new Date(sessionDateStr);

  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayName = days[date.getDay()];

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const monthName = months[date.getMonth()];

  const day = date.getDate();

  let timeStr = startTime || '';
  if (startTime) {
    const parts = startTime.split(':');
    if (parts.length >= 2) {
      let hour = parseInt(parts[0], 10);
      const minute = parts[1];
      const ampm = hour >= 12 ? 'مساءً' : 'صباحاً';
      hour = hour % 12;
      hour = hour ? hour : 12;
      timeStr = `الساعة ${hour}:${minute} ${ampm}`;
    }
  }

  return `${dayName}، ${day} ${monthName} - ${timeStr}`;
}

export function StudentNextSessionCard({ nextSession }: StudentNextSessionCardProps) {
  if (!nextSession) return null;

  return (
    <Card className="border-none bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 shadow-xs rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="bg-amber-100/80 border-amber-200 text-amber-900 text-xs font-extrabold shadow-none"
              >
                موعد الحصة القادمة
              </Badge>
              {nextSession.topic && (
                <span className="text-xs font-medium text-slate-500">
                  | {nextSession.topic}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {formatSessionDateTime(nextSession.sessionDate, nextSession.startTime)}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {nextSession.schedule?.location ? (
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">
              📍 {nextSession.schedule.location}
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">
              📍 مقر السنتر
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
