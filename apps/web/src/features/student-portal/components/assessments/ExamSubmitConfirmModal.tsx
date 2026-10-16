'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export interface ExamSubmitConfirmModalProps {
  isOpen: boolean;
  unansweredCount: number;
  allowMultipleAttempts: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ExamSubmitConfirmModal({
  isOpen,
  unansweredCount,
  allowMultipleAttempts,
  isSubmitting,
  onClose,
  onConfirm,
}: ExamSubmitConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-amber-700">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-800">
              تأكيد تسليم الإجابات
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              مراجعة نهائية قبل الاعتماد
            </p>
          </div>
        </div>

        {unansweredCount > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>تنبيه: لديك {unansweredCount} سؤالاً لم تجب عليها بعد.</span>
          </div>
        )}

        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {allowMultipleAttempts
            ? 'بمجرد تأكيد التسليم، سيتم رصد النتيجة. يمكنك إعادة المحاولة لاحقاً، وتُحتسب أعلى درجة بين محاولاتك كدرجة رسمية.'
            : 'بمجرد تأكيد التسليم، سيتم رصد النتيجة ولا يمكنك تعديل الإجابات أو إعادة المحاولة مرة أخرى.'}
        </p>

        <div className="flex gap-2.5 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl text-xs font-bold cursor-pointer"
            onClick={onClose}
            disabled={isSubmitting}
          >
            العودة للأسئلة
          </Button>
          <Button
            size="sm"
            className="flex-1 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جاري الإرسال...' : 'تأكيد التسليم الآن'}
          </Button>
        </div>
      </div>
    </div>
  );
}
