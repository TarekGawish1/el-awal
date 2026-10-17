'use client';

import React from 'react';
import { CreditCard, ExternalLink, X } from 'lucide-react';

interface ReceiptPreviewModalProps {
  receiptUrl: string | null;
  onClose: () => void;
}

export function ReceiptPreviewModal({ receiptUrl, onClose }: ReceiptPreviewModalProps) {
  if (!receiptUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
      <div
        dir="rtl"
        className="relative bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
      >
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-500" />
            <h4 className="font-bold text-sm">إيصال تحويل فودافون كاش</h4>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="فتح بالحجم الأصلي"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-auto flex items-center justify-center bg-slate-100/50 min-h-[300px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={receiptUrl}
            alt="إيصال التحويل"
            className="max-w-full max-h-[70vh] rounded-xl object-contain border border-slate-200 shadow-md"
          />
        </div>
      </div>
    </div>
  );
}
