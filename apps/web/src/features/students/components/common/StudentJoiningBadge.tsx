'use client';

import React from 'react';
import { Link as LinkIcon, UserCheck } from 'lucide-react';
import { resolveJoiningMethod } from '../../utils/studentJoiningHelpers';

interface StudentJoiningBadgeProps {
  createdByName?: string | null;
  className?: string;
  showDetails?: boolean;
}

export function StudentJoiningBadge({
  createdByName,
  className = '',
  showDetails = false,
}: StudentJoiningBadgeProps) {
  const method = resolveJoiningMethod({ createdByName });

  if (method.isGroupLink) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 shadow-2xs w-fit ${className}`}
        title={method.description}
      >
        <LinkIcon className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
        <span>{showDetails && method.groupName ? `رابط (${method.groupName})` : 'رابط المجموعة'}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60 w-fit ${className}`}
      title={method.description}
    >
      <UserCheck className="w-2.5 h-2.5 text-slate-500 shrink-0" />
      <span>{showDetails && method.authorName ? method.authorName : method.shortLabel}</span>
    </span>
  );
}
