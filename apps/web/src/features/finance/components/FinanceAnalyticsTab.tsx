'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, BarChart3, BookOpen, Eye, GraduationCap, TrendingUp, Users, Wallet } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFinanceAnalytics } from '../hooks/useFinance';
import { FinanceAnalyticsGroup } from '../types/finance.types';
import { FinanceFiltersBar } from './FinanceFiltersBar';
import { inferStageFromGrade } from '@/lib/constants/grades';
import {
  DEFAULT_ACADEMIC_TERM,
  DEFAULT_ACADEMIC_YEAR,
  STORAGE_TERM_KEY,
  STORAGE_YEAR_KEY,
  getCurrentAcademicTerm,
  getCurrentAcademicYear,
} from '@/features/groups/hooks/useAcademicPeriod';

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
  return `${Number(amount || 0).toLocaleString('en-US')} ج.م`;
}

function formatRate(rate?: number) {
  return `${Number(rate || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function CollectionProgressBar({ rate, colorClass = 'bg-primary-500' }: { rate?: number; colorClass?: string }) {
  const percentage = Math.max(0, Math.min(100, Number(rate) || 0));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

function BreakdownRow({ label, expected, collected, rate }: { label: string; expected: number; collected: number; rate?: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
        <span>{label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 shadow-sm">نسبة التحصيل: {formatRate(rate)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>المطلوب: <span className="font-bold text-slate-700">{formatAmount(expected)}</span></span>
        <span>المحصل: <span className="font-bold text-emerald-600">{formatAmount(collected)}</span></span>
      </div>
    </div>
  );
}

function GroupAnalyticsCard({ group, onOpenInMatrix }: { group: FinanceAnalyticsGroup; onOpenInMatrix: (group: FinanceAnalyticsGroup) => void }) {
  return (
    <Card className="flex flex-col rounded-2xl border-slate-100 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">{group.name}</h3>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{group.gradeLevel}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700">
            <Users className="h-3.5 w-3.5" />
            {group.studentCount} طالب
          </span>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>إجمالي تحصيل المجموعة</span>
            <span className="text-slate-800">{formatRate(group.total.rate)}</span>
          </div>
          <CollectionProgressBar rate={group.total.rate} />
        </div>

        <BreakdownRow label="اشتراكات الحصص" expected={group.tuition.expected} collected={group.tuition.collected} rate={group.tuition.rate} />
        <BreakdownRow label="مذكرات المجموعة/الصف" expected={group.booklets.expected} collected={group.booklets.collected} rate={group.booklets.rate} />

        <div className="mt-auto flex items-center justify-between rounded-xl border border-slate-100 bg-slate-900 px-3 py-2 text-white">
          <span className="text-[11px] font-semibold text-slate-300">إجمالي المتبقي</span>
          <span className="text-xs font-extrabold">{formatAmount(group.total.remaining)}</span>
        </div>

        <button
          type="button"
          onClick={() => onOpenInMatrix(group)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 py-2 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100"
        >
          <Eye className="h-4 w-4" />
          فتح في سجل المدفوعات الشامل
        </button>
      </CardContent>
    </Card>
  );
}

export function FinanceAnalyticsTab({ groups = [] }: { groups?: any[] }) {
  const router = useRouter();
  const getDefaultMonth = (term: 'FIRST_TERM' | 'SECOND_TERM') => {
    const currentMonth = new Date().getMonth() + 1;
    const termMonths = term === 'FIRST_TERM' ? [8, 9, 10, 11, 12, 1] : [2, 3, 4, 5, 6, 7];
    return termMonths.includes(currentMonth) ? currentMonth : termMonths[0];
  };

  const defaultYear = getCurrentAcademicYear();
  const defaultTerm = getCurrentAcademicTerm();
  const [academicYear, setAcademicYear] = useState(() => readStoredValue(STORAGE_YEAR_KEY, defaultYear));
  const [academicTerm, setAcademicTerm] = useState<'FIRST_TERM' | 'SECOND_TERM'>(() => readStoredValue(STORAGE_TERM_KEY, defaultTerm) as 'FIRST_TERM' | 'SECOND_TERM');
  const [stage, setStage] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [groupId, setGroupId] = useState('');
  const [periodMonth, setPeriodMonth] = useState<number | ''>(() => {
    const initialTerm = readStoredValue(STORAGE_TERM_KEY, defaultTerm) as 'FIRST_TERM' | 'SECOND_TERM';
    return getDefaultMonth(initialTerm);
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const sync = () => {
      setAcademicYear(readStoredValue(STORAGE_YEAR_KEY, defaultYear));
      setAcademicTerm(readStoredValue(STORAGE_TERM_KEY, defaultTerm) as 'FIRST_TERM' | 'SECOND_TERM');
    };
    window.addEventListener('el_awal_academic_period_changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('el_awal_academic_period_changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, [defaultYear, defaultTerm]);

  const query = {
    academicPeriodId: `${academicYear}:${academicTerm}`,
    academicYear,
    academicTerm,
    stage: stage || undefined,
    gradeLevel: gradeLevel || undefined,
    groupId: groupId || undefined,
    periodMonth: periodMonth || undefined,
  };
  const { data: analytics, isLoading, isError } = useFinanceAnalytics(query);

  const visibleGroups = useMemo(() => {
    const value = search.trim().toLocaleLowerCase();
    return (analytics?.groups || []).filter((group) => {
      if (!value) return true;
      return group.name.toLocaleLowerCase().includes(value) || group.gradeLevel.toLocaleLowerCase().includes(value);
    });
  }, [analytics?.groups, search]);

  const setStageAndReset = (value: string) => { setStage(value); setGradeLevel(''); setGroupId(''); };
  const setGradeAndReset = (value: string) => { setGradeLevel(value); setGroupId(''); };
  const setTermAndReset = (value: 'FIRST_TERM' | 'SECOND_TERM') => {
    setAcademicTerm(value);
    setPeriodMonth(getDefaultMonth(value));
    try {
      localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify([value]));
      window.dispatchEvent(new Event('el_awal_academic_period_changed'));
    } catch {
      // The server-backed switcher remains authoritative when local storage is unavailable.
    }
  };

  const openInMatrix = (group: FinanceAnalyticsGroup) => {
    const params = new URLSearchParams({ tab: 'matrix', groupId: group.id });
    const effectiveStage = stage || inferStageFromGrade(group.gradeLevel);
    if (effectiveStage) params.set('stage', effectiveStage);
    if (group.gradeLevel) params.set('gradeLevel', group.gradeLevel);
    router.push(`/teacher/finance?${params.toString()}`);
  };

  const overview = analytics?.overview;

  return (
    <div className="space-y-5">
      <Card className="border-none bg-gradient-to-l from-primary-700 to-primary-900 text-white shadow-lg">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs font-bold text-primary-100">Financial Analytics</p>
            <h2 className="mt-1 text-2xl font-extrabold">لوحة الإحصائيات والتقارير المالية</h2>
            <p className="mt-1 text-sm text-primary-100">نظرة شاملة على تحصيل الاشتراكات والمذكرات لكل المجموعات الدراسية.</p>
            {periodMonth ? (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white">
                📅 نطاق العرض: إحصائيات شهر {periodMonth} ({ARABIC_MONTHS[periodMonth - 1]}) — الاشتراكات محسوبة لهذا الشهر فقط
              </span>
            ) : (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white">
                🗓️ نطاق العرض: إحصائيات الترم كامل
              </span>
            )}
          </div>
          <BarChart3 className="hidden h-14 w-14 text-white/20 sm:block" />
        </CardContent>
      </Card>

      <FinanceFiltersBar
        groups={groups}
        stage={stage}
        gradeLevel={gradeLevel}
        groupId={groupId}
        academicYear={academicYear}
        academicTerm={academicTerm}
        search={search}
        periodMonth={periodMonth || undefined}
        onStageChange={setStageAndReset}
        onGradeChange={setGradeAndReset}
        onGroupChange={setGroupId}
        onTermChange={setTermAndReset}
        onSearchChange={setSearch}
        onMonthChange={(value) => setPeriodMonth(value || '')}
        allowWholeTerm
        allowWholeTermLabel="إحصائيات الترم كامل"
      />

      {isError ? (
        <Alert variant="error">تعذر تحميل الإحصائيات المالية. حاول مرة أخرى.</Alert>
      ) : isLoading || !overview ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <section className="space-y-4" aria-label="إحصائيات المنصة الكلية">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Wallet className="h-4 w-4 text-primary-600" />
                    إجمالي الإيراد المستهدف (اشتراكات + مذكرات)
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatAmount(overview.totalExpected)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{overview.totalStudents} طالب نشط</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    إجمالي المبالغ المحصلة
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-600">{formatAmount(overview.totalCollected)}</p>
                  <div className="mt-2"><CollectionProgressBar rate={overview.collectionRate} colorClass="bg-emerald-500" /></div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    إجمالي المتبقي / المتأخرات
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-rose-600">{formatAmount(overview.totalRemaining)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">مبالغ لم يتم تحصيلها بعد</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <GraduationCap className="h-4 w-4 text-primary-600" />
                    نسبة التحصيل العامة
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatRate(overview.collectionRate)}</p>
                  <div className="mt-2"><CollectionProgressBar rate={overview.collectionRate} /></div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                    <Wallet className="h-4 w-4 text-primary-600" />
                    بطاقة الاشتراكات الشهرية
                  </h3>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-bold text-slate-500">المستحق</p>
                      <p className="mt-1 text-sm font-extrabold text-slate-800">{formatAmount(overview.tuition.expected)}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2.5">
                      <p className="text-[10px] font-bold text-emerald-700">المحصل</p>
                      <p className="mt-1 text-sm font-extrabold text-emerald-600">{formatAmount(overview.tuition.collected)}</p>
                    </div>
                    <div className="rounded-xl bg-primary-50 p-2.5">
                      <p className="text-[10px] font-bold text-primary-700">نسبة التحصيل</p>
                      <p className="mt-1 text-sm font-extrabold text-primary-700">{formatRate(overview.tuition.collectionRate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-100 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                    <BookOpen className="h-4 w-4 text-primary-600" />
                    بطاقة المذكرات والملازم
                  </h3>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <p className="text-[10px] font-bold text-slate-500">المستحق</p>
                      <p className="mt-1 text-sm font-extrabold text-slate-800">{formatAmount(overview.booklets.expected)}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2.5">
                      <p className="text-[10px] font-bold text-emerald-700">المحصل</p>
                      <p className="mt-1 text-sm font-extrabold text-emerald-600">{formatAmount(overview.booklets.collected)}</p>
                    </div>
                    <div className="rounded-xl bg-primary-50 p-2.5">
                      <p className="text-[10px] font-bold text-primary-700">نسبة التحصيل</p>
                      <p className="mt-1 text-sm font-extrabold text-primary-700">{formatRate(overview.booklets.collectionRate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-3" aria-label="إحصائيات المجموعات الدراسية">
            <h3 className="text-sm font-extrabold text-slate-700">إحصائيات المجموعات الدراسية ({visibleGroups.length})</h3>
            {visibleGroups.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm font-semibold text-slate-500">
                لا توجد مجموعات دراسية مطابقة للفلاتر الحالية.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleGroups.map((group) => (
                  <GroupAnalyticsCard key={group.id} group={group} onOpenInMatrix={openInMatrix} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
