'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { DollarSign, BookOpen, CreditCard, History, Trash2 } from 'lucide-react';
import { PaymentSummaryInfo } from '@/features/finance/components/CancelPaymentModal';

interface StudentLedgerCardProps {
  payments: any[];
  isLoading: boolean;
  studentName?: string;
  onOpenHistoryModal: () => void;
  onSelectPaymentToCancel: (payment: PaymentSummaryInfo) => void;
}

export function StudentLedgerCard({
  payments,
  isLoading,
  studentName,
  onOpenHistoryModal,
  onSelectPaymentToCancel,
}: StudentLedgerCardProps) {
  return (
    <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 flex justify-between items-center">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          السجل المالي والمذكرات الدراسية
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenHistoryModal}
          className="text-xs rounded-xl cursor-pointer"
        >
          <History className="w-3.5 h-3.5 ml-1" />
          عرض السجل الكامل
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>لا توجد مدفوعات أو مذكرات مسجلة لهذا الطالب.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {payments.slice(0, 5).map((record: any) => {
              const isBooklet = record.paymentType === 'BOOKLET' || Boolean(record.bookletId);
              return (
                <li key={record.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      isBooklet ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isBooklet ? <BookOpen className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {isBooklet ? record.booklet?.title || 'مذكرة دراسية' : `اشتراك شهر ${record.periodMonth}/${record.periodYear}`}
                        </span>
                        {isBooklet ? (
                          <Badge variant="default" className="text-[10px] bg-purple-100 text-purple-800 border-purple-200">
                            مذكرة
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px] bg-blue-100 text-blue-800 border-blue-200">
                            اشتراك شهري
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(record.createdAt).toLocaleDateString('ar-EG')} • {record.group?.name || 'عام'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <span className={`font-extrabold text-sm ${record.paymentStatus === 'REFUNDED' ? 'text-slate-400 line-through' : 'text-emerald-700'}`}>
                        {record.amountPaid} ج.م
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {record.paymentStatus === 'REFUNDED' ? 'مسترد' : 'مسدد'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      onClick={() =>
                        onSelectPaymentToCancel({
                          id: record.id,
                          studentName,
                          amountPaid: record.amountPaid,
                          paymentType: record.paymentType as any,
                          periodMonth: record.periodMonth,
                          periodYear: record.periodYear,
                          groupName: record.group?.name,
                          bookletTitle: record.booklet?.title,
                          notes: record.notes || undefined,
                        })
                      }
                      title="إلغاء أو حذف الدفعة"
                    >
                      <Trash2 className="w-3.5 h-3.5 ml-1" />
                      إلغاء / حذف
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
