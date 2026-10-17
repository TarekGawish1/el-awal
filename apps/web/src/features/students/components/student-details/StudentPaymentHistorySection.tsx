'use client';

import React from 'react';
import { Wallet, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/utils/formatters';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

interface StudentPaymentHistorySectionProps {
  payments: any[];
  totalPaid: number;
  totalDue: number;
}

export function StudentPaymentHistorySection({
  payments,
  totalPaid,
  totalDue,
}: StudentPaymentHistorySectionProps) {
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success" className="text-[10px] py-0 px-2 h-5">مدفوع</Badge>;
      case 'PENDING':
        return <Badge variant="warning" className="text-[10px] py-0 px-2 h-5">قيد الانتظار</Badge>;
      case 'OVERDUE':
        return <Badge variant="error" className="text-[10px] py-0 px-2 h-5">متأخر</Badge>;
      case 'EXEMPT':
        return <Badge variant="default" className="text-[10px] py-0 px-2 h-5">معفى</Badge>;
      case 'REFUNDED':
        return <Badge variant="outline" className="text-[10px] py-0 px-2 h-5">مسترجع</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] py-0 px-2 h-5">{status}</Badge>;
    }
  };

  return (
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
        <Wallet className="w-4 h-4 text-emerald-600" />
        سجل المدفوعات والمستحقات
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50 flex flex-col justify-center">
          <span className="text-xs text-emerald-600 font-semibold mb-1">إجمالي المدفوع</span>
          <span className="text-2xl font-black text-emerald-700">{formatNumber(totalPaid)} ج.م</span>
        </div>
        <div className={`p-3 rounded-2xl border flex flex-col justify-center ${totalDue > 0 ? 'bg-red-50/50 border-red-100/50' : 'bg-slate-50 border-slate-100'}`}>
          <span className={`text-xs font-semibold mb-1 ${totalDue > 0 ? 'text-red-600' : 'text-slate-500'}`}>المتبقي والمطلوب سداده</span>
          <span className={`text-2xl font-black ${totalDue > 0 ? 'text-red-700' : 'text-slate-700'}`}>{formatNumber(totalDue)} ج.م</span>
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-3 border-b border-slate-100 text-slate-600 font-bold whitespace-nowrap text-start">البند</th>
                  <th className="p-3 border-b border-slate-100 text-slate-600 font-bold whitespace-nowrap text-start">المطلوب</th>
                  <th className="p-3 border-b border-slate-100 text-slate-600 font-bold whitespace-nowrap text-start">المدفوع</th>
                  <th className="p-3 border-b border-slate-100 text-slate-600 font-bold whitespace-nowrap text-start">الحالة</th>
                  <th className="p-3 border-b border-slate-100 text-slate-600 font-bold whitespace-nowrap text-start">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {[...payments]
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10)
                  .map((p: any) => {
                    const label = p.paymentType === 'BOOKLET'
                      ? (p.booklet?.title || 'مذكرة دراسية')
                      : `اشتراك ${p.periodMonth >= 1 && p.periodMonth <= 12 ? ARABIC_MONTHS[p.periodMonth - 1] : p.periodMonth} ${p.periodYear}`;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/40">
                        <td className="p-3 border-b border-slate-50 font-bold text-slate-800 whitespace-nowrap">{label}</td>
                        <td className="p-3 border-b border-slate-50 font-mono text-slate-600 whitespace-nowrap">{formatNumber(p.amountExpected)}</td>
                        <td className="p-3 border-b border-slate-50 font-mono text-primary-600 font-bold whitespace-nowrap">{formatNumber(p.amountPaid)}</td>
                        <td className="p-3 border-b border-slate-50 whitespace-nowrap">{getPaymentStatusBadge(p.paymentStatus)}</td>
                        <td className="p-3 border-b border-slate-50 text-slate-500 whitespace-nowrap">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-EG') : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-slate-500 text-sm bg-slate-50 rounded-2xl border border-slate-100 border-dashed flex flex-col items-center gap-1.5">
          <Receipt className="w-6 h-6 text-slate-300" />
          لا توجد سجلات مدفوعات لهذا الطالب بعد.
        </div>
      )}
    </section>
  );
}
