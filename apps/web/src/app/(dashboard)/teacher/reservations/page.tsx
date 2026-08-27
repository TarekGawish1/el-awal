'use client';

import React from 'react';
import { PendingReservationsSection } from '@/features/dashboard/components/PendingReservationsSection';

export default function TeacherReservationsPage() {
  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-amber-400 to-amber-600"></div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">طلبات الانضمام</h1>
          <p className="mt-1 sm:mt-3 text-slate-500 text-sm sm:text-lg">
            إدارة ومراجعة طلبات الانضمام الجديدة للمجموعات الدراسية وتأكيد حجز الطلاب.
          </p>
        </div>
      </div>
      
      <PendingReservationsSection />
    </div>
  );
}
