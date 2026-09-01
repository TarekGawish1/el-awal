import { History, Trash2, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface Payment {
  id: string;
  studentId: string;
  amountPaid: number;
  paymentType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  receiptNumber?: string;
  notes?: string;
  student?: {
    user: {
      fullName: string;
    };
  };
  group?: {
    name: string;
  };
  booklet?: {
    title: string;
  };
}

interface PaymentLedgerTableProps {
  payments: Payment[];
  isLoading: boolean;
  onOpenHistory: (studentId: string) => void;
  onDeletePayment: (payment: any) => void;
  isDeleting?: boolean;
}

export function PaymentLedgerTable({ payments, isLoading, onOpenHistory, onDeletePayment, isDeleting }: PaymentLedgerTableProps) {
  if (isLoading) {
    return <div className="h-40 bg-slate-50 animate-pulse rounded-2xl border border-slate-100"></div>;
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-slate-50 border border-slate-100 rounded-2xl text-center">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
          <History className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">لا توجد مدفوعات مسجلة</h3>
        <p className="text-xs font-medium text-slate-500 mt-1">لم يتم تسجيل أي مدفوعات تطابق الفلاتر الحالية.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-600" />
          سجل المدفوعات المسجلة ({payments.length})
        </h3>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto max-h-[500px] hide-scrollbar relative">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500 font-semibold text-xs sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-5 py-3">الطالب</th>
              <th className="px-5 py-3">المجموعة</th>
              <th className="px-5 py-3">نوع الدفع</th>
              <th className="px-5 py-3">المبلغ</th>
              <th className="px-5 py-3">التاريخ</th>
              <th className="px-5 py-3">طريقة الدفع</th>
              <th className="px-5 py-3">الحالة</th>
              <th className="px-5 py-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3 font-bold text-slate-800">
                  {payment.student?.user?.fullName || 'طالب غير محدد'}
                </td>
                <td className="px-5 py-3 font-semibold text-slate-600">
                  {payment.group?.name || 'غير محدد'}
                </td>
                <td className="px-5 py-3 text-xs">
                  {payment.paymentType === 'BOOKLET' || payment.booklet ? (
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">مذكرة / ملزمة</span>
                  ) : (
                    <span className="font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded">اشتراك / حصص</span>
                  )}
                </td>
                <td className="px-5 py-3 font-extrabold text-slate-800">
                  {payment.amountPaid} ج.م
                </td>
                <td className="px-5 py-3 font-semibold text-slate-500 text-xs">
                  {new Date(payment.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-5 py-3 text-xs font-semibold text-slate-500">
                  {payment.paymentMethod === 'CASH' ? 'نقدي (Cash)' : payment.paymentMethod || 'CASH'}
                </td>
                <td className="px-5 py-3">
                  {payment.paymentStatus === 'REFUNDED' ? (
                    <Badge variant="error" className="text-[10px]">مسترد / ملغي</Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px]">مكتمل</Badge>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button 
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                      onClick={() => onOpenHistory(payment.studentId)}
                      title="سجل الطالب"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button 
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                      onClick={() => onDeletePayment(payment)}
                      disabled={isDeleting}
                      title="حذف الدفعة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
        {payments.map((payment) => (
          <div key={payment.id} className="p-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-slate-800 text-sm">{payment.student?.user?.fullName || 'طالب غير محدد'}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">{payment.group?.name || 'مجموعة غير محددة'}</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-emerald-600">{payment.amountPaid} ج.م</p>
                {payment.paymentStatus === 'REFUNDED' ? (
                  <Badge variant="error" className="text-[10px] mt-1">مسترد</Badge>
                ) : (
                  <Badge variant="success" className="text-[10px] mt-1">مكتمل</Badge>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                payment.paymentType === 'BOOKLET' || payment.booklet ? 'text-purple-700 bg-purple-50' : 'text-primary-700 bg-primary-50'
              }`}>
                {payment.paymentType === 'BOOKLET' || payment.booklet ? 'مذكرة / ملزمة' : 'اشتراك / حصص'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {new Date(payment.createdAt).toLocaleDateString('ar-EG')}
              </span>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-8 text-xs bg-white text-slate-600 border-slate-200"
                onClick={() => onOpenHistory(payment.studentId)}
              >
                <History className="w-3.5 h-3.5 ml-1.5" />
                سجل الطالب
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-8 text-xs bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                onClick={() => onDeletePayment(payment)}
                disabled={isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                إلغاء السداد
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
