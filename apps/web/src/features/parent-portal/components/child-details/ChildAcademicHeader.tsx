'use client';

import React from 'react';

interface ChildAcademicHeaderProps {
  studentName: string;
  studentId: string;
  studentCode?: string;
  academicStage?: string;
  gradeLevel?: string;
}

export function ChildAcademicHeader({
  studentName,
  studentId,
  studentCode,
  academicStage,
  gradeLevel,
}: ChildAcademicHeaderProps) {
  return (
    <>
      {/* Student Header */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl shrink-0">
          {studentName.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{studentName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {studentCode || `STU-${studentId.slice(0, 6)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Academic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <span className="text-xs font-semibold text-slate-500">المرحلة الدراسية</span>
          <p className="text-sm font-bold text-slate-900">
            {academicStage === 'PRIMARY' ? 'المرحلة الابتدائية' : 
             academicStage === 'MIDDLE' ? 'المرحلة الإعدادية' : 
             academicStage === 'SECONDARY' ? 'المرحلة الثانوية' : 
             academicStage || 'غير محدد'}
          </p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <span className="text-xs font-semibold text-slate-500">الصف الدراسي</span>
          <p className="text-sm font-bold text-slate-900">{gradeLevel || 'غير محدد'}</p>
        </div>
      </div>
    </>
  );
}
