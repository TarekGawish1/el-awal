'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, FileText, Printer, XCircle } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMatrixLedger, useBillingConfiguration, useUpdateBillingConfiguration } from '../hooks/useFinance';
import { MatrixLedgerStudent } from '../types/finance.types';
import { StudentHistoryModal } from './StudentHistoryModal';
import { CancelPaymentModal, PaymentSummaryInfo } from './CancelPaymentModal';
import { FinanceFiltersBar, TERM_MONTHS } from './FinanceFiltersBar';
import { DEFAULT_ACADEMIC_TERM, STORAGE_TERM_KEY, STORAGE_YEAR_KEY } from '@/features/groups/hooks/useAcademicPeriod';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function readStoredValue(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) && value[0] ? value[0] : fallback;
  } catch {
    return fallback;
  }
}

function formatAmount(amount: number) {
  return `${Number(amount || 0).toLocaleString('ar-EG')} ج.م`;
}

function formatPaidAt(value?: string | Date) {
  return value ? new Date(value).toLocaleDateString('ar-EG') : 'غير متاح';
}

function isMonthStarted(academicYear: string, academicTerm: 'FIRST_TERM' | 'SECOND_TERM', month: number) {
  const startYear = Number(academicYear.split('-')[0]) || new Date().getUTCFullYear();
  const actualYear = academicTerm === 'FIRST_TERM' && month === 1 ? startYear + 1 : academicTerm === 'SECOND_TERM' ? startYear + 1 : startYear;
  const now = new Date();
  return actualYear < now.getUTCFullYear() || (actualYear === now.getUTCFullYear() && month <= now.getUTCMonth() + 1);
}

function PaymentCell({
  student,
  kind,
  month,
  bookletId,
  academicYear,
  academicTerm,
  onSelectPaidCell,
}: {
  student: MatrixLedgerStudent;
  kind: 'TUITION' | 'BOOKLET';
  month?: number;
  bookletId?: string;
  academicYear: string;
  academicTerm: 'FIRST_TERM' | 'SECOND_TERM';
  onSelectPaidCell?: (cell: any) => void;
}) {
  const cell = kind === 'TUITION' ? student.monthlyPayments[month || 0] : student.bookletPayments[bookletId || ''];
  const started = kind === 'BOOKLET' || !month || isMonthStarted(academicYear, academicTerm, month);

  if (kind === 'BOOKLET' && cell?.isApplicable === false) {
    return <span className="text-slate-300 font-bold">—</span>;
  }

  if (cell?.isPaid) {
    return (
      <button
        type="button"
        onClick={() => onSelectPaidCell?.(cell)}
        className="flex min-w-24 flex-col items-center gap-1 p-1 rounded-lg hover:bg-emerald-50 active:scale-95 transition-all group cursor-pointer"
        title={`اضغط لإلغاء أو حذف الدفعة • تاريخ السداد: ${formatPaidAt(cell.paidAt)} - ${formatAmount(cell.amountPaid)}`}
      >
        <div className="flex items-center gap-1 text-emerald-600 group-hover:scale-110 transition-transform">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-bold text-emerald-700 group-hover:underline">
          مدفوع {formatAmount(cell.amountPaid)}
        </span>
      </button>
    );
  }

  if (!started) {
    return <span aria-label={`شهر ${month} لم يبدأ بعد`} className="text-lg font-bold text-slate-300">—</span>;
  }

  return (
    <span
      title={cell?.amountPaid ? `مدفوع جزئياً: ${formatAmount(cell.amountPaid)}` : 'غير مدفوع'}
      className="flex min-w-24 flex-col items-center gap-1"
    >
      <XCircle className="h-4 w-4 text-rose-500" />
      <span className="text-[10px] font-bold text-rose-600">
        {cell?.amountPaid ? `مدفوع ${formatAmount(cell.amountPaid)}` : 'غير مدفوع'}
      </span>
    </span>
  );
}

