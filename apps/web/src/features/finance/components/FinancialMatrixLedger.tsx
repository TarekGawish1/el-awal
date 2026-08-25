'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRecordPayment, useMatrixLedger } from '../hooks/useFinance';
import { MatrixLedgerStudent } from '../types/finance.types';
import { StudentHistoryModal } from './StudentHistoryModal';
import { DEFAULT_ACADEMIC_TERM, STORAGE_TERM_KEY, STORAGE_YEAR_KEY } from '@/features/groups/hooks/useAcademicPeriod';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const GRADE_LEVELS = [
  'الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي',
  'الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي',
  'الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي',
];

type PaymentTarget = {
  student: MatrixLedgerStudent;
  kind: 'TUITION' | 'BOOKLET';
  month?: number;
  bookletId?: string;
  label: string;
  amount: number;
};

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
  if (!value) return '';
  return new Date(value).toLocaleDateString('ar-EG');
}

function PaymentCell({
  student,
  target,
  onPay,
}: {
  student: MatrixLedgerStudent;
  target: Omit<PaymentTarget, 'student'>;
  onPay: (target: PaymentTarget) => void;
}) {
  const cell = target.kind === 'TUITION'
    ? student.monthlyPayments[target.month || 0]
    : student.bookletPayments[target.bookletId || ''];

  if (cell?.isPaid) {
    return (
      <div className="flex min-w-24 flex-col items-center gap-1" title={`تاريخ السداد: ${formatPaidAt(cell.paidAt)}${cell.amountPaid ? ` - ${formatAmount(cell.amountPaid)}` : ''}`}>
        <CheckCircle2 className="inline h-5 w-5 text-emerald-600" />
        <span className="text-[10px] font-bold text-emerald-700">{formatAmount(cell.amountPaid)}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPay({ ...target, student })}
      aria-label={`سداد ${target.label} للطالب ${student.fullName}`}
      className="group flex min-w-24 flex-col items-center gap-1 rounded-lg p-1 transition-colors hover:bg-rose-50"
    >
      <XCircle className="inline h-5 w-5 text-rose-500 transition-transform group-hover:scale-110" />
      <span className="text-[10px] font-bold text-rose-600">{cell?.amountPaid ? `مدفوع ${formatAmount(cell.amountPaid)}` : 'غير مدفوع'}</span>
    </button>
  );
}

