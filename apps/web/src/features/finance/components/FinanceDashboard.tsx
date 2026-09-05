'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useGroupDefaulters } from '../hooks/useFinance';
import { FinanceHeader } from './dashboard/FinanceHeader';
import { FinanceQuickActions } from './dashboard/FinanceQuickActions';
import { FinanceQrScannerModal } from './dashboard/FinanceQrScannerModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { StudentHistoryModal } from './StudentHistoryModal';
import { BookletManagementSection } from '@/features/booklets/components/BookletManagementSection';
import { FinancialMatrixLedger } from './FinancialMatrixLedger';
import { FinanceSettingsTab } from './FinanceSettingsTab';
import { FinanceOverviewTab } from './FinanceOverviewTab';
import {
  DEFAULT_ACADEMIC_TERM,
  STORAGE_TERM_KEY,
  STORAGE_YEAR_KEY,
  getCurrentAcademicTerm,
  getCurrentAcademicYear,
} from '@/features/groups/hooks/useAcademicPeriod';
import { usePermissions } from '@/core/hooks/usePermissions';

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
  const { can } = usePermissions();
  const canViewStats = can('VIEW_FINANCE');

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

  const [activeTab, setActiveTab] = useState<any>(() => {
    if (paramTab === 'booklets') return 'BOOKLETS';
    if (paramTab === 'matrix') return 'MATRIX';
    if (paramTab === 'analytics') return canViewStats ? 'OVERVIEW' : 'MATRIX';
    if (paramTab === 'settings') return canViewStats ? 'SETTINGS' : 'MATRIX';
    return canViewStats ? 'OVERVIEW' : 'MATRIX';
  });

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
    else if (paramTab === 'analytics') setActiveTab(canViewStats ? 'OVERVIEW' : 'MATRIX');
    else if (!canViewStats && activeTab === 'OVERVIEW') setActiveTab('MATRIX');
  }, [paramGroupId, paramMonth, paramScan, paramRecord, paramTab, canViewStats]);

  const { data: groups = [] } = useGroups();
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const startYear = Number(academicYear.split('-')[0]) || new Date().getFullYear();
  const periodYear = academicTerm === 'FIRST_TERM' && periodMonth === 1 ? startYear + 1 : academicTerm === 'SECOND_TERM' ? startYear + 1 : startYear;

  const { data: defaultersData } = useGroupDefaulters(selectedGroupId, periodYear, periodMonth);

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

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 animate-in fade-in duration-300">
      <FinanceHeader />

      <FinanceQuickActions activeTab={activeTab} onChange={handleActionClick} />

      {activeTab === 'SETTINGS' ? (
        <FinanceSettingsTab />
      ) : activeTab === 'BOOKLETS' ? (
        <BookletManagementSection groups={groups} />
      ) : activeTab === 'MATRIX' ? (
        <FinancialMatrixLedger groups={groups} initialStage={stage} initialGradeLevel={gradeLevel} initialGroupId={selectedGroupId || ''} />
      ) : (
        <FinanceOverviewTab
          academicYear={academicYear}
          academicTerm={academicTerm}
          periodMonth={periodMonth}
          onTermChange={(t) => {
            setAcademicTerm(t);
            try {
              localStorage.setItem(STORAGE_TERM_KEY, JSON.stringify([t]));
              window.dispatchEvent(new Event('el_awal_academic_period_changed'));
            } catch {}
          }}
          onMonthChange={setPeriodMonth}
          onOpenGroupMatrix={(groupId) => {
            setSelectedGroupId(groupId);
            setActiveTab('MATRIX');
          }}
          groupsList={groups}
        />
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
    </div>
  );
}
