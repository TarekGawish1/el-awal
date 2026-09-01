import React from 'react';
import { User, Clock, Edit3, ShieldAlert } from 'lucide-react';

interface CreatorBadgeProps {
  createdByName?: string | null;
  createdAt?: string | Date | null;
  updatedByName?: string | null;
  updatedAt?: string | Date | null;
  recordedByName?: string | null;
  className?: string;
  compact?: boolean;
}

export function CreatorBadge({
  createdByName,
  createdAt,
  updatedByName,
  updatedAt,
  recordedByName,
  className = '',
  compact = false,
}: CreatorBadgeProps) {
  const author = recordedByName || createdByName;

  if (!author && !updatedByName) return null;

  const isAssistant =
    (author && (author.includes('مساعد') || author.includes('سكرتارية'))) ||
    (updatedByName && (updatedByName.includes('مساعد') || updatedByName.includes('سكرتارية')));

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
          isAssistant
            ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
            : 'bg-neutral-100 text-neutral-700 border border-neutral-200/60'
        } ${className}`}
        title={`بواسطة: ${author || updatedByName}`}
      >
        <User className="w-3 h-3 text-neutral-400" />
        <span>{author || updatedByName}</span>
      </span>
    );
  }

  return (
    <div className={`flex flex-col gap-0.5 text-[11px] text-neutral-500 ${className}`}>
      {author && (
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-400 font-medium">بواسطة:</span>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-bold ${
              isAssistant ? 'text-amber-700 bg-amber-50' : 'text-neutral-700 bg-neutral-100'
            }`}
          >
            <User className="w-3 h-3" />
            {author}
          </span>
        </div>
      )}

      {updatedByName && updatedByName !== author && (
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <Edit3 className="w-2.5 h-2.5" />
          <span>آخر تعديل: {updatedByName}</span>
        </div>
      )}
    </div>
  );
}
