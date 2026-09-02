'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useGroupDefaulters, usePayments, useDeletePayment, useFinanceAnalytics } from '../hooks/useFinance';
import { FinanceHeader } from './dashboard/FinanceHeader';
import { FinancialKpiCards } from './dashboard/FinancialKpiCards';
import { FinanceQuickActions } from './dashboard/FinanceQuickActions';
import { FinanceFiltersBar } from './FinanceFiltersBar';
import { RevenueBreakdownTable } from './dashboard/RevenueBreakdownTable';
import { GroupFinancialList } from './dashboard/GroupFinancialList';
import { OverdueStudentsWarning } from './dashboard/OverdueStudentsWarning';
import { PaymentLedgerTable } from './dashboard/PaymentLedgerTable';
import { FinanceQrScannerModal } from './dashboard/FinanceQrScannerModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { StudentHistoryModal } from './StudentHistoryModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { BookletManagementSection } from '@/features/booklets/components/BookletManagementSection';
import { FinancialMatrixLedger } from './FinancialMatrixLedger';
import { FinanceAnalyticsTab } from './FinanceAnalyticsTab';
import {
  DEFAULT_ACADEMIC_TERM,
  STORAGE_TERM_KEY,
  STORAGE_YEAR_KEY,
  getCurrentAcademicTerm,
  getCurrentAcademicYear,
} from '@/features/groups/hooks/useAcademicPeriod';
import toast from 'react-hot-toast';

function readStoredValue(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) && value[0] ? value[0] : fallback;
  } catch {
    return fallback;
  }
}

