'use client';

import React from 'react';
import { ClipboardList, Check, X } from 'lucide-react';

interface StudentAttendanceHistorySectionProps {
  attendanceHistory?: any[];
}

export function StudentAttendanceHistorySection({
  attendanceHistory,
}: StudentAttendanceHistorySectionProps) {
  const records = attendanceHistory || [];
  const presentRecords = records.filter((r: any) => r.status === 'PRESENT');
  const attendanceRate = records.length > 0
    ? Math.round((presentRecords.length / records.length) * 100)
    : 0;

  const presentWithHw = records.filter(
    (r: any) => r.status === 'PRESENT' && r.homeworkStatus && r.homeworkStatus !== 'NO_HOMEWORK'
  );
  let homeworkRate = '0%';
  if (presentWithHw.length === 0) {
    homeworkRate = presentRecords.length > 0 ? '100%' : '0%';
  } else {
    const done = presentWithHw.filter(
      (r: any) =>
        r.homeworkStatus === 'COMPLETED' ||
        r.homeworkStatus === 'SUBMITTED' ||
        r.homeworkStatus === 'EXCUSED' ||
        r.homeworkStatus === 'CHECKED_ONSITE'
    ).length;
    homeworkRate = `${Math.round((done / presentWithHw.length) * 100)}%`;
  }

  return (
    <section>
      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-emerald-600" />
        الحضور والواجبات (آخر 10 حصص)
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50 flex flex-col justify-center">
          <span className="text-xs text-emerald-600 font-semibold mb-1">نسبة الحضور</span>
          <span className="text-2xl font-black text-emerald-700">{attendanceRate}%</span>
        </div>
        <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50 flex flex-col justify-center">
          <span className="text-xs text-blue-600 font-semibold mb-1">نسبة حل الواجب</span>
          <span className="text-2xl font-black text-blue-700">{homeworkRate}</span>
        </div>
      </div>

      {records.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-center text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-3 border-b border-slate-100 text-slate-600 font-bold whitespace-nowrap text-start">الحصة</th>
                  {records.map((_: any, i: number) => (
                    <th key={i} className="p-2 border-b border-slate-100 font-mono text-slate-400 min-w-[40px]">{records.length - i}</th>
                  )).reverse()}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-slate-50 text-slate-700 font-bold whitespace-nowrap text-start">الحضور</td>
                  {[...records].reverse().map((record: any) => {
                    const isPresent = record.status === 'PRESENT';
                    return (
                      <td key={`att-${record.id}`} className="p-2 border-b border-slate-50">
                        <div className={`mx-auto w-6 h-6 rounded-md flex items-center justify-center border ${
                          isPresent ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-500'
                        }`} title={isPresent ? 'حاضر' : 'غائب'}>
                          {isPresent ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="p-3 text-slate-700 font-bold whitespace-nowrap text-start">الواجب</td>
                  {[...records].reverse().map((record: any) => {
                    const isPresent = record.status === 'PRESENT';
                    const hasHw = record.homeworkStatus && record.homeworkStatus !== 'NO_HOMEWORK';
                    const hwDone = record.homeworkStatus === 'COMPLETED' || record.homeworkStatus === 'SUBMITTED' || record.homeworkStatus === 'EXCUSED' || record.homeworkStatus === 'CHECKED_ONSITE';
                    return (
                      <td key={`hw-${record.id}`} className="p-2">
                        {!isPresent ? (
                          <div className="mx-auto w-6 h-6 rounded-md flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-300" title="لم يحضر">
                            -
                          </div>
                        ) : !hasHw ? (
                          <div className="mx-auto w-6 h-6 rounded-md flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-400 text-xs" title="لا يوجد واجب لهذه الحصة">
                            -
                          </div>
                        ) : (
                          <div className={`mx-auto w-6 h-6 rounded-md flex items-center justify-center border ${
                            hwDone ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-red-50 border-red-200 text-red-600'
                          }`} title={hwDone ? 'تم حل الواجب' : 'لم يحل الواجب'}>
                            {hwDone ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-slate-500 text-sm bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
          لا توجد سجلات حضور أو واجبات لهذا الطالب بعد.
        </div>
      )}
    </section>
  );
}
