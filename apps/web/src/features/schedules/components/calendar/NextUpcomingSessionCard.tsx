'use client';

import React from 'react';
import { Clock, FileText } from 'lucide-react';
import { LessonSessionItem } from '../../types/schedules.types';
import { formatArabicTimeRange12H } from '../../utils/time.utils';

interface NextUpcomingSessionCardProps {
  session: LessonSessionItem;
  onSelect: (session: LessonSessionItem) => void;
}

export function NextUpcomingSessionCard({
  session,
  onSelect,
}: NextUpcomingSessionCardProps) {
  return (
    <div
      onClick={() => onSelect(session)}
      className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white rounded-3xl p-5 shadow-lg shadow-teal-900/15 relative overflow-hidden transition-all hover:scale-[1.02] cursor-pointer group"
    >
      {/* Background decorative ring */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-teal-500/10 blur-xl pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/20">
          تذكير الحصة القادمة
        </span>
        <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            {formatArabicTimeRange12H(session.startTime || '16:00', session.endTime)}
          </span>
        </span>
      </div>

      <h3 className="font-black text-base leading-snug mb-2 group-hover:text-teal-200 transition-colors">
        {session.topic || 'حصة بدون عنوان'}
      </h3>

      <div className="text-xs text-teal-100/90 font-medium mb-4 flex items-center gap-2">
        <span>{session.group?.name || 'مجموعة دراسية'}</span>
        <span>•</span>
        <span>{session.group?.gradeLevel}</span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-teal-600/30">
        <div className="flex items-center gap-1.5 text-xs text-teal-200 font-bold">
          <FileText className="w-3.5 h-3.5 text-teal-300" />
          <span>{session.educationalContents?.length || 0} مرفقات</span>
        </div>

        <span className="text-xs font-bold text-teal-200 hover:text-white inline-flex items-center gap-1 underline underline-offset-4">
          عرض التفاصيل ←
        </span>
      </div>
    </div>
  );
}
