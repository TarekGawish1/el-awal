'use client';

import React from 'react';
import { CreditCard, Phone, Eye, Check, X } from 'lucide-react';

interface PendingEnrollmentsTableProps {
  isLoading: boolean;
  requests: any[];
  onPreviewReceipt: (url: string) => void;
  onApprove: (enrollmentId: string) => void;
  onReject: (item: { id: string; studentName: string }) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export function PendingEnrollmentsTable({
  isLoading,
  requests,
  onPreviewReceipt,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: PendingEnrollmentsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
        <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">لا توجد طلبات اشتراك معلقة حالياً</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          أي طلب اشتراك يقوم به الطلاب عبر فودافون كاش مع إيصال التحويل سيظهر هنا مباشرة للمراجعة والتفعيل.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full text-right text-xs">
        <thead className="bg-slate-50 border-b border-slate-100 text-slate-700 font-bold">
          <tr>
            <th className="py-3.5 px-4">اسم الطالب</th>
            <th className="py-3.5 px-4">رقم محفظة التحويل</th>
            <th className="py-3.5 px-4">المبلغ</th>
            <th className="py-3.5 px-4">إيصال التحويل</th>
            <th className="py-3.5 px-4">تاريخ الإرسال</th>
            <th className="py-3.5 px-4 text-center">القرار</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800">
          {requests.map((req: any) => (
            <tr key={req.enrollmentId} className="hover:bg-slate-50/80 transition-colors">
              <td className="py-3.5 px-4">
                <div>
                  <p className="font-bold text-slate-900">{req.fullName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {req.phone || req.studentCode || '—'}
                  </p>
                </div>
              </td>
              <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-red-500" />
                  <span>{req.senderPhone || 'غير محدد'}</span>
                </div>
              </td>
              <td className="py-3.5 px-4 font-mono font-bold text-rose-600">
                {req.transferAmount} ج.م
              </td>
              <td className="py-3.5 px-4">
                {req.receiptImageUrl ? (
                  <button
                    type="button"
                    onClick={() => onPreviewReceipt(req.receiptImageUrl)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors border border-slate-200 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary-600" />
                    <span>معاينة الإيصال</span>
                  </button>
                ) : (
                  <span className="text-slate-400 text-[11px]">بدون صورة</span>
                )}
              </td>
              <td className="py-3.5 px-4 text-slate-500">
                {new Date(req.enrolledAt).toLocaleDateString('ar-EG', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="py-3.5 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onApprove(req.enrollmentId)}
                    disabled={isApproving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>قبول وتفعيل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onReject({ id: req.enrollmentId, studentName: req.fullName })
                    }
                    disabled={isRejecting}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>رفض</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
