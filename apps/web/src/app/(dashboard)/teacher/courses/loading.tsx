import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function TeacherCoursesLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 text-right" dir="rtl">
      {/* Header & Metrics Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-6 w-64 rounded-md" />
          </div>
          <Skeleton className="h-4 w-96 rounded-md max-w-full" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* KPI Stats Overview Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4"
          >
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-6 w-12 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex border-b border-slate-200 gap-4">
        <Skeleton className="h-11 w-44 rounded-t-lg" />
        <Skeleton className="h-11 w-48 rounded-t-lg" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <Skeleton className="h-10 w-full md:w-80 rounded-xl" />
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Course Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col"
          >
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
                <Skeleton className="h-5 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
