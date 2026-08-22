'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useGroupDefaulters, usePayments, useDeletePayment } from '../hooks/useFinance';
import { RecordPaymentModal } from './RecordPaymentModal';
import { StudentHistoryModal } from './StudentHistoryModal';
import { FinanceQrScanner } from './FinanceQrScanner';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { 
  Users, 
  Search, 
  DollarSign, 
  AlertTriangle, 
  History, 
  Trash2, 
  Calendar, 
  Wallet, 
  QrCode,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { BookletManagementSection } from '@/features/booklets/components/BookletManagementSection';
import toast from 'react-hot-toast';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export function FinanceDashboard() {
  const searchParams = useSearchParams();
  const paramGroupId = searchParams.get('groupId');
  const paramYear = searchParams.get('year');
  const paramMonth = searchParams.get('month');
  const paramTab = searchParams.get('tab');

  const [selectedGroupId, setSelectedGroupId] = useState<string>(paramGroupId || '');
  const [periodYear, setPeriodYear] = useState<number>(
    paramYear && !isNaN(Number(paramYear)) ? Number(paramYear) : new Date().getFullYear()
  );
  const [periodMonth, setPeriodMonth] = useState<number>(
    paramMonth && !isNaN(Number(paramMonth)) ? Number(paramMonth) : new Date().getMonth() + 1
  );
  const [activeTab, setActiveTab] = useState<'QR' | 'MANUAL' | 'BOOKLETS'>(
    paramTab === 'booklets' ? 'BOOKLETS' : 'QR'
  );
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (paramGroupId) {
      setSelectedGroupId(paramGroupId);
    }
    if (paramYear && !isNaN(Number(paramYear))) {
      setPeriodYear(Number(paramYear));
    }
    if (paramMonth && !isNaN(Number(paramMonth))) {
      setPeriodMonth(Number(paramMonth));
    }
    if (paramTab === 'booklets') {
      setActiveTab('BOOKLETS');
    }
  }, [paramGroupId, paramYear, paramMonth, paramTab]);

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
    limit: 100
  });

  const [paymentToDelete, setPaymentToDelete] = useState<{ id: string; studentName: string } | null>(null);
  const { mutate: deletePayment, isPending: isDeleting } = useDeletePayment();

  const handleDelete = (id: string, studentName: string) => {
    setPaymentToDelete({ id, studentName });
  };

  const handleConfirmDelete = () => {
    if (!paymentToDelete) return;
    deletePayment(paymentToDelete.id, {
      onSuccess: () => {
        toast.success('تم حذف الدفعة بنجاح');
        setPaymentToDelete(null);
      },
      onError: (err: any) => toast.error(err.message || 'حدث خطأ أثناء الحذف'),
    });
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  const payments = paymentsData?.pages[0]?.data || [];
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">إدارة المصروفات وسداد الطلاب</h1>
            <p className="mt-1 sm:mt-3 text-slate-500 text-sm sm:text-lg">
              امسح رمز الـ QR الخاص بأي طالب مباشرة لتسجيل سداد المصروفات فورياً وتحديد مجموعته أو مذكراته تلقائياً.
            </p>
          </div>
          {selectedGroupId && activeTab === 'MANUAL' && (
            <Button 
              onClick={() => setIsRecordModalOpen(true)}
              className="w-full sm:w-auto rounded-xl shadow-sm"
            >
              <DollarSign className="w-4 h-4 ml-1.5" />
              تسجيل سداد يدوي
            </Button>
          )}
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <Button
          variant={activeTab === 'QR' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('QR')}
          className={`flex-1 sm:flex-none sm:w-48 rounded-xl ${activeTab === 'QR' ? 'shadow-md shadow-primary-500/20' : ''}`}
        >
          <QrCode className="w-4 h-4 ml-2" />
          الماسح الذكي (QR)
        </Button>
        <Button
          variant={activeTab === 'MANUAL' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('MANUAL')}
          className={`flex-1 sm:flex-none sm:w-48 rounded-xl ${activeTab === 'MANUAL' ? 'shadow-md shadow-primary-500/20' : ''}`}
        >
          <ClipboardList className="w-4 h-4 ml-2" />
          رصد يدوي للمصروفات
        </Button>
        <Button
          variant={activeTab === 'BOOKLETS' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('BOOKLETS')}
          className={`flex-1 sm:flex-none sm:w-56 rounded-xl ${activeTab === 'BOOKLETS' ? 'shadow-md shadow-purple-500/20 bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
        >
          <BookOpen className="w-4 h-4 ml-2" />
          المذكرات والملازم الدراسية
        </Button>
      </div>

      {activeTab === 'BOOKLETS' ? (
        <BookletManagementSection groups={groups} />
      ) : (
        <>
          {/* Filters Toolbar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
            {activeTab === 'MANUAL' ? (
              <div className="flex-1 min-w-[250px] animate-in fade-in duration-200">
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary-600" />
                  المجموعة الدراسية (مطلوبة للرصد اليدوي)
                </label>
                <select
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 bg-white"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">اختر المجموعة لعرض الطلاب المتأخرين...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} - {g.gradeLevel} ({g.monthlyFee} ج.م)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1 min-w-[250px] py-2 text-slate-500 text-xs flex items-center gap-2 bg-slate-50/70 px-4 rounded-xl border border-slate-100">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                <span className="font-medium text-slate-600">
                  الماسح الذكي يتعرف تلقائياً على مجموعة الطالب وقيمة اشتراكه أو مذكراته فور قراءة الرمز.
                </span>
              </div>
            )}

            {/* Period Selector */}
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="w-1/2 sm:w-28">
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary-600" />
                  الشهر
                </label>
                <select
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 bg-white"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m} ({ARABIC_MONTHS[m - 1]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-1/2 sm:w-28">
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  السنة
                </label>
                <select
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 bg-white"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Main Mode View */}
          <div className="space-y-6">
            <Card className="rounded-2xl sm:rounded-3xl border-slate-100 overflow-hidden shadow-sm">
              <CardContent className="p-6">
                {activeTab === 'QR' ? (
                  <FinanceQrScanner 
                    groupId={selectedGroupId || undefined} 
                    periodYear={periodYear} 
                    periodMonth={periodMonth} 
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800">
                        {selectedGroupId ? `الطلاب المتأخرين - ${selectedGroup?.name}` : 'الطلاب المتأخرين عن السداد'}
                      </h3>
                      {selectedGroupId && (
                        <Button size="sm" onClick={() => setIsRecordModalOpen(true)}>
                          <DollarSign className="w-4 h-4 ml-1" />
                          تسجيل دفعة
                        </Button>
                      )}
                    </div>
                    
                    {!selectedGroupId ? (
                      <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm font-semibold text-slate-700">يرجى اختيار مجموعة من القائمة أعلاه لعرض قائمة الطلاب المتأخرين الخاصة بها</p>
                        <p className="text-xs text-slate-500 mt-1">يمكنك استخدام ماسح الـ QR في أي وقت بدون اختيار مجموعة</p>
                      </div>
                    ) : isDefaultersLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </div>
                    ) : defaultersData?.defaulters?.length === 0 ? (
                      <div className="text-center py-8 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <p className="text-sm font-bold text-emerald-800">تم سداد المصروفات لجميع الطلاب في هذه المجموعة!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                        {defaultersData?.defaulters?.map((student: any) => (
                          <div key={student.studentId} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{student.studentName || student.fullName}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{student.studentCode} • {student.parentPhone || 'بدون هاتف'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-red-600 text-sm">{student.monthlyFeeExpected} ج.م</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsRecordModalOpen(true);
                                }}
                                className="text-xs rounded-lg"
                              >
                                تحصيل
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Bottom Dual Lists: Defaulters & Paid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Defaulters Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[450px] overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  الطلاب المتأخرين {selectedGroupId ? `(${defaultersData?.totalDefaulters || 0})` : ''}
                </h2>
              </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {!selectedGroupId ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">اختر مجموعة</h3>
                  <p className="text-xs text-slate-500 mt-1">اختر مجموعة من القائمة لعرض المتأخرين فيها.</p>
                </div>
              ) : isDefaultersLoading ? (
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
                  {defaultersData?.defaulters.map((student) => (
                    <div key={student.studentId} className="flex items-center justify-between p-3 rounded-xl border border-red-100 bg-red-50/30">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{student.fullName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">المطلوب: {student.monthlyFeeExpected} ج.م</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-xs bg-white rounded-lg" onClick={() => setHistoryStudentId(student.studentId)}>
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
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[450px] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-500" />
                سجل المدفوعات المسجلة ({payments.length})
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
                  <h3 className="text-sm font-bold text-slate-800">لا توجد دفعات مسجلة</h3>
                  <p className="text-xs text-slate-500 mt-1">لم يتم تسجيل أي دفعات لهذا الشهر بعد.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{payment.student?.user?.fullName || 'طالب'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="success" className="text-[10px] h-5">تم الدفع {payment.amountPaid} ج.م</Badge>
                          {payment.group?.name && (
                            <span className="text-[10px] font-medium text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded">
                              {payment.group.name}
                            </span>
                          )}
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
                          onClick={() => handleDelete(payment.id, payment.student?.user?.fullName || '')}
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
        </>
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

      <ConfirmModal
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="تأكيد حذف الدفعة"
        message={`هل أنت متأكد من حذف دفعة الطالب "${paymentToDelete?.studentName}" نهائياً من السجلات المالية؟`}
        confirmText="حذف الدفعة"
        cancelText="تراجع"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
