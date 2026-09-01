'use client';

import { useState } from 'react';
import { X, History, Trash2, BookOpen, CreditCard, Printer, RotateCcw } from 'lucide-react';
import { useStudentPaymentHistory } from '../hooks/useFinance';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { CancelPaymentModal, PaymentSummaryInfo } from './CancelPaymentModal';
import { CreatorBadge } from '@/components/ui/CreatorBadge';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
}

export function StudentHistoryModal({ isOpen, onClose, studentId }: Props) {
  const [paymentToCancel, setPaymentToCancel] = useState<PaymentSummaryInfo | null>(null);
  const { data: history, isLoading } = useStudentPaymentHistory(studentId);

  const handlePrintReceipt = (record: any) => {
    const isBooklet = record.paymentType === 'BOOKLET' || Boolean(record.bookletId);
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    if (!printWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>إيصال سداد - ${studentName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .label { color: #64748b; font-weight: 500; }
            .value { font-weight: bold; color: #0f172a; }
            .total { font-size: 18px; font-weight: 900; color: #16a34a; margin-top: 12px; padding: 12px; background: #f0fdf4; border-radius: 8px; text-align: center; }
            .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">منصة الأول التعليمية</h1>
            <p class="subtitle">إيصال تحصيل وسداد رسمي</p>
          </div>
          <div class="row"><span class="label">اسم الطالب:</span><span class="value">${studentName}</span></div>
          <div class="row"><span class="label">نوع المعاملة:</span><span class="value">${isBooklet ? 'سداد مذكرة / ملزمة دراسية' : 'اشتراك شهري'}</span></div>
          ${isBooklet && record.booklet?.title ? `<div class="row"><span class="label">عنوان المذكرة:</span><span class="value">${record.booklet.title}</span></div>` : ''}
          ${record.group?.name ? `<div class="row"><span class="label">المجموعة:</span><span class="value">${record.group.name}</span></div>` : ''}
          <div class="row"><span class="label">تاريخ التحصيل:</span><span class="value">${new Date(record.createdAt).toLocaleDateString('ar-EG')}</span></div>
          ${record.receiptNumber ? `<div class="row"><span class="label">رقم الإيصال:</span><span class="value">${record.receiptNumber}</span></div>` : ''}
          <div class="total">المبلغ المدفوع: ${record.amountPaid} جنيه مصري</div>
          <div class="footer">شكراً لثقتكم بنا • تم إصدار الإيصال إلكترونياً</div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const studentName =
    history && history.length > 0 ? history[0].student?.user?.fullName || 'سجل السداد' : 'سجل السداد';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            سجل مدفوعات ومذكرات الطالب: {studentName}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-white text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">لا توجد سجلات</h3>
              <p className="text-xs text-slate-500 mt-1">لم يتم تسجيل أي مدفوعات أو مذكرات سابقة لهذا الطالب.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record) => {
                const isBooklet = record.paymentType === 'BOOKLET' || Boolean(record.bookletId);

                return (
                  <div
                    key={record.id}
                    className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-4 justify-between transition-all ${
                      isBooklet ? 'border-purple-200/80 bg-purple-50/10' : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-lg ${record.paymentStatus === 'REFUNDED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{record.amountPaid} ج.م</span>
                        {record.paymentStatus === 'REFUNDED' ? (
                          <Badge variant="error" className="h-5 text-[10px] bg-rose-100 text-rose-700 border-rose-200">
                            مسترد / ملغي
                          </Badge>
                        ) : (
                          <Badge variant="success" className="h-5 text-[10px]">
                            مسدد
                          </Badge>
                        )}
                        {isBooklet ? (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                            <BookOpen className="w-3.5 h-3.5" />
                            مذكرة: {record.booklet?.title || 'ملزمة دراسية'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            <CreditCard className="w-3.5 h-3.5" />
                            اشتراك شهري ({record.periodMonth}/{record.periodYear})
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600">
                        المجموعة: <span className="font-bold text-slate-800">{record.group?.name || 'عام'}</span>
                      </div>

                      {record.notes && (
                        <div className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-100">
                          ملاحظة: {record.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between border-t sm:border-t-0 sm:border-r border-slate-100 pt-3 sm:pt-0 sm:pr-4 text-xs text-slate-500">
                      <div className="text-left w-full sm:w-auto space-y-1">
                        <CreatorBadge
                          recordedByName={record.recordedBy?.fullName || 'المعلم'}
                          createdAt={record.createdAt}
                        />
                        <div>التاريخ: {new Date(record.createdAt).toLocaleDateString('ar-EG')}</div>
                        {record.receiptNumber && <div>رقم الإيصال: {record.receiptNumber}</div>}
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                          onClick={() => handlePrintReceipt(record)}
                          title="طباعة الإيصال"
                        >
                          <Printer className="w-3 h-3 ml-1" />
                          إيصال
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() =>
                            setPaymentToCancel({
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
                          <Trash2 className="w-3 h-3 ml-1" />
                          إلغاء / حذف
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CancelPaymentModal
        isOpen={Boolean(paymentToCancel)}
        onClose={() => setPaymentToCancel(null)}
        payment={paymentToCancel}
      />
    </div>
  );
}
