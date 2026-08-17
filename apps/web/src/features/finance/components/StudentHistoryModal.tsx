'use client';

import { X, History, Trash2 } from 'lucide-react';
import { useStudentPaymentHistory, useDeletePayment } from '../hooks/useFinance';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
}

export function StudentHistoryModal({ isOpen, onClose, studentId }: Props) {
  const { data: history, isLoading } = useStudentPaymentHistory(studentId);
  const { mutate: deletePayment, isPending: isDeleting } = useDeletePayment();

  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
      deletePayment(id, {
        onSuccess: () => toast.success('تم حذف الدفعة بنجاح'),
        onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء החذف'),
      });
    }
  };

  const studentName = history && history.length > 0 ? history[0].student?.user.fullName : 'سجل السداد';

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            سجل مدفوعات: {studentName}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
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
              <p className="text-xs text-slate-500 mt-1">لم يتم تسجيل أي مدفوعات سابقة لهذا الطالب.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(record => (
                <div key={record.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-lg">{record.amountPaid} ج.م</span>
                      <Badge variant="success" className="h-5 text-[10px]">مسدد</Badge>
                      <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-md">
                        استحقاق {record.periodMonth}/{record.periodYear}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      مجموعة: <span className="font-bold text-slate-800">{record.group?.name || 'عام'}</span>
                    </div>
                    {record.notes && (
                      <div className="text-xs text-slate-500 bg-amber-50 text-amber-800 px-2 py-1 rounded border border-amber-100">
                        ملاحظة: {record.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end justify-between border-t sm:border-t-0 sm:border-r border-slate-100 pt-3 sm:pt-0 sm:pr-4 text-xs text-slate-500">
                    <div className="text-left w-full sm:w-auto space-y-1">
                      <div>المسجل: {record.recordedBy?.fullName}</div>
                      <div>التاريخ: {new Date(record.createdAt).toLocaleDateString('ar-EG')}</div>
                      {record.receiptNumber && <div>رقم الإيصال: {record.receiptNumber}</div>}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 h-7 text-xs border-red-200 text-red-500 hover:bg-red-50"
                      onClick={() => handleDelete(record.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-3 h-3 ml-1" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
