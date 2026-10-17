'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { LessonSessionItem } from '../../types/schedules.types';
import { formatArabicTimeRange12H } from '../../utils/time.utils';

export interface SessionConflictBannerProps {
  conflictingSession: LessonSessionItem | null;
}

export function SessionConflictBanner({ conflictingSession }: SessionConflictBannerProps) {
  if (!conflictingSession) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5 animate-in fade-in-50 duration-200">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-xs space-y-1">
        <p className="font-bold text-amber-900">تنبيه: يوجد تعارض زمني مع حصة أخرى مسجلة!</p>
        <p className="text-amber-800 leading-relaxed font-medium">
          لديك بالفعل حصة <span className="font-bold">"{conflictingSession.topic}"</span> لمجموعة{' '}
          <span className="font-bold">
            ({conflictingSession.group?.gradeLevel || conflictingSession.group?.name || 'مجموعة دراسية'})
          </span>{' '}
          في نفس التوقيت ({formatArabicTimeRange12H(conflictingSession.startTime, conflictingSession.endTime)}).
          يرجى تغيير التوقيت لتجنب تداخل الحصص.
        </p>
      </div>
    </div>
  );
}
