import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function TeacherCourseBuilderLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 text-right" dir="rtl">
      {/* Header Skeleton */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-7 w-64 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-slate-100/80 p-1 rounded-2xl flex gap-1 border border-slate-200/80">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 flex-1 rounded-xl" />
      </div>

      {/* Curriculum Content Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
            <div className="divide-y divide-slate-100 pt-2">
              <Skeleton className="h-12 w-full rounded-xl my-1.5" />
              <Skeleton className="h-12 w-full rounded-xl my-1.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
