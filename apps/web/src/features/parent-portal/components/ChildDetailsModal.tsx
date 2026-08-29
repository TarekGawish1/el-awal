'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { X } from 'lucide-react';
import { ChildDetailsView } from './ChildDetailsView';

interface ChildDetailsModalProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChildDetailsModal({ studentId, isOpen, onClose }: ChildDetailsModalProps) {
  if (!isOpen || !studentId) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[88dvh] overflow-y-auto space-y-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <h2 className="text-xl font-bold text-slate-900">تفاصيل الطالب</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <ChildDetailsView studentId={studentId} />

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
          <Button variant="primary" size="sm" onClick={onClose} className="rounded-xl px-6">
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
