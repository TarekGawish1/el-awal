'use client';

import React, { Suspense } from 'react';
import { TeacherAttendanceContent } from '@/features/attendance/components/TeacherAttendanceContent';

export default function TeacherAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 font-bold">
          جاري تحميل لوحة رصد الحضور...
        </div>
      }
    >
      <TeacherAttendanceContent />
    </Suspense>
  );
}
