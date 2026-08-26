'use client';

import React from 'react';
import { GroupDetails } from './GroupDetails';
import { X } from 'lucide-react';

interface GroupDetailsModalProps {
  groupId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function GroupDetailsModal({ groupId, isOpen, onClose }: GroupDetailsModalProps) {
  if (!isOpen || !groupId) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end sticky top-0 z-10 -mt-2 -mr-2">
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-700 rounded-2xl bg-slate-100/80 hover:bg-slate-200 transition-colors shadow-xs"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <GroupDetails id={groupId} />
        </div>
      </div>
    </div>
  );
}
