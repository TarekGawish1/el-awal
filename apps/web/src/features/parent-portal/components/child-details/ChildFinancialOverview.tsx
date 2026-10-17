'use client';

import React from 'react';
import { Wallet } from 'lucide-react';
import { Badge } from '@/components/ui';

interface ChildFinancialOverviewProps {
  primaryGroup: any;
  paymentHistory: any[];
  totalPaid: number;
  totalUnpaid: number;
}

export function ChildFinancialOverview({
  primaryGroup,
  paymentHistory,
  totalPaid,
  totalUnpaid,
}: ChildFinancialOverviewProps) {
  const currentMonthPaid = paymentHistory?.some(
    (p: any) =>
      p.periodMonth === new Date().getMonth() + 1 &&
      p.periodYear === new Date().getFullYear() &&
      p.paymentStatus === 'PAID'
  );

  return (
    <>
      {/* Financial Overview (Current Month & Summaries) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Monthly Fee */}
        <div className="bg-gradient-to-l from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 mb-0.5">
                الاشتراك الشهري ({primaryGroup?.name || 'المجموعة'})
              </p>
              <p className="text-lg font-black text-slate-800">
                {primaryGroup?.monthlyFee ? `${primaryGroup.monthlyFee} ج.م` : 'غير محدد'}
              </p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-200/50 flex justify-between items-center">
            <span className="text-[10px] font-semibold text-slate-500">حالة الشهر الحالي</span>
            {currentMonthPaid ? (
              <Badge variant="success" className="px-2 py-0 h-5 text-[10px]">تم الدفع</Badge>
            ) : (
              <Badge variant="error" className="px-2 py-0 h-5 text-[10px]">غير مدفوع</Badge>
            )}
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex flex-col justify-center gap-2">
          <p className="text-xs font-bold text-blue-700 mb-0.5">إجمالي المدفوعات السابقة</p>
          <p className="text-2xl font-black text-blue-700">{totalPaid} ج.م</p>
          <p className="text-[10px] text-slate-500 font-medium">تشمل المذكرات والاشتراكات المسددة</p>
        </div>

        {/* Total Unpaid / Overdue */}
        <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 flex flex-col justify-center gap-2">
          <p className="text-xs font-bold text-red-700 mb-0.5">المتأخرات والمبالغ المستحقة</p>
          <p className="text-2xl font-black text-red-700">{totalUnpaid} ج.م</p>
          <p className="text-[10px] text-slate-500 font-medium">المبالغ المطلوب سدادها</p>
        </div>
      </div>

      {/* Payment History List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-emerald-600" />
          سجل المدفوعات
        </h4>
        {paymentHistory && paymentHistory.length > 0 ? (
          <div className="space-y-2">
            {paymentHistory.slice(0, 5).map((payment: any, i: number) => {
              const isPaid = payment.paymentStatus === 'PAID';

              return (
                <div
                  key={i}
                  className={`flex justify-between items-center p-3 rounded-xl border ${
                    isPaid ? 'bg-slate-50 border-slate-100' : 'bg-red-50/50 border-red-100'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {payment.paymentType === 'BOOKLET'
                        ? 'مذكرة دراسية'
                        : `اشتراك شهر ${payment.periodMonth}/${payment.periodYear}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(payment.createdAt).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className={`text-sm font-black ${isPaid ? 'text-emerald-600' : 'text-red-600'}`}>
                      {payment.amountPaid || payment.amountExpected || 0} ج.م
                    </p>
                    {isPaid ? (
                      <Badge variant="success" className="text-[10px] mt-1 py-0 px-1.5 h-4">
                        تم الدفع
                      </Badge>
                    ) : (
                      <Badge variant="error" className="text-[10px] mt-1 py-0 px-1.5 h-4">
                        غير مدفوع
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-slate-500 text-sm bg-slate-50 rounded-xl">
            لا يوجد سجل مدفوعات مسجل حتى الآن.
          </div>
        )}
      </div>
    </>
  );
}
