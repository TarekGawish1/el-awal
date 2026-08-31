'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileCheck, UserX, UserPlus, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AtRiskStudentAlert, PendingGradingAlert } from '../types/dashboard.types';
import { usePendingReservations } from '@/features/groups';
import { PaymentConfirmationModal } from './PaymentConfirmationModal';
import { StudentDetailsModal } from '@/features/students/components/StudentDetailsModal';

export interface NeedsAttentionUnifiedProps {
  atRiskStudents?: AtRiskStudentAlert[];
  pendingGrading?: PendingGradingAlert[];
  isLoading?: boolean;
}

export function NeedsAttentionUnified({
  atRiskStudents = [],
  pendingGrading = [],
  isLoading = false,
}: NeedsAttentionUnifiedProps) {
  const { data: reservations = [], isLoading: isReservationsLoading } = usePendingReservations();
  
  const [acceptModalData, setAcceptModalData] = useState<{ id: string; studentName: string } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const isAllLoading = isLoading || isReservationsLoading;

  if (isAllLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-neutral-800">يحتاج انتباهك</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalItems = reservations.length + pendingGrading.length + atRiskStudents.length;

  if (totalItems === 0) {
    return (
      <Card className="border-none shadow-none bg-success-50/50">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-success-900">أنت تمام 👌</h4>
            <p className="text-xs text-success-700 mt-0.5">مفيش حاجة محتاجة انتباهك دلوقتي</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combine and sort (limit to 5 items to keep it clean)
  // Priorities: Reservations > Grading > At Risk
  let itemsToShow = [];
  
  // 1. Add up to 3 reservations
  const resToShow = reservations.slice(0, 3);
  itemsToShow.push(...resToShow.map(r => ({ type: 'reservation', data: r })));
  
  // 2. Add grading until we hit 4 items
  if (itemsToShow.length < 5) {
    const gradingToShow = pendingGrading.slice(0, 5 - itemsToShow.length);
    itemsToShow.push(...gradingToShow.map(g => ({ type: 'grading', data: g })));
  }
  
  // 3. Add at risk until we hit 5 items
  if (itemsToShow.length < 5) {
    const riskToShow = atRiskStudents.slice(0, 5 - itemsToShow.length);
    itemsToShow.push(...riskToShow.map(r => ({ type: 'risk', data: r })));
  }

  return (
    <Card className="border-neutral-200 shadow-sm overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b border-neutral-100 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-bold text-lg text-neutral-800">يحتاج انتباهك</CardTitle>
        <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2.5 py-0.5 rounded-full">
          {totalItems}
        </span>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="divide-y divide-neutral-100">
          {itemsToShow.map((item, index) => {
            if (item.type === 'reservation') {
              const res = item.data as any;
              return (
                <div key={`res-${res.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-neutral-50/50 transition-colors">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">طلب انضمام جديد</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">{res.student?.user?.fullName || 'طالب جديد'} • {res.group?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 sm:mt-0">
                    <Button size="sm" variant="outline" className="h-8 text-xs font-semibold bg-white" onClick={() => setSelectedStudentId(res.studentId || res.student?.id)}>
                      معاينة الطالب
                    </Button>
                    <Button size="sm" className="h-8 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white" onClick={() => setAcceptModalData({ id: res.id, studentName: res.student?.user?.fullName || 'غير معروف' })}>
                      مراجعة وقبول
                    </Button>
                  </div>
                </div>
              );
            }

            if (item.type === 'grading') {
              const grading = item.data as PendingGradingAlert;
              return (
                <div key={`grad-${grading.assessmentId}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-neutral-50/50 transition-colors">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">{grading.assessmentTitle}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">{grading.pendingCount} إجابات في انتظار المراجعة • {grading.groupName}</p>
                    </div>
                  </div>
                  <Link href={`/teacher/assessments/${grading.assessmentId}/submissions`} className="mt-3 sm:mt-0">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto h-8 text-xs font-semibold bg-white text-blue-700 hover:text-blue-800 border-blue-200 hover:bg-blue-50">
                      تصحيح
                    </Button>
                  </Link>
                </div>
              );
            }

            if (item.type === 'risk') {
              const risk = item.data as AtRiskStudentAlert;
              return (
                <div key={`risk-${risk.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-neutral-50/50 transition-colors">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-error-50 flex items-center justify-center shrink-0">
                      <UserX className="w-4 h-4 text-error-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">{risk.studentName}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">غياب {risk.consecutiveAbsences} حصص متتالية • {risk.groupName}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold text-neutral-500 hover:text-neutral-800 mt-3 sm:mt-0 w-full sm:w-auto" onClick={() => setSelectedStudentId(risk.studentId)}>
                    عرض الطالب
                  </Button>
                </div>
              );
            }

            return null;
          })}
        </div>

        {totalItems > itemsToShow.length && (
          <div className="p-3 text-center border-t border-neutral-100 bg-neutral-50">
            <span className="text-xs text-neutral-500 font-medium">
              وهناك {totalItems - itemsToShow.length} عناصر أخرى...
            </span>
          </div>
        )}
      </CardContent>

      {/* Payment Confirmation Modal */}
      {acceptModalData && (
        <PaymentConfirmationModal
          reservationId={acceptModalData.id}
          studentName={acceptModalData.studentName}
          onClose={() => setAcceptModalData(null)}
        />
      )}

      {/* Student Details Modal */}
      <StudentDetailsModal
        studentId={selectedStudentId}
        isOpen={!!selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />
    </Card>
  );
}
