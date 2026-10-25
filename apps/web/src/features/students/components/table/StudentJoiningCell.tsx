'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { formatJoiningDate, formatJoiningTime } from '../../utils/studentJoiningHelpers';
import { StudentJoiningBadge } from '../common/StudentJoiningBadge';

interface StudentJoiningCellProps {
  createdAt?: string | Date | null;
  createdByName?: string | null;
}

export function StudentJoiningCell({ createdAt, createdByName }: StudentJoiningCellProps) {
  const joinDate = formatJoiningDate(createdAt);
  const joinTime = formatJoiningTime(createdAt);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
        <Calendar className="w-3.5 h-3.5 text-primary-600 shrink-0" />
        <span>{joinDate}</span>
        {joinTime && (
          <span className="text-[11px] text-slate-500 font-mono">({joinTime})</span>
        )}
      </div>
      <StudentJoiningBadge createdByName={createdByName} />
    </div>
  );
}
