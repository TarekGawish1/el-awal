'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useStudentProfile, useStudentQrCode, useStudentAttendance } from '@/features/student-portal/hooks/useStudentPortal';
import { Skeleton } from '@/components/ui/Skeleton';
import { StudentQrCard } from './StudentQrCard';
import { StudentAttendanceHistory } from './StudentAttendanceHistory';

const StudentQrModal = dynamic(
  () => import('./StudentQrModal').then((mod) => mod.StudentQrModal),
  { ssr: false }
);

export function StudentAttendanceView() {
  const { data: profile, isLoading: isProfileLoading } = useStudentProfile();
  const { data: qrData, isLoading: isQrLoading } = useStudentQrCode();
  const { data: attendanceData, isLoading: isAttendanceLoading } = useStudentAttendance();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const studentName = profile?.user?.fullName || 'الطالب';
  const studentCode = profile?.studentCode || 'N/A';
  const gradeLevel = profile?.gradeLevel || '—';
  const records = attendanceData?.data || [];

  if (isProfileLoading || isQrLoading || isAttendanceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-[450px] w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">سجل الحضور والـ QR</h1>
        <p className="text-sm text-slate-500 mt-1">عرض بطاقة الحضور الرقمية الخاصة بك وسجل حضورك للمجموعات الدراسية</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Digital Student Card Container */}
        <div className="lg:col-span-1">
          <StudentQrCard
            qrData={qrData}
            studentName={studentName}
            studentCode={studentCode}
            gradeLevel={gradeLevel}
            onOpenModal={() => setIsQrModalOpen(true)}
          />
        </div>

        {/* Attendance Statistics and History Timeline */}
        <div className="lg:col-span-2">
          <StudentAttendanceHistory records={records} />
        </div>
      </div>

      {/* Large QR Modal Overlay */}
      {isQrModalOpen && (
        <StudentQrModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          qrCodeToken={qrData?.qrCodeToken}
          studentName={studentName}
          studentCode={studentCode}
          gradeLevel={gradeLevel}
        />
      )}
    </div>
  );
}