function calculateTotals(student: MatrixLedgerStudent, months: number[], booklets: Array<{ id: string; price: number; gradeLevel: string }>, academicYear: string, academicTerm: 'FIRST_TERM' | 'SECOND_TERM') {
  let totalPaid = 0;
  let totalDue = 0;
  months.forEach((month) => {
    const payment = student.monthlyPayments[month];
    totalPaid += payment?.amountPaid || 0;
    if (isMonthStarted(academicYear, academicTerm, month)) totalDue += Math.max(0, student.monthlyFee - (payment?.amountPaid || 0));
  });
  booklets.filter((booklet) => booklet.gradeLevel === student.gradeLevel).forEach((booklet) => {
    const payment = student.bookletPayments[booklet.id];
    if (payment?.isApplicable === false) return;
    totalPaid += payment?.amountPaid || 0;
    if (!payment?.isPaid) totalDue += Number(booklet.price);
  });
  return { totalPaid, totalDue };
}

export function FinancialMatrixLedger({ groups = [] }: { groups?: any[] }) {
  const defaultYear = new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
  const [academicYear, setAcademicYear] = useState(() => readStoredValue(STORAGE_YEAR_KEY, defaultYear));
  const [academicTerm, setAcademicTerm] = useState<'FIRST_TERM' | 'SECOND_TERM'>(() => readStoredValue(STORAGE_TERM_KEY, DEFAULT_ACADEMIC_TERM) as 'FIRST_TERM' | 'SECOND_TERM');
  const [stage, setStage] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [groupId, setGroupId] = useState('');
  const [search, setSearch] = useState('');
  const [excludedMonths, setExcludedMonths] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [paymentToCancel, setPaymentToCancel] = useState<PaymentSummaryInfo | null>(null);

  const { data: billingConfig } = useBillingConfiguration(academicYear, academicTerm);
  const { mutate: updateBillingConfig } = useUpdateBillingConfiguration();

  useEffect(() => {
    const sync = () => {
      setAcademicYear(readStoredValue(STORAGE_YEAR_KEY, defaultYear));
      setAcademicTerm(readStoredValue(STORAGE_TERM_KEY, DEFAULT_ACADEMIC_TERM) as 'FIRST_TERM' | 'SECOND_TERM');
    };
    window.addEventListener('el_awal_academic_period_changed', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('el_awal_academic_period_changed', sync); window.removeEventListener('storage', sync); };
  }, [defaultYear]);

  useEffect(() => {
    if (billingConfig) setExcludedMonths(billingConfig.excludedMonths || []);
  }, [billingConfig]);

  const query = { gradeLevel: gradeLevel || undefined, academicPeriodId: `${academicYear}:${academicTerm}`, academicYear, academicTerm, groupId: groupId || undefined, stage: stage || undefined, search: search || undefined, page, limit };
  const { data: ledger, isLoading, isError } = useMatrixLedger(query);
  useEffect(() => {
    if (!billingConfig && ledger?.excludedMonths) setExcludedMonths(ledger.excludedMonths);
  }, [billingConfig, ledger?.excludedMonths]);
  const termMonths = TERM_MONTHS[academicTerm];
  const months = termMonths.filter((month) => !excludedMonths.includes(month));
  const booklets = useMemo(() => (ledger?.booklets || []).filter((booklet) => !gradeLevel || booklet.gradeLevel === gradeLevel), [ledger?.booklets, gradeLevel]);
  const visibleStudents = useMemo(() => (ledger?.students || []).filter((student) => {
    if (gradeLevel && student.gradeLevel !== gradeLevel) return false;
    const value = search.trim().toLocaleLowerCase();
    return !value || student.fullName.toLocaleLowerCase().includes(value) || (student.studentCode || '').toLocaleLowerCase().includes(value);
  }), [ledger?.students, gradeLevel, search]);

  const setStageAndReset = (value: string) => { setStage(value); setGradeLevel(''); setGroupId(''); setPage(1); };
  const setGradeAndReset = (value: string) => { setGradeLevel(value); setGroupId(''); setPage(1); };
  const setGroupAndReset = (value: string) => { setGroupId(value); setPage(1); };
  const setTermAndReset = (value: 'FIRST_TERM' | 'SECOND_TERM') => {
    setAcademicTerm(value);
    setExcludedMonths([]);
    setPage(1);
    try {
      localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify([value]));
      window.dispatchEvent(new Event('el_awal_academic_period_changed'));
    } catch {
      // The server-backed switcher remains authoritative when local storage is unavailable.
    }
  };

  const toggleMonth = (month: number) => {
    const next = excludedMonths.includes(month) ? excludedMonths.filter((item) => item !== month) : [...excludedMonths, month];
    setExcludedMonths(next);
    setPage(1);
    updateBillingConfig({ academicYear, academicTerm, excludedMonths: next });
  };

  const exportLedger = () => {
    if (!ledger) return;
    const headers = ['الطالب', 'كود الطالب', ...months.map((month) => `اشتراك ${ARABIC_MONTHS[month - 1]}`), ...booklets.map((booklet) => booklet.title), 'إجمالي المدفوع', 'إجمالي المتبقي'];
    const rows = visibleStudents.map((student) => { const totals = calculateTotals(student, months, booklets, academicYear, academicTerm); return [student.fullName, student.studentCode || '', ...months.map((month) => student.monthlyPayments[month]?.amountPaid || 0), ...booklets.map((booklet) => student.bookletPayments[booklet.id]?.amountPaid || 0), totals.totalPaid, totals.totalDue]; });
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'سجل-المدفوعات-الشامل.csv'; link.click(); URL.revokeObjectURL(link.href);
  };

  const totalStudents = ledger?.totalStudents ?? visibleStudents.length;
  const totalPages = ledger?.totalPages ?? Math.max(1, Math.ceil(totalStudents / limit));
  const currentPage = ledger?.currentPage ?? page;
  const firstShown = totalStudents === 0 ? 0 : (currentPage - 1) * limit + 1;
  const lastShown = Math.min(currentPage * limit, totalStudents);

  return (
    <div className="space-y-5">
      <Card className="border-none bg-gradient-to-l from-primary-700 to-primary-900 text-white shadow-lg"><CardContent className="flex items-center justify-between gap-4 p-6"><div><p className="text-xs font-bold text-primary-100">Financial Matrix Ledger</p><h2 className="mt-1 text-2xl font-extrabold">سجل المدفوعات الشامل</h2><p className="mt-1 text-sm text-primary-100">مصفوفة موحّدة لاشتراكات الطلاب والمذكرات حسب الفترة الدراسية.</p></div><FileSpreadsheet className="hidden h-14 w-14 text-white/20 sm:block" /></CardContent></Card>

      <FinanceFiltersBar groups={groups} stage={stage} gradeLevel={gradeLevel} groupId={groupId} academicYear={academicYear} academicTerm={academicTerm} search={search} onStageChange={setStageAndReset} onGradeChange={setGradeAndReset} onGroupChange={setGroupAndReset} onTermChange={setTermAndReset} onSearchChange={(value) => { setSearch(value); setPage(1); }} />

      <Card><CardContent className="p-4"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-extrabold text-slate-700">الشهور المحتسبة في الترم الحالي:</span>{termMonths.map((month) => { const excluded = excludedMonths.includes(month); return <label key={month} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${excluded ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><input type="checkbox" checked={!excluded} onChange={() => toggleMonth(month)} className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600" />{month} {ARABIC_MONTHS[month - 1]}</label>; })}</div></CardContent></Card>

      <Card className="overflow-hidden"><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary-600" />مصفوفة السداد ({totalStudents} طالب)</CardTitle><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={exportLedger}><Download className="h-4 w-4" />تصدير كشف Excel</Button><Button type="button" size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />طباعة التقرير</Button></div></CardHeader><CardContent className="p-0">
         {!stage || !gradeLevel ? <div className="p-12 text-center text-sm font-semibold text-slate-500">اختر المرحلة والصف لعرض سجل المدفوعات.</div> : isLoading ? <div className="space-y-3 p-5"><Skeleton className="h-12 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : isError ? <div className="p-5"><Alert variant="error">تعذر تحميل سجل المدفوعات الشامل.</Alert></div> : visibleStudents.length === 0 ? <div className="p-12 text-center text-sm font-semibold text-slate-500">لا توجد نتائج مطابقة للفلاتر الحالية.</div> : <div className="overflow-x-auto"><table className="min-w-max border-collapse text-right text-xs"><thead><tr className="bg-slate-50 text-slate-600"><th className="sticky right-0 z-20 min-w-56 border-b border-l border-slate-200 bg-slate-50 p-4 text-right">بيانات الطالب</th>{months.map((month) => <th key={month} className="min-w-28 border-b border-slate-200 p-3 text-center"><span className="block font-extrabold">اشتراك {month}</span><span className="mt-1 block text-[10px] font-normal">{ARABIC_MONTHS[month - 1]}</span></th>)}{booklets.map((booklet) => <th key={booklet.id} className="min-w-36 border-b border-slate-200 p-3 text-center"><span className="block font-extrabold">{booklet.title}</span><span className="mt-1 block text-[10px] font-normal">{formatAmount(booklet.price)}</span></th>)}<th className="min-w-32 border-b border-slate-200 p-3 text-center">الإجمالي والمتبقي</th><th className="min-w-32 border-b border-slate-200 p-3 text-center">إجراءات</th></tr></thead><tbody>{visibleStudents.map((student) => { const totals = calculateTotals(student, months, booklets, academicYear, academicTerm); return <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/60"><td className="sticky right-0 z-10 border-l border-slate-200 bg-white p-4"><p className="font-extrabold text-slate-800">{student.fullName}</p><p className="mt-1 font-mono text-[10px] text-slate-500">{student.studentCode || student.id}</p><Badge variant="outline" size="sm" className="mt-2 max-w-52 truncate">{student.groupName}</Badge></td>{months.map((month) => <td key={month} className="border-l border-slate-100 p-2 text-center"><PaymentCell student={student} kind="TUITION" month={month} academicYear={academicYear} academicTerm={academicTerm} onSelectPaidCell={(cell) => { if (cell?.paymentId) { setPaymentToCancel({ id: cell.paymentId, studentName: student.fullName, amountPaid: cell.amountPaid, paymentType: 'TUITION', periodMonth: month, periodYear: Number(academicYear.split('-')[0]), groupName: student.groupName }); } else { setHistoryStudentId(student.id); } }} /></td>)}{booklets.map((booklet) => <td key={booklet.id} className="border-l border-slate-100 p-2 text-center"><PaymentCell student={student} kind="BOOKLET" bookletId={booklet.id} academicYear={academicYear} academicTerm={academicTerm} onSelectPaidCell={(cell) => { if (cell?.paymentId) { setPaymentToCancel({ id: cell.paymentId, studentName: student.fullName, amountPaid: cell.amountPaid, paymentType: 'BOOKLET', bookletTitle: booklet.title, groupName: student.groupName }); } else { setHistoryStudentId(student.id); } }} /></td>)}<td className="border-l border-slate-100 p-3 text-center"><Badge variant="success" className="mb-1">مدفوع {formatAmount(totals.totalPaid)}</Badge><Badge variant={totals.totalDue > 0 ? 'error' : 'neutral'}>متبقي {formatAmount(totals.totalDue)}</Badge></td><td className="p-3 text-center"><Button type="button" size="sm" variant="outline" onClick={() => setHistoryStudentId(student.id)}><FileText className="h-3.5 w-3.5" />كشف حساب</Button></td></tr>; })}</tbody></table></div>}
      </CardContent></Card>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-xs sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-slate-500">عرض {firstShown}-{lastShown} من أصل {totalStudents} طالب</span><div className="flex flex-wrap items-center gap-2"><label className="font-semibold text-slate-500">عدد الصفوف<select aria-label="عدد الصفوف" value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="mr-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5"><option value={15}>15</option><option value={25}>25</option><option value={50}>50</option></select></label><Button type="button" size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>السابق</Button><span className="min-w-16 text-center font-bold text-slate-700">{currentPage} / {totalPages}</span><Button type="button" size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((value) => value + 1)}>التالي</Button></div></div>

      {paymentToCancel && (
        <CancelPaymentModal
          isOpen={Boolean(paymentToCancel)}
          payment={paymentToCancel}
          onClose={() => setPaymentToCancel(null)}
        />
      )}
      {historyStudentId && <StudentHistoryModal isOpen={!!historyStudentId} studentId={historyStudentId} onClose={() => setHistoryStudentId(null)} />}
    </div>
  );
}
