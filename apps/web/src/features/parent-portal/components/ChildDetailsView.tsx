'use client';

import React from 'react';
import { useChildOverview } from '../hooks/useParentPortal';
import { Badge, Skeleton } from '@/components/ui';
import { Users, AlertCircle } from 'lucide-react';
import { calculateNextSessionStr } from './child-details/child-overview.helpers';
import { ChildAcademicHeader } from './child-details/ChildAcademicHeader';
import { ChildFinancialOverview } from './child-details/ChildFinancialOverview';
import { ChildUpcomingOverview } from './child-details/ChildUpcomingOverview';
import { ChildAssignmentsSection } from './child-details/ChildAssignmentsSection';
import { ChildAttendanceHistoryTable } from './child-details/ChildAttendanceHistoryTable';

interface ChildDetailsViewProps {
  studentId: string;
  initialData?: any;
}

export function ChildDetailsView({ studentId, initialData }: ChildDetailsViewProps) {
  const shouldFetch = !initialData && !!studentId;
  const { data: fetchedOverview, isLoading: isQueryLoading, isError: isQueryError } = useChildOverview(shouldFetch ? studentId : '');
  const overview = initialData || fetchedOverview;
  const isLoading = shouldFetch && isQueryLoading;
  const isError = shouldFetch && isQueryError;

  const student = overview?.student;
  const primaryGroup = overview?.primaryGroup;
  const attendanceHistory = overview?.attendanceHistory || [];
  const paymentHistory = overview?.paymentHistory || [];
  const assignments = overview?.assignments || [];
  const exams = overview?.exams || [];
  const enrollments = student?.groupEnrollments || [];

  const studentName = student?.fullName || 'الطالب';

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700">لم يتم العثور على بيانات الطالب</p>
      </div>
    );
  }

  // --- Calculations ---
  const totalAttended = overview?.kpis?.hwStats?.totalAttended ?? attendanceHistory.filter((r: any) => r.status === 'PRESENT').length;
  const totalAssignedHw = overview?.kpis?.hwStats?.totalAssigned ?? attendanceHistory.filter((r: any) => r.status === 'PRESENT' && r.homeworkStatus && r.homeworkStatus !== 'NO_HOMEWORK').length;
  const hwCompleted = overview?.kpis?.hwStats?.hwCompleted ?? attendanceHistory.filter((r: any) => r.status === 'PRESENT' && (r.homeworkStatus === 'COMPLETED' || r.homeworkStatus === 'SUBMITTED' || r.homeworkStatus === 'EXCUSED' || r.homeworkStatus === 'CHECKED_ONSITE')).length;
  const hwMissing = overview?.kpis?.hwStats?.hwMissing ?? attendanceHistory.filter((r: any) => r.status === 'PRESENT' && (r.homeworkStatus === 'MISSING' || r.homeworkStatus === 'NOT_SUBMITTED')).length;
  const hwIncomplete = overview?.kpis?.hwStats?.hwIncomplete ?? attendanceHistory.filter((r: any) => r.status === 'PRESENT' && r.homeworkStatus === 'INCOMPLETE').length;

  const totalPaid = overview?.kpis?.totalPaid ?? paymentHistory.filter((p: any) => p.paymentStatus === 'PAID').reduce((acc: number, p: any) => acc + (Number(p.amountPaid) || 0), 0);
  const totalUnpaid = overview?.kpis?.totalUnpaid ?? paymentHistory.filter((p: any) => p.paymentStatus !== 'PAID').reduce((acc: number, p: any) => acc + (Number(p.amountExpected) || 0), 0);

  const nextSessionStr = calculateNextSessionStr(overview, primaryGroup);

  const upcomingExam = exams.find((e: any) => {
    const rawDate = e.startTime || e.startDate || e.dueDate;
    if (!rawDate) return false;
    return new Date(rawDate).getTime() >= Date.now();
  }) || exams[0];

  const pendingAssignments = assignments.filter((a: any) => {
    const sub = a.submissions?.[0];
    return !(sub?.status === 'SUBMITTED' || sub?.status === 'GRADED');
  });
  const pendingAssignmentsCount = pendingAssignments.length;
  const currentHomework = pendingAssignments[0] || assignments[0];

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) return;
    const hash = window.location.hash.replace('#', '');
    const targetId =
      hash === 'finance'
        ? 'child-finance'
        : hash === 'attendance'
        ? 'child-attendance'
        : hash === 'assignments'
        ? 'child-assignments'
        : hash;
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      const timer = setTimeout(() => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [studentId, overview]);

  return (
    <div className="space-y-6">
      <div id="child-overview" className="scroll-mt-6">
        <ChildAcademicHeader
          studentName={studentName}
          studentId={studentId}
          studentCode={student?.studentCode}
          academicStage={student.academicStage}
          gradeLevel={student.gradeLevel}
        />
      </div>

      <div id="child-finance" className="scroll-mt-6">
        <ChildFinancialOverview
          primaryGroup={primaryGroup}
          paymentHistory={paymentHistory}
          totalPaid={totalPaid}
          totalUnpaid={totalUnpaid}
        />
      </div>

      <ChildUpcomingOverview
        nextSessionStr={nextSessionStr}
        primaryGroup={primaryGroup}
        upcomingExam={upcomingExam}
        pendingAssignmentsCount={pendingAssignmentsCount}
        assignments={assignments}
        currentHomework={currentHomework}
      />

      <div id="child-assignments" className="scroll-mt-6">
        <ChildAssignmentsSection
          assignments={assignments}
          pendingAssignmentsCount={pendingAssignmentsCount}
          primaryGroup={primaryGroup}
        />
      </div>

      <div id="child-attendance" className="scroll-mt-6">
        <ChildAttendanceHistoryTable
          attendanceHistory={attendanceHistory}
          totalAttended={totalAttended}
          totalAssignedHw={totalAssignedHw}
          hwCompleted={hwCompleted}
          hwMissing={hwMissing}
          hwIncomplete={hwIncomplete}
        />
      </div>

      {/* Groups */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary-600" />
          المجموعات المسجلة ({enrollments.length})
        </h4>
        {enrollments.length === 0 ? (
          <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">غير مسجل في مجموعات حالياً.</p>
        ) : (
          <div className="space-y-1.5">
            {enrollments.map((en: any, i: number) => (
              <div key={en.group?.id || i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
                <span className="font-semibold text-slate-800">{en.group?.name || 'المجموعة الدراسية'}</span>
                <Badge variant="outline" className="text-xs">نشط</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChildDetailsView;
