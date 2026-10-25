'use client';

import React from 'react';
import { Link as LinkIcon, UserCheck, Globe, CheckCircle2 } from 'lucide-react';
import { resolveJoiningMethod } from '../../utils/studentJoiningHelpers';

interface StudentJoiningBadgeProps {
  createdByName?: string | null;
  groupEnrollments?: Array<{ group?: { name?: string } }>;
  className?: string;
  showDetails?: boolean;
}

export function StudentJoiningBadge({
  createdByName,
  groupEnrollments,
  className = '',
  showDetails = false,
}: StudentJoiningBadgeProps) {
  const method = resolveJoiningMethod({ createdByName, groupEnrollments });

  if (method.type === 'APPROVED_REQUEST') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200/80 shadow-2xs w-fit ${className}`}
        title={method.description}
      >
        <CheckCircle2 className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
        <span>{showDetails && method.groupName ? `طلب معتمد (${method.groupName})` : 'طلب انضمام معتمد'}</span>
      </span>
    );
  }

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

  if (method.type === 'DIRECT') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/60 w-fit ${className}`}
        title={method.description}
      >
        <Globe className="w-2.5 h-2.5 text-blue-500 shrink-0" />
        <span>{showDetails ? method.label : method.shortLabel}</span>
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
