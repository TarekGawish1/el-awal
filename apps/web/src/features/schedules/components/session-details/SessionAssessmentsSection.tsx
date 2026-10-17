'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, FileSpreadsheet, Users } from 'lucide-react';

interface SessionAssessmentsSectionProps {
  groupAssessments: any[];
  buildAssessmentLink: (type: 'ASSIGNMENT' | 'EXAM') => string;
}

export function SessionAssessmentsSection({
  groupAssessments,
  buildAssessmentLink,
}: SessionAssessmentsSectionProps) {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-primary-600" />
          الواجبات والاختبارات المرتبطة بالحصة
        </h3>
      </div>

      {groupAssessments && groupAssessments.length > 0 ? (
        <div className="space-y-2">
          {groupAssessments.slice(0, 4).map((item: any) => (
            <div
              key={item.id}
              className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-primary-200 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                    item.type === 'ASSIGNMENT'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {item.type === 'ASSIGNMENT' ? (
                    <FileSpreadsheet className="w-4 h-4" />
                  ) : (
                    <GraduationCap className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                        item.type === 'ASSIGNMENT'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {item.type === 'ASSIGNMENT' ? 'واجب' : 'اختبار'}
                    </span>
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-primary-700 transition-colors">
                      {item.title}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    الدرجة: {item.totalScore} • {item._count?.questions || 0} أسئلة • {item._count?.submissions || 0} تسليمات
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={`/teacher/assessments/${item.id}/submissions`}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-primary-50 text-slate-700 hover:text-primary-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  التسليمات ({item._count?.submissions || 0})
                </Link>
                <Link
                  href={`/teacher/assessments/${item.id}`}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  عرض
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
          <Link
            href={buildAssessmentLink('ASSIGNMENT')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-xs transition-all flex items-center gap-2.5 text-right group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700">إضافة واجب للحصة</p>
              <p className="text-[10px] text-slate-400">أسئلة تفاعلية أو من المذكرة</p>
            </div>
          </Link>

          <Link
            href={buildAssessmentLink('EXAM')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition-all flex items-center gap-2.5 text-right group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700">إضافة اختبار للحصة</p>
              <p className="text-[10px] text-slate-400">امتحان إلكتروني ورصد فوري</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
