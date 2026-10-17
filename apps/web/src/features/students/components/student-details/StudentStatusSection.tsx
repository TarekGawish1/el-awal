'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { CheckCircle, UserX } from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';

interface StudentStatusSectionProps {
  studentId: string;
  academicStatus?: string;
  updateStatusMutation: UseMutationResult<any, any, { id: string; status: any }, any>;
}

export function StudentStatusSection({
  studentId,
  academicStatus,
  updateStatusMutation,
}: StudentStatusSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
        <UserX className="w-4 h-4 text-amber-600" />
        حالة الطالب
      </h3>
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={academicStatus === 'ACTIVE' ? 'primary' : 'outline'}
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ id: studentId, status: 'ACTIVE' })}
            className={`text-xs rounded-xl py-1.5 px-4 font-bold ${academicStatus !== 'ACTIVE' ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200' : ''}`}
          >
            {academicStatus === 'ACTIVE' && <CheckCircle className="w-3.5 h-3.5 rtl:ml-1.5 ltr:mr-1.5" />}
            نشط
          </Button>
          <Button
            type="button"
            size="sm"
            variant={academicStatus === 'LEFT' ? 'secondary' : 'outline'}
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ id: studentId, status: 'LEFT' })}
            className={`text-xs rounded-xl py-1.5 px-4 font-bold ${academicStatus === 'LEFT' ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'}`}
          >
            {academicStatus === 'LEFT' && <CheckCircle className="w-3.5 h-3.5 rtl:ml-1.5 ltr:mr-1.5 text-amber-700" />}
            غادر السنتر
          </Button>
          <Button
            type="button"
            size="sm"
            variant={academicStatus === 'SUSPENDED' ? 'secondary' : 'outline'}
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ id: studentId, status: 'SUSPENDED' })}
            className={`text-xs rounded-xl py-1.5 px-4 font-bold ${academicStatus === 'SUSPENDED' ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'}`}
          >
            {academicStatus === 'SUSPENDED' && <CheckCircle className="w-3.5 h-3.5 rtl:ml-1.5 ltr:mr-1.5 text-red-700" />}
            موقوف
          </Button>
        </div>
      </div>
    </section>
  );
}
