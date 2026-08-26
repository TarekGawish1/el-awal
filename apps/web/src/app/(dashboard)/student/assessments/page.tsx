'use client';

import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { StudentAssessmentsContent } from '@/features/student-portal/components/StudentAssessmentsContent';

export default function StudentAssessmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        </div>
      }
    >
      <StudentAssessmentsContent fixedType="EXAM" />
    </Suspense>
  );
}
