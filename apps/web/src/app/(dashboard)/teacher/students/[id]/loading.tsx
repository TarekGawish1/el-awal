import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function StudentDetailLoading() {
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
        </div>
        <div className="space-y-8">
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
