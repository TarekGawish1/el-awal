'use client';

import React from 'react';
import { GraduationCap } from 'lucide-react';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col antialiased">
      <header className="h-16 bg-white border-b border-neutral-200/90 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-neutral-900 text-sm">منصة الأول</span>
            <span className="block text-[10px] text-primary-600 font-semibold">نظام إدارة التعليم</span>
          </div>
        </div>
        <div className="w-24 h-4 bg-neutral-200 rounded animate-pulse" />
      </header>
      <main className="flex-1 p-4 max-w-7xl w-full mx-auto space-y-4">
        <div className="h-10 w-48 bg-neutral-200/80 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-48 bg-white border border-neutral-200/70 rounded-2xl animate-pulse" />
          <div className="lg:col-span-5 h-48 bg-white border border-neutral-200/70 rounded-2xl animate-pulse" />
        </div>
      </main>
    </div>
  );
}
