'use client';

import React, { useState, useMemo } from 'react';
import { useStudentProfile, useStudentPayments } from '@/features/student-portal/hooks/useStudentPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { DollarSign, Receipt, CreditCard, AlertCircle, CheckCircle2, RefreshCw, Landmark, Filter } from 'lucide-react';
import { formatArabicDate, formatNumber } from '@/lib/utils/formatters';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function StudentPaymentsPage() {
  const { data: profile, isLoading: isProfileLoading } = useStudentProfile();
  const { data: paymentsData, isLoading: isPaymentsLoading } = useStudentPayments();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const PAGE_SIZE = 8;

  const payments = paymentsData || [];

  const uniqueGroups = useMemo(() => {
    const map = new Map<string, string>();
    payments.forEach((p: any) => {
      if (p.group?.id && p.group?.name) map.set(p.group.id, p.group.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p: any) => {
      if (selectedGroupId && p.group?.id !== selectedGroupId) return false;
      if (selectedStatus && p.paymentStatus !== selectedStatus) return false;
      return true;
    });
  }, [payments, selectedGroupId, selectedStatus]);

  const totalPaid = filteredPayments
    .filter((p: any) => p.paymentStatus === 'PAID')
    .reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0);

  const totalPending = filteredPayments
    .filter((p: any) => p.paymentStatus === 'PENDING' || p.paymentStatus === 'OVERDUE')
    .reduce((sum: number, p: any) => sum + Math.max(0, (p.amountExpected || 0) - (p.amountPaid || 0)), 0);

  const overdueCount = filteredPayments.filter((p: any) => p.paymentStatus === 'OVERDUE').length;

  const totalPages = Math.ceil(filteredPayments.length / PAGE_SIZE);
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success" className="gap-1 font-medium"><CheckCircle2 className="w-3 h-3" /> مدفوع</Badge>;
      case 'PENDING':
        return <Badge variant="warning" className="gap-1 font-medium"><ClockIcon className="w-3 h-3" /> قيد الانتظار</Badge>;
      case 'OVERDUE':
        return <Badge variant="error" className="gap-1 font-medium"><AlertCircle className="w-3 h-3" /> متأخر</Badge>;
      case 'EXEMPT':
        return <Badge variant="neutral" className="gap-1 font-medium">معفى</Badge>;
      case 'REFUNDED':
        return <Badge variant="info" className="gap-1 font-medium"><RefreshCw className="w-3 h-3" /> مسترجع</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'نقداً';
      case 'CARD':
        return 'بطاقة ائتمان';
      case 'INSTAPAY':
        return 'إنستاباي (Instapay)';
      case 'VODAFONE_CASH':
        return 'فودافون كاش';
      default:
        return method || 'غير محدد';
    }
  };

  if (isProfileLoading || isPaymentsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">سجل المدفوعات والاشتراكات</h1>
        <p className="text-sm text-slate-500 mt-1">متابعة المصروفات الدراسية وحالة الدفع الخاصة بك للمجموعات التعليمية</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm shadow-slate-200/50 bg-gradient-to-br from-white to-slate-50/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">إجمالي المدفوعات</p>
              <h4 className="text-2xl font-extrabold text-slate-800 mt-1">{formatNumber(totalPaid)} EGP</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm shadow-slate-200/50 bg-gradient-to-br from-white to-slate-50/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">المدفوعات المستحقة</p>
              <h4 className="text-2xl font-extrabold text-slate-800 mt-1">{formatNumber(totalPending)} EGP</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm shadow-slate-200/50 bg-gradient-to-br from-white to-slate-50/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">الفواتير المتأخرة</p>
              <h4 className="text-2xl font-extrabold text-slate-800 mt-1">{overdueCount} {overdueCount === 1 ? 'فاتورة' : 'فواتير'}</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info notice box */}
      {totalPending > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">تنبيه بسداد المصروفات</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              لديك دفعات مستحقة بقيمة {formatNumber(totalPending)} EGP. يرجى التوجه للسكرتارية في المركز ودفع الرسوم المقررة لتجنب توقف حسابك أو تعليق الدخول للمحاضرات والامتحانات.
            </p>
          </div>
        </div>
      )}

      {/* Payments History Table */}
      <Card className="border-none shadow-sm shadow-slate-200/50 overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-md flex items-center gap-2 font-bold text-slate-800">
              <Receipt className="w-5 h-5 text-primary-600" />
              سجل إيصالات السداد التفصيلي
            </CardTitle>
            {payments.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                {uniqueGroups.length > 0 && (
                  <select
                    aria-label="تصفية حسب المجموعة"
                    value={selectedGroupId}
                    onChange={(e) => { setSelectedGroupId(e.target.value); setCurrentPage(1); }}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">جميع المجموعات</option>
                    {uniqueGroups.map(({ id, name }) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                )}
                <select
                  aria-label="تصفية حسب حالة الدفع"
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">جميع الحالات</option>
                  <option value="PAID">مدفوع</option>
                  <option value="PENDING">قيد الانتظار</option>
                  <option value="OVERDUE">متأخر</option>
                  <option value="EXEMPT">معفى</option>
                </select>
                {(selectedGroupId || selectedStatus) && (
                  <button
                    type="button"
                    onClick={() => { setSelectedGroupId(''); setSelectedStatus(''); setCurrentPage(1); }}
                    className="h-8 px-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                  >
                    إلغاء الفلتر
                  </button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">{payments.length === 0 ? 'لا توجد دفعات أو اشتراكات مسجلة بعد.' : 'لا توجد نتائج تطابق الفلتر المحدد.'}</p>
              <p className="text-xs text-slate-400 mt-1">{payments.length === 0 ? 'عند تسجيل السكرتارية أو المدرس لأي دفعة مالية، ستظهر التفاصيل هنا.' : 'جرّب تغيير خيارات الفلتر لعرض المزيد من النتائج.'}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500">
                      <th className="py-3.5 px-6 font-semibold">الفترة (الشهر/العام)</th>
                      <th className="py-3.5 px-6 font-semibold">المجموعة الدراسية / الدورة</th>
                      <th className="py-3.5 px-6 font-semibold">المبلغ المطلوب</th>
                      <th className="py-3.5 px-6 font-semibold">المبلغ المدفوع</th>
                      <th className="py-3.5 px-6 font-semibold">حالة الدفع</th>
                      <th className="py-3.5 px-6 font-semibold">طريقة السداد</th>
                      <th className="py-3.5 px-6 font-semibold">رقم الإيصال</th>
                      <th className="py-3.5 px-6 font-semibold">تاريخ التسجيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedPayments.map((p: any) => {
                      const monthName = p.periodMonth >= 1 && p.periodMonth <= 12 
                        ? ARABIC_MONTHS[p.periodMonth - 1] 
                        : `شهر ${p.periodMonth}`;
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-800">
                            {monthName} {p.periodYear}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-semibold text-slate-800 block">
                              {p.group?.name || 'عام / اشتراك منصة'}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-600 font-mono">
                            {formatNumber(p.amountExpected)} EGP
                          </td>
                          <td className="py-4 px-6 font-bold text-primary-600 font-mono">
                            {formatNumber(p.amountPaid)} EGP
                          </td>
                          <td className="py-4 px-6">
                            {getStatusBadge(p.paymentStatus)}
                          </td>
                          <td className="py-4 px-6 text-slate-500">
                            {p.paymentStatus === 'PAID' ? getPaymentMethodLabel(p.paymentMethod) : '—'}
                          </td>
                          <td className="py-4 px-6 text-xs font-mono text-slate-500">
                            {p.receiptNumber || '—'}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500">
                            {p.createdAt ? formatArabicDate(p.createdAt) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedPayments.map((p: any) => {
                  const monthName = p.periodMonth >= 1 && p.periodMonth <= 12 
                    ? ARABIC_MONTHS[p.periodMonth - 1] 
                    : `شهر ${p.periodMonth}`;

                  return (
                    <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {p.group?.name || 'اشتراك المجموعة التعليمية'}
                          </span>
                          <span className="text-[11px] font-semibold text-primary-600 block mt-0.5">
                            📅 {monthName} {p.periodYear}
                          </span>
                        </div>
                        {getStatusBadge(p.paymentStatus)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">المبلغ المطلوب:</span>
                          <span className="font-bold text-slate-700 font-mono">
                            {formatNumber(p.amountExpected)} EGP
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">المبلغ المدفوع:</span>
                          <span className="font-bold text-primary-600 font-mono">
                            {formatNumber(p.amountPaid)} EGP
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>
                          طريقة الدفع: <span className="font-medium text-slate-700">{p.paymentStatus === 'PAID' ? getPaymentMethodLabel(p.paymentMethod) : '—'}</span>
                        </span>
                        {p.receiptNumber && (
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            #{p.receiptNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredPayments.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                    itemLabel="إيصال"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Simple internal Clock icon component since Lucide might have different names
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
