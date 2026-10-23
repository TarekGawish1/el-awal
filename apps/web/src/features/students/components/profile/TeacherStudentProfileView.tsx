'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useStudent, useUpdateStudentStatus, useDeleteStudent } from '@/features/students/hooks/use-students';
import { useStudentPaymentHistory } from '@/features/finance/hooks/useFinance';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { StudentQrBadge } from '@/features/students/components/StudentQrBadge';
import { PaymentSummaryInfo } from '@/features/finance/components/CancelPaymentModal';
import { StudentProfileHeader } from './StudentProfileHeader';
import { StudentLedgerCard } from './StudentLedgerCard';
import { StudentRelationsCards } from './StudentRelationsCards';

import { StudentHistoryModal } from '@/features/finance/components/StudentHistoryModal';
import { CancelPaymentModal } from '@/features/finance/components/CancelPaymentModal';

interface TeacherStudentProfileViewProps {
  studentId: string;
}

export function TeacherStudentProfileView({ studentId }: TeacherStudentProfileViewProps) {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [paymentToCancel, setPaymentToCancel] = useState<PaymentSummaryInfo | null>(null);

  const { data: student, isLoading, isError, refetch } = useStudent(studentId);
  const { data: payments = [], isLoading: isPaymentsLoading } = useStudentPaymentHistory(studentId);
  const updateStatusMutation = useUpdateStudentStatus();
  const deleteStudentMutation = useDeleteStudent();

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between gap-6">
          <div className="space-y-4 w-1/2">
            <Skeleton className="h-10 w-32 mb-8" />
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </div>
          <Skeleton className="w-48 h-48 rounded-xl hidden sm:block" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <Link href="/teacher/students" className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowRight className="w-4 h-4 ml-2" />
          العودة لسجل الطلاب
        </Link>
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">لم يتم العثور على سجل الطالب</h2>
            <p className="text-sm text-slate-500 mt-1">تأكد من صحة الرابط أو تحقق من قائمة الطلاب المسجلين محلياً.</p>
          </div>
          <div className="flex justify-center gap-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
              <RefreshCw className="w-4 h-4 ml-1.5" />
              إعادة المحاولة
            </Button>
            <Link href="/teacher/students">
              <Button variant="primary" size="sm" className="cursor-pointer">
                العودة لقائمة الطلاب
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const studentName = student.user?.fullName || 'طالب';
  const studentPhone = student.user?.phone || student.emergencyPhone || '';
  const enrollments = student.groupEnrollments || [];
  const parents = student.parentLinks || [];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header section */}
      <StudentProfileHeader
        student={student}
        studentName={studentName}
        studentPhone={studentPhone}
        updateStatusMutation={updateStatusMutation}
        deleteStudentMutation={deleteStudentMutation}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <StudentRelationsCards
            student={student}
            studentPhone={studentPhone}
            enrollments={enrollments}
            parents={parents}
          />

          {/* Payments & Booklets Ledger Card */}
          <StudentLedgerCard
            payments={payments}
            isLoading={isPaymentsLoading}
            studentName={studentName}
            onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
            onSelectPaymentToCancel={(payment) => setPaymentToCancel(payment)}
          />
        </div>

        <div className="lg:col-span-1">
          <StudentQrBadge studentId={student.id} studentPhone={studentPhone} />
        </div>
      </div>

      {paymentToCancel && (
        <CancelPaymentModal
          isOpen={Boolean(paymentToCancel)}
          payment={paymentToCancel}
          onClose={() => setPaymentToCancel(null)}
          onSuccess={() => refetch()}
        />
      )}
      {isHistoryModalOpen && (
        <StudentHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          studentId={student.id}
        />
      )}
    </div>
  );
}
