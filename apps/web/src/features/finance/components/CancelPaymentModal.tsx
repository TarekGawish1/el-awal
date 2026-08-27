'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, RotateCcw, X, DollarSign, Calendar, BookOpen, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDeletePayment, useRefundPayment } from '../hooks/useFinance';
import toast from 'react-hot-toast';

export interface PaymentSummaryInfo {
  id: string;
  studentName?: string;
  amountPaid: number | string;
  paymentType?: 'TUITION' | 'BOOKLET' | 'OTHER';
  periodMonth?: number;
  periodYear?: number;
  groupName?: string;
  bookletTitle?: string;
  notes?: string;
}

interface CancelPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentSummaryInfo | null;
  onSuccess?: () => void;
}

export function CancelPaymentModal({
  isOpen,
  onClose,
  payment,
  onSuccess,
}: CancelPaymentModalProps) {
  const [actionType, setActionType] = useState<'DELETE' | 'REFUND'>('DELETE');
  const [refundReason, setRefundReason] = useState<string>('طلب الطالب استرداد المصروفات');

  const { mutate: deletePayment, isPending: isDeleting } = useDeletePayment();
  const { mutate: refundPayment, isPending: isRefunding } = useRefundPayment();

  const isPending = isDeleting || isRefunding;

  if (!isOpen || !payment) return null;

  const isBooklet = payment.paymentType === 'BOOKLET' || Boolean(payment.bookletTitle);
  const paymentTitle = isBooklet
    ? `مذكرة: ${payment.bookletTitle || 'ملزمة دراسية'}`
    : payment.periodMonth && payment.periodYear
    ? `اشتراك شهر ${payment.periodMonth} / ${payment.periodYear}`
    : 'دفعة اشتراك';

  const handleConfirm = () => {
    if (actionType === 'DELETE') {
      deletePayment(payment.id, {
        onSuccess: () => {
          toast.success('تم حذف الدفعة نهائياً وإعادة حالة الطالب إلى غير مسدد');
          onSuccess?.();
          onClose();
        },
        onError: (err: any) => {
          toast.error(err?.message || 'تعذر حذف الدفعة');
        },
      });
    } else {
      refundPayment(
        { id: payment.id, reason: refundReason },
        {
          onSuccess: () => {
            toast.success('تم تسجيل استرداد المبلغ وإلغاء الدفعة بنجاح');
            onSuccess?.();
            onClose();
          },
          onError: (err: any) => {
            toast.error(err?.message || 'تعذر تسجيل استرداد الدفعة');
          },
        }
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl dark:bg-slate-900 max-h-[88dvh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 space-y-5 animate-in zoom-in-95 duration-200 text-right"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                إلغاء وحذف دفعة الطالب
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                اختر سبب الإجراء لإعادة ضبط السجل المالي بدقة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Payment Summary Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
          {payment.studentName && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary-500" />
                الطالب:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {payment.studentName}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              {isBooklet ? <BookOpen className="w-3.5 h-3.5 text-purple-500" /> : <Calendar className="w-3.5 h-3.5 text-blue-500" />}
              نوع المعاملة:
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {paymentTitle}
            </span>
          </div>

          {payment.groupName && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">المجموعة:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {payment.groupName}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-bold">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              المبلغ المدفوع:
            </span>
            <span className="font-black text-emerald-600 text-sm">
              {payment.amountPaid} ج.م
            </span>
          </div>
        </div>

        {/* Action Type Selector */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            حدد نوع العملية المطلوبة:
          </label>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Option A: Delete (Recorded by mistake) */}
            <label
              onClick={() => setActionType('DELETE')}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                actionType === 'DELETE'
                  ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="cancelType"
                checked={actionType === 'DELETE'}
                onChange={() => setActionType('DELETE')}
                className="mt-0.5 text-rose-600 focus:ring-rose-500"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>حذف السجل بالكامل (تسجيل خاطئ بالخطأ)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  تم تسجيل الدفعة لهذا الطالب عن طريق الخطأ. سيتم حذف هذا السجل نهائياً وإعادة الطالب لحالة (غير مسدد).
                </p>
              </div>
            </label>

            {/* Option B: Refund (Student wanted money back) */}
            <label
              onClick={() => setActionType('REFUND')}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                actionType === 'REFUND'
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="cancelType"
                checked={actionType === 'REFUND'}
                onChange={() => setActionType('REFUND')}
                className="mt-0.5 text-amber-600 focus:ring-amber-500"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>استرداد المبلغ وإلغاء العملية (استرجاع الطالب لأمواله)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  الطالب استرجع أمواله أو تراجع عن الاشتراك. سيتم تسجيل المعاملة كمستردة (Refunded) مع توثيق السبب.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Refund Reason Input (only shown when REFUND is selected) */}
        {actionType === 'REFUND' && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              سبب الاسترداد / الملاحظات:
            </label>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="مثال: الطالب طلب استرداد المبلغ أو اعتذر عن الشهر"
              className="w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-base sm:text-sm text-slate-900 dark:text-slate-100 shadow-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isPending}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 min-h-[44px] px-4"
          >
            تراجع
          </Button>

          <Button
            type="button"
            variant={actionType === 'DELETE' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            disabled={isPending}
            className={`text-xs font-bold min-h-[44px] px-5 shadow-xs ${actionType === 'REFUND' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
          >
            {isPending ? 'جاري التنفيذ...' : actionType === 'DELETE' ? 'تأكيد الحذف النهائي' : 'تأكيد استرداد المبلغ'}
          </Button>
        </div>
      </div>
    </div>
  );
}
