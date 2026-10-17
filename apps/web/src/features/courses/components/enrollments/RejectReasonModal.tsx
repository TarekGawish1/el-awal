'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface RejectReasonModalProps {
  rejectingItem: { id: string; studentName: string } | null;
  rejectionReason: string;
  onReasonChange: (val: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}

export function RejectReasonModal({
  rejectingItem,
  rejectionReason,
  onReasonChange,
  onConfirm,
  onClose,
  isPending,
}: RejectReasonModalProps) {
  if (!rejectingItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        dir="rtl"
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
      >
        <div className="flex items-center gap-2 text-rose-600">
          <AlertCircle className="w-5 h-5" />
          <h4 className="font-bold text-sm text-slate-900">رفض طلب اشتراك الطالب</h4>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          هل أنت متأكد من رفض طلب اشتراك الطالب <strong>{rejectingItem.studentName}</strong>؟ يمكنك كتابة سبب الرفض ليظهر للطالب في حسابه.
        </p>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">سبب الرفض (اختياري)</label>
          <textarea
            rows={3}
            value={rejectionReason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="مثال: لم يتم استلام المبلغ بالمحفظة، أو صورة الإيصال غير واضحة..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            تراجع
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isPending ? 'جاري الرفض...' : 'تأكيد رفض الطلب'}
          </button>
        </div>
      </div>
    </div>
  );
}
