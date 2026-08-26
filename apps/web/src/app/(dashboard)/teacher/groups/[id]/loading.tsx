import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function GroupDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-8">
        <Skeleton className="w-24 h-6" />
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-4 w-1/4 mb-6" />
        <div className="flex gap-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