export function FinanceDashboard() {
  const searchParams = useSearchParams();
  const paramGroupId = searchParams.get('groupId');
  const paramTab = searchParams.get('tab');
  const paramStage = searchParams.get('stage') || '';
  const paramGradeLevel = searchParams.get('gradeLevel') || '';
  const paramMonth = searchParams.get('month');
  const paramScan = searchParams.get('scan') === 'true' || searchParams.get('openQr') === 'true';
  const paramRecord = searchParams.get('record') === 'true' || searchParams.get('manual') === 'true';

  const defaultYear = getCurrentAcademicYear();
  const defaultTerm = getCurrentAcademicTerm();
  const [academicYear, setAcademicYear] = useState(() => readStoredValue(STORAGE_YEAR_KEY, defaultYear));
  const [academicTerm, setAcademicTerm] = useState<'FIRST_TERM' | 'SECOND_TERM'>(() => readStoredValue(STORAGE_TERM_KEY, defaultTerm) as 'FIRST_TERM' | 'SECOND_TERM');

  const [selectedGroupId, setSelectedGroupId] = useState<string>(paramGroupId || '');
  const [periodMonth, setPeriodMonth] = useState<number>(() => (paramMonth ? Number(paramMonth) : new Date().getMonth() + 1));
  const [stage, setStage] = useState(paramStage);
  const [gradeLevel, setGradeLevel] = useState(paramGradeLevel);
  const [search, setSearch] = useState('');

  const [activeTab, setActiveTab] = useState<any>(
    paramTab === 'booklets' ? 'BOOKLETS' : paramTab === 'matrix' ? 'MATRIX' : paramTab === 'analytics' ? 'ANALYTICS' : 'OVERVIEW'
  );

  const [isQrModalOpen, setIsQrModalOpen] = useState(Boolean(paramScan));
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(Boolean(paramRecord));
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

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

  useEffect(() => {
    if (paramGroupId) setSelectedGroupId(paramGroupId);
    if (paramMonth) setPeriodMonth(Number(paramMonth));
    if (paramScan) setIsQrModalOpen(true);
    if (paramRecord) setIsRecordModalOpen(true);
    if (paramTab === 'booklets') setActiveTab('BOOKLETS');
    else if (paramTab === 'matrix') setActiveTab('MATRIX');
    else if (paramTab === 'analytics') setActiveTab('ANALYTICS');
  }, [paramGroupId, paramMonth, paramScan, paramRecord, paramTab]);

  const { data: groups = [] } = useGroups();
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const startYear = Number(academicYear.split('-')[0]) || new Date().getFullYear();
  const periodYear = academicTerm === 'FIRST_TERM' && periodMonth === 1 ? startYear + 1 : academicTerm === 'SECOND_TERM' ? startYear + 1 : startYear;

  const { data: analytics } = useFinanceAnalytics({
    academicPeriodId: `${academicYear}:${academicTerm}`,
    academicYear,
    academicTerm,
    stage: stage || undefined,
    gradeLevel: gradeLevel || undefined,
    groupId: selectedGroupId || undefined,
    periodMonth: periodMonth || undefined,
  });

  const { data: defaultersData, isLoading: isDefaultersLoading } = useGroupDefaulters(selectedGroupId, periodYear, periodMonth);
  const { data: paymentsData, isLoading: isPaymentsLoading } = usePayments({ groupId: selectedGroupId || undefined, periodYear, periodMonth, limit: 100 });
  const { mutate: deletePayment, isPending: isDeleting } = useDeletePayment();

  const [paymentToDelete, setPaymentToDelete] = useState<{ id: string; studentName: string } | null>(null);

  const handleDelete = (payment: any) => {
    setPaymentToDelete({ id: payment.id, studentName: payment.student?.user?.fullName || '' });
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

  const handleActionClick = (id: string) => {
    if (id === 'QR') setIsQrModalOpen(true);
    else if (id === 'MANUAL') setIsRecordModalOpen(true);
    else setActiveTab(id);
  };

  const allStudents = (defaultersData?.defaulters || []).map((student) => ({
    id: student.studentId,
    fullName: student.fullName,
    studentCode: student.studentCode || undefined,
    gradeLevel: student.gradeLevel,
    groupId: selectedGroupId,
  }));

  const visibleGroups = useMemo(() => {
    const value = search.trim().toLocaleLowerCase();
    return (analytics?.groups || []).filter((group) => {
      if (!value) return true;
      return group.name.toLocaleLowerCase().includes(value) || group.gradeLevel.toLocaleLowerCase().includes(value);
    });
  }, [analytics?.groups, search]);

  const payments = paymentsData?.pages[0]?.data || [];

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      <FinanceHeader />

      <FinanceQuickActions activeTab={activeTab} onChange={handleActionClick} />

      {activeTab === 'BOOKLETS' ? (
        <BookletManagementSection groups={groups} />
      ) : activeTab === 'MATRIX' ? (
        <FinancialMatrixLedger groups={groups} initialStage={stage} initialGradeLevel={gradeLevel} initialGroupId={selectedGroupId || ''} />
      ) : activeTab === 'ANALYTICS' ? (
        <FinanceAnalyticsTab groups={groups} />
      ) : (
        <>
          <FinanceFiltersBar
            groups={groups}
            stage={stage}
            gradeLevel={gradeLevel}
            groupId={selectedGroupId}
            academicYear={academicYear}
            academicTerm={academicTerm}
            periodMonth={periodMonth}
            search={search}
            onStageChange={(s) => { setStage(s); setGradeLevel(''); setSelectedGroupId(''); }}
            onGradeChange={(g) => { setGradeLevel(g); setSelectedGroupId(''); }}
            onGroupChange={setSelectedGroupId}
            onTermChange={(t) => {
              setAcademicTerm(t);
              try {
                localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify([t]));
                window.dispatchEvent(new Event('el_awal_academic_period_changed'));
              } catch {}
            }}
            onMonthChange={setPeriodMonth}
            onSearchChange={setSearch}
          />

          {analytics?.overview && <FinancialKpiCards overview={analytics.overview} />}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12">
              <OverdueStudentsWarning 
                students={defaultersData?.defaulters || []} 
                groupId={selectedGroupId} 
                isLoading={isDefaultersLoading}
                onOpenHistory={setHistoryStudentId}
              />
            </div>
            
            <div className="lg:col-span-5 space-y-6">
              {analytics?.overview && <RevenueBreakdownTable overview={analytics.overview} />}
            </div>

            <div className="lg:col-span-7 space-y-6">
              <GroupFinancialList 
                groups={visibleGroups} 
                onOpenGroup={(g) => { setSelectedGroupId(g.id); setStage(''); setGradeLevel(''); }} 
              />
            </div>

            <div className="lg:col-span-12">
              <PaymentLedgerTable 
                payments={payments as any} 
                isLoading={isPaymentsLoading}
                onOpenHistory={setHistoryStudentId}
                onDeletePayment={handleDelete}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <FinanceQrScannerModal 
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onSwitchToManual={() => setIsRecordModalOpen(true)}
        groupId={selectedGroupId}
        groupName={selectedGroup?.name}
        periodYear={periodYear}
        periodMonth={periodMonth}
      />
      
      {isRecordModalOpen && (
        <RecordPaymentModal 
          isOpen 
          onClose={() => setIsRecordModalOpen(false)} 
          groupId={selectedGroupId} 
          periodYear={periodYear} 
          periodMonth={periodMonth} 
          allStudents={allStudents} 
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
