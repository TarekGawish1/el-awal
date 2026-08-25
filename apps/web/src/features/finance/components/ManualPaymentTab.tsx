'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, History, Users, Wallet } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FinanceFiltersBar, TERM_MONTHS } from './FinanceFiltersBar';
import { RecordPaymentModal } from './RecordPaymentModal';
import { StudentHistoryModal } from './StudentHistoryModal';
import { useGroupDefaulters, usePayments } from '../hooks/useFinance';
import { DEFAULT_ACADEMIC_TERM, STORAGE_TERM_KEY, STORAGE_YEAR_KEY } from '@/features/groups/hooks/useAcademicPeriod';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const STAGE_GRADES: Record<string, string[]> = {
  PRIMARY: ['الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي', 'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي'],
  PREPARATORY: ['الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي'],
  SECONDARY: ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي'],
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

function inferStage(grade?: string) {
  return Object.entries(STAGE_GRADES).find(([, grades]) => grades.includes(grade || ''))?.[0] || '';
}

interface ManualPaymentTabProps {
  groups: any[];
  initialPeriodYear: number;
  initialPeriodMonth: number;
  initialGroupId?: string;
}

export function ManualPaymentTab({ groups, initialPeriodYear, initialPeriodMonth, initialGroupId = '' }: ManualPaymentTabProps) {
  const defaultYear = `${initialPeriodYear}-${initialPeriodYear + 1}`;
  const [academicYear, setAcademicYear] = useState(() => readStoredValue(STORAGE_YEAR_KEY, defaultYear));
  const [academicTerm, setAcademicTerm] = useState<'FIRST_TERM' | 'SECOND_TERM'>(() => readStoredValue(STORAGE_TERM_KEY, DEFAULT_ACADEMIC_TERM) as 'FIRST_TERM' | 'SECOND_TERM');
  const [stage, setStage] = useState('ALL');
  const [gradeLevel, setGradeLevel] = useState('');
  const [groupId, setGroupId] = useState(initialGroupId);
  const [periodMonth, setPeriodMonth] = useState(initialPeriodMonth);
  const [search, setSearch] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const nextYear = readStoredValue(STORAGE_YEAR_KEY, defaultYear);
      const nextTerm = readStoredValue(STORAGE_TERM_KEY, DEFAULT_ACADEMIC_TERM) as 'FIRST_TERM' | 'SECOND_TERM';
      setAcademicYear(nextYear);
      setAcademicTerm(nextTerm);
      setPeriodMonth((month) => TERM_MONTHS[nextTerm].includes(month) ? month : TERM_MONTHS[nextTerm][0]);
    };
    window.addEventListener('el_awal_academic_period_changed', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('el_awal_academic_period_changed', sync); window.removeEventListener('storage', sync); };
  }, [defaultYear]);

  useEffect(() => {
    setGroupId(initialGroupId);
  }, [initialGroupId]);

  useEffect(() => {
    if (TERM_MONTHS[academicTerm].includes(initialPeriodMonth)) setPeriodMonth(initialPeriodMonth);
  }, [academicTerm, initialPeriodMonth]);

  const startYear = Number(academicYear.split('-')[0]) || initialPeriodYear;
  const periodYear = academicTerm === 'FIRST_TERM' && periodMonth === 1 ? startYear + 1 : academicTerm === 'SECOND_TERM' ? startYear + 1 : startYear;
  const { data: defaultersData, isLoading: isDefaultersLoading, isError: isDefaultersError } = useGroupDefaulters(groupId, periodYear, periodMonth);
  const { data: paymentsData, isLoading: isPaymentsLoading } = usePayments({ groupId: groupId || undefined, periodYear, periodMonth, limit: 100 });
  const selectedGroup = groups.find((group) => group.id === groupId);
  const overdueStudents = useMemo(() => {
    const value = search.trim().toLocaleLowerCase();
    return (defaultersData?.defaulters || []).filter((student) => !value || student.fullName.toLocaleLowerCase().includes(value) || (student.studentCode || '').toLocaleLowerCase().includes(value));
  }, [defaultersData?.defaulters, search]);
  const recentPayments = paymentsData?.pages?.[0]?.data || [];

  const handleStageChange = (value: string) => { setStage(value); setGradeLevel(''); setGroupId(''); };
  const handleGradeChange = (value: string) => { setGradeLevel(value); setGroupId(''); };
  const handleTermChange = (value: 'FIRST_TERM' | 'SECOND_TERM') => {
    setAcademicTerm(value);
    setPeriodMonth(TERM_MONTHS[value][0]);
    setGroupId('');
    try {
      localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify([value]));
      window.dispatchEvent(new Event('el_awal_academic_period_changed'));
    } catch {
      // Keep the local filter usable if browser storage is unavailable.
    }
  };

  const visibleGroups = groups.filter((group) => (!gradeLevel || group.gradeLevel === gradeLevel) && (stage === 'ALL' || inferStage(group.gradeLevel) === stage));
  const allStudents = (defaultersData?.defaulters || []).map((student) => ({ id: student.studentId, fullName: student.fullName, studentCode: student.studentCode || undefined, gradeLevel: student.gradeLevel, groupId }));

  return (
    <div className="space-y-5">
      <FinanceFiltersBar groups={visibleGroups} stage={stage} gradeLevel={gradeLevel} groupId={groupId} academicYear={academicYear} academicTerm={academicTerm} periodMonth={periodMonth} search={search} onStageChange={handleStageChange} onGradeChange={handleGradeChange} onGroupChange={setGroupId} onTermChange={handleTermChange} onMonthChange={setPeriodMonth} onSearchChange={setSearch} />

      <Card><CardHeader><div className="flex w-full items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-rose-500" />الطلاب المتأخرين عن السداد{selectedGroup ? ` - ${selectedGroup.name}` : ''}</CardTitle>{groupId && <Button type="button" onClick={() => setIsRecordModalOpen(true)}>تسجيل دفعة</Button>}</div></CardHeader><CardContent>
        {!groupId ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center"><Users className="mx-auto mb-2 h-8 w-8 text-slate-400" /><p className="text-sm font-bold text-slate-700">اختر مجموعة لعرض الطلاب المتأخرين</p><p className="mt-1 text-xs text-slate-500">يمكنك تصفية المرحلة والصف أولاً، ثم اختيار المجموعة المناسبة.</p></div> : isDefaultersLoading ? <div className="space-y-2"><div className="h-12 animate-pulse rounded-xl bg-slate-100" /><div className="h-12 animate-pulse rounded-xl bg-slate-100" /></div> : isDefaultersError ? <Alert variant="error">حدث خطأ أثناء تحميل قائمة المتأخرين.</Alert> : overdueStudents.length === 0 ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-8 text-center"><CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" /><p className="text-sm font-bold text-emerald-800">جميع طلاب هذه المجموعة قاموا بسداد اشتراك هذا الشهر بالكامل.</p></div> : <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">{overdueStudents.map((student) => <div key={student.studentId} className="flex items-center justify-between gap-3 p-3.5"><div><p className="text-sm font-bold text-slate-800">{student.fullName}</p><p className="mt-1 font-mono text-xs text-slate-400">{student.studentCode || 'بدون كود'}</p></div><div className="flex items-center gap-3"><span className="text-sm font-bold text-rose-600">{student.monthlyFeeExpected} ج.م</span><Button type="button" size="sm" variant="outline" onClick={() => setHistoryStudentId(student.studentId)}><History className="h-3.5 w-3.5" />كشف حساب</Button></div></div>)}</div>}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-emerald-600" />سجل المدفوعات المسجلة ({recentPayments.length})</CardTitle></CardHeader><CardContent>{isPaymentsLoading ? <div className="h-24 animate-pulse rounded-xl bg-slate-100" /> : recentPayments.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">لا توجد دفعات مسجلة لهذه المجموعة وهذا الشهر.</p> : <div className="space-y-2">{recentPayments.map((payment: any) => <div key={payment.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"><div><p className="text-sm font-bold text-slate-800">{payment.student?.user?.fullName || 'طالب'}</p><p className="mt-1 text-xs text-slate-500">{payment.paymentMethod || 'CASH'} • {new Date(payment.createdAt).toLocaleDateString('ar-EG')}</p></div><Badge variant="success">تم الدفع {payment.amountPaid} ج.م</Badge></div>)}</div>}</CardContent></Card>

      {groupId && isRecordModalOpen && <RecordPaymentModal isOpen onClose={() => setIsRecordModalOpen(false)} groupId={groupId} periodYear={periodYear} periodMonth={periodMonth} allStudents={allStudents} />}
      {historyStudentId && <StudentHistoryModal isOpen={!!historyStudentId} studentId={historyStudentId} onClose={() => setHistoryStudentId(null)} />}
    </div>
  );
}
