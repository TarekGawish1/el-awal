'use client';

import { useState } from 'react';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useGroupDefaulters, usePayments, useDeletePayment } from '../hooks/useFinance';
import { RecordPaymentModal } from './RecordPaymentModal';
import { StudentHistoryModal } from './StudentHistoryModal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { 
  Users, 
  Search, 
  DollarSign, 
  AlertTriangle, 
  History,
  Trash2,
  Calendar,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';

export function FinanceDashboard() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  const { data: groups = [], isLoading: isGroupsLoading } = useGroups();
  
  const { 
    data: defaultersData, 
    isLoading: isDefaultersLoading,
    isError: isDefaultersError
  } = useGroupDefaulters(selectedGroupId, periodYear, periodMonth);
  
  const { 
    data: paymentsData,
    isLoading: isPaymentsLoading,
  } = usePayments({ 
    groupId: selectedGroupId || undefined, 
    periodYear, 
    periodMonth,
    limit: 100 // We fetch 100 just to display recent payments for this group/month
  });

  const { mutate: deletePayment, isPending: isDeleting } = useDeletePayment();

  const handleDelete = (id: string, studentName: string) => {
    if (window.confirm(`هل أنت متأكد من حذف دفعة الطالب ${studentName}؟`)) {
      deletePayment(id, {
        onSuccess: () => toast.success('تم حذف الدفعة بنجاح'),
        onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء החذف'),
      });
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  const payments = paymentsData?.pages[0]?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة المصروفات المالية</h1>
          <p className="text-slate-500 mt-1">متابعة وتسجيل سداد المصروفات للمجموعات</p>
        </div>
        <Button onClick={() => setIsRecordModalOpen(true)} disabled={!selectedGroupId}>
          <DollarSign className="w-4 h-4 ml-2" />
          تسجيل سداد جديد
        </Button>
      </div>

      {/* Filters Card */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-sm font-bold text-slate-700 mb-2">المجموعة</label>
          <select
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-primary/20"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">اختر المجموعة...</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name} - {g.gradeLevel}</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-sm font-bold text-slate-700 mb-2">شهر الاستحقاق</label>
          <select
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-primary/20"
            value={periodMonth}
            onChange={(e) => setPeriodMonth(Number(e.target.value))}
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-sm font-bold text-slate-700 mb-2">السنة</label>
          <select
            className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-primary/20"
            value={periodYear}
            onChange={(e) => setPeriodYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedGroupId ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">يرجى اختيار مجموعة</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2">اختر مجموعة تعليمية وشهر استحقاق لعرض تفاصيل المصروفات والطلاب المتأخرين عن السداد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Defaulters Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                الطلاب المتأخرين ({defaultersData?.totalDefaulters || 0})
              </h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {isDefaultersLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : isDefaultersError ? (
                <Alert variant="error"><p>حدث خطأ أثناء جلب البيانات</p></Alert>
              ) : defaultersData?.defaulters.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">لا يوجد متأخرين</h3>
                  <p className="text-xs text-slate-500 mt-1">جميع طلاب هذه المجموعة سددوا مصروفات هذا الشهر.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {defaultersData?.defaulters.map(student => (
                    <div key={student.studentId} className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/30">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{student.fullName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">المطلوب: {student.monthlyFeeExpected} ج.م</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-xs bg-white" onClick={() => setHistoryStudentId(student.studentId)}>
                        <History className="w-3 h-3 ml-1" />
                        سجل السداد
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Paid Students Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-500" />
                آخر الدفعات المسجلة
              </h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {isPaymentsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">لا توجد دفعات</h3>
                  <p className="text-xs text-slate-500 mt-1">لم يتم تسجيل أي دفعات لهذه المجموعة في هذا الشهر.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{payment.student?.user.fullName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="success" className="text-[10px] h-5">تم الدفع {payment.amountPaid} ج.م</Badge>
                          {payment.receiptNumber && (
                            <span className="text-[10px] text-slate-500">إيصال: {payment.receiptNumber}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          onClick={() => setHistoryStudentId(payment.studentId)}
                          title="سجل الطالب"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button 
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          onClick={() => handleDelete(payment.id, payment.student?.user.fullName || '')}
                          disabled={isDeleting}
                          title="حذف الدفعة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      )}

      {selectedGroupId && (
        <RecordPaymentModal 
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          groupId={selectedGroupId}
          periodYear={periodYear}
          periodMonth={periodMonth}
        />
      )}

      {historyStudentId && (
        <StudentHistoryModal
          isOpen={!!historyStudentId}
          onClose={() => setHistoryStudentId(null)}
          studentId={historyStudentId}
        />
      )}
    </div>
  );
}