function QuickPaymentModal({ target, onClose, academicYear, academicTerm }: { target: PaymentTarget; onClose: () => void; academicYear: string; academicTerm: 'FIRST_TERM' | 'SECOND_TERM' }) {
  const [amount, setAmount] = useState(String(target.amount));
  const { mutate: recordPayment, isPending } = useRecordPayment();
  const periodMonth = target.month || 1;
  const startYear = Number(academicYear.split('-')[0]) || new Date().getFullYear();
  const periodYear = academicTerm === 'FIRST_TERM' && periodMonth === 1 ? startYear + 1 : academicTerm === 'SECOND_TERM' ? startYear + 1 : startYear;

  const submit = () => {
    recordPayment({
      studentId: target.student.id,
      groupId: target.student.groupId || undefined,
      paymentType: target.kind,
      bookletId: target.bookletId,
      periodYear,
      periodMonth,
      amountPaid: Number(amount) || 0,
      amountExpected: target.amount,
      paymentStatus: 'PAID' as any,
      paymentMethod: 'CASH',
      notes: `سداد سريع: ${target.label}`,
    }, { onSuccess: onClose } as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div><p className="text-xs font-bold text-primary-600">سداد سريع</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">{target.label}</h2></div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold text-slate-800">{target.student.fullName}</p><p className="mt-1 font-mono text-xs text-slate-500">{target.student.studentCode || target.student.id}</p><p className="mt-1 text-xs text-slate-500">المجموعة: {target.student.groupName}</p></div>
          <label className="block text-xs font-bold text-slate-700">المبلغ المدفوع
            <Input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1.5" />
          </label>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="button" onClick={submit} isLoading={isPending}><CreditCard className="h-4 w-4" />تأكيد السداد</Button></div>
        </div>
      </div>
    </div>
  );
}

export function FinancialMatrixLedger({ groups = [] }: { groups?: any[] }) {
  const [academicYear, setAcademicYear] = useState(() => readStoredValue(STORAGE_YEAR_KEY, new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)));
  const [academicTerm, setAcademicTerm] = useState<'FIRST_TERM' | 'SECOND_TERM'>(() => readStoredValue(STORAGE_TERM_KEY, DEFAULT_ACADEMIC_TERM) as 'FIRST_TERM' | 'SECOND_TERM');
  const [gradeLevel, setGradeLevel] = useState('');
  const [stage, setStage] = useState('ALL');
  const [groupId, setGroupId] = useState('');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<PaymentTarget | null>(null);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setAcademicYear(readStoredValue(STORAGE_YEAR_KEY, academicYear));
      setAcademicTerm(readStoredValue(STORAGE_TERM_KEY, academicTerm) as 'FIRST_TERM' | 'SECOND_TERM');
    };
    window.addEventListener('el_awal_academic_period_changed', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('el_awal_academic_period_changed', sync); window.removeEventListener('storage', sync); };
  }, [academicTerm, academicYear]);

  const query = { gradeLevel: gradeLevel || undefined, academicPeriodId: `${academicYear}:${academicTerm}`, academicYear, academicTerm, groupId: groupId || undefined, stage: stage === 'ALL' ? undefined : stage, search: search || undefined };
  const { data: ledger, isLoading, isError } = useMatrixLedger(query);
  const visibleBooklets = useMemo(() => (ledger?.booklets || []).filter((booklet) => !gradeLevel || booklet.gradeLevel === gradeLevel), [ledger?.booklets, gradeLevel]);
  const visibleStudents = useMemo(() => (ledger?.students || []).filter((student) => {
    const matchesGrade = !gradeLevel || student.gradeLevel === gradeLevel;
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const matchesSearch = !normalizedSearch || student.fullName.toLocaleLowerCase().includes(normalizedSearch) || (student.studentCode || '').toLocaleLowerCase().includes(normalizedSearch);
    return matchesGrade && matchesSearch;
  }), [ledger?.students, gradeLevel, search]);
  const months = ledger?.months || (academicTerm === 'SECOND_TERM' ? [2, 3, 4, 5] : [8, 9, 10, 11, 12, 1]);

  const exportLedger = () => {
    if (!ledger) return;
    const headers = ['الطالب', 'كود الطالب', ...months.map((month) => `اشتراك ${ARABIC_MONTHS[month - 1]}`), ...visibleBooklets.map((booklet) => booklet.title), 'إجمالي المدفوع', 'إجمالي المتبقي'];
    const rows = visibleStudents.map((student) => [student.fullName, student.studentCode || '', ...months.map((month) => student.monthlyPayments[month]?.isPaid ? student.monthlyPayments[month].amountPaid : 0), ...visibleBooklets.map((booklet) => student.bookletPayments[booklet.id]?.isPaid ? student.bookletPayments[booklet.id].amountPaid : 0), student.totalPaid, student.totalDue]);
    const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'سجل-المدفوعات-الشامل.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-5">
      <Card className="border-none bg-gradient-to-l from-primary-700 to-primary-900 text-white shadow-lg">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-primary-100">Financial Matrix Ledger</p><h2 className="mt-1 text-2xl font-extrabold">سجل المدفوعات الشامل</h2><p className="mt-1 text-sm text-primary-100">مصفوفة موحّدة لاشتراكات الطلاب والمذكرات حسب الفترة الدراسية.</p></div><FileSpreadsheet className="hidden h-14 w-14 text-white/20 sm:block" /></CardContent>
      </Card>

      <Card><CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="text-xs font-bold text-slate-700">المرحلة الدراسية<select value={stage} onChange={(event) => setStage(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="ALL">كل المراحل</option><option value="SECONDARY">الثانوية</option><option value="PREPARATORY">الإعدادية</option><option value="PRIMARY">الابتدائية</option></select></label>
        <label className="text-xs font-bold text-slate-700">الصف الدراسي<select value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">كل الصفوف</option>{GRADE_LEVELS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-700">الفترة الدراسية<select value={academicTerm} onChange={(event) => setAcademicTerm(event.target.value as 'FIRST_TERM' | 'SECOND_TERM')} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="FIRST_TERM">{academicYear} - ترم أول</option><option value="SECOND_TERM">{academicYear} - ترم ثان</option></select></label>
        <label className="text-xs font-bold text-slate-700">المجموعة الدراسية<select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">جميع المجموعات</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-700 xl:col-span-2">بحث سريع<div className="relative mt-1.5"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم الطالب أو STU-..." className="pr-9" /></div></label>
        <div className="flex gap-2 xl:col-span-6"><Button type="button" variant="outline" onClick={exportLedger}><Download className="h-4 w-4" />تصدير كشف Excel</Button><Button type="button" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />طباعة التقرير</Button></div>
      </CardContent></Card>

      <Card className="overflow-hidden"><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary-600" />مصفوفة السداد ({visibleStudents.length} طالب)</CardTitle><Badge variant="neutral">{academicTerm === 'SECOND_TERM' ? 'ترم ثان' : 'ترم أول'} • {academicYear}</Badge></CardHeader><CardContent className="p-0">
        {isLoading ? <div className="space-y-3 p-5"><Skeleton className="h-12 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : isError ? <div className="p-5"><Alert variant="error">تعذر تحميل سجل المدفوعات الشامل.</Alert></div> : visibleStudents.length === 0 ? <div className="p-12 text-center text-sm font-semibold text-slate-500">لا توجد نتائج مطابقة للفلاتر الحالية.</div> : <div className="overflow-x-auto"><table className="min-w-max border-collapse text-right text-xs"><thead><tr className="bg-slate-50 text-slate-600"><th className="sticky right-0 z-20 min-w-56 border-b border-l border-slate-200 bg-slate-50 p-4 text-right">بيانات الطالب</th>{months.map((month) => <th key={month} className="min-w-28 border-b border-slate-200 p-3 text-center"><span className="block font-extrabold">اشتراك {month}</span><span className="mt-1 block text-[10px] font-normal">{ARABIC_MONTHS[month - 1]}</span></th>)}{visibleBooklets.map((booklet) => <th key={booklet.id} className="min-w-36 border-b border-slate-200 p-3 text-center"><span className="block font-extrabold">{booklet.title}</span><span className="mt-1 block text-[10px] font-normal">{formatAmount(booklet.price)}</span></th>)}<th className="min-w-32 border-b border-slate-200 p-3 text-center">الإجمالي والمتبقي</th><th className="min-w-36 border-b border-slate-200 p-3 text-center">إجراءات</th></tr></thead><tbody>{visibleStudents.map((student) => <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/60"><td className="sticky right-0 z-10 border-l border-slate-200 bg-white p-4"><p className="font-extrabold text-slate-800">{student.fullName}</p><p className="mt-1 font-mono text-[10px] text-slate-500">{student.studentCode || student.id}</p><Badge variant="outline" size="sm" className="mt-2 max-w-52 truncate">{student.groupName}</Badge></td>{months.map((month) => <td key={month} className="border-l border-slate-100 p-2 text-center"><PaymentCell student={student} target={{ kind: 'TUITION', month, label: `اشتراك شهر ${month}`, amount: student.monthlyFee - (student.monthlyPayments[month]?.amountPaid || 0) }} onPay={setTarget} /></td>)}{visibleBooklets.map((booklet) => <td key={booklet.id} className="border-l border-slate-100 p-2 text-center"><PaymentCell student={student} target={{ kind: 'BOOKLET', bookletId: booklet.id, label: booklet.title, amount: Number(booklet.price) - (student.bookletPayments[booklet.id]?.amountPaid || 0) }} onPay={setTarget} /></td>)}<td className="border-l border-slate-100 p-3 text-center"><Badge variant="success" className="mb-1">مدفوع {formatAmount(student.totalPaid)}</Badge><Badge variant={student.totalDue > 0 ? 'error' : 'neutral'}>متبقي {formatAmount(student.totalDue)}</Badge></td><td className="p-3 text-center"><div className="flex flex-col gap-2"><Button type="button" size="sm" onClick={() => setTarget({ student, kind: 'TUITION', month: months[0], label: `اشتراك شهر ${months[0]}`, amount: student.monthlyFee - (student.monthlyPayments[months[0]]?.amountPaid || 0) })}><CreditCard className="h-3.5 w-3.5" />سداد سريع</Button><Button type="button" size="sm" variant="outline" onClick={() => setHistoryStudentId(student.id)}><FileText className="h-3.5 w-3.5" />كشف حساب</Button></div></td></tr>)}</tbody></table></div>}
      </CardContent></Card>
      {target && <QuickPaymentModal target={target} academicYear={academicYear} academicTerm={academicTerm} onClose={() => setTarget(null)} />}
      {historyStudentId && <StudentHistoryModal isOpen={!!historyStudentId} studentId={historyStudentId} onClose={() => setHistoryStudentId(null)} />}
    </div>
  );
}
