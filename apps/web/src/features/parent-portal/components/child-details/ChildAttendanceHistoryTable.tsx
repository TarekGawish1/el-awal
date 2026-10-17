'use client';

import React from 'react';
import { ClipboardList, TrendingUp, Check, X, FileWarning } from 'lucide-react';

interface ChildAttendanceHistoryTableProps {
  attendanceHistory: any[];
  totalAttended: number;
  totalAssignedHw: number;
  hwCompleted: number;
  hwMissing: number;
  hwIncomplete: number;
}

export function ChildAttendanceHistoryTable({
  attendanceHistory,
  totalAttended,
  totalAssignedHw,
  hwCompleted,
  hwMissing,
  hwIncomplete,
}: ChildAttendanceHistoryTableProps) {
  const attendanceRate =
    attendanceHistory && attendanceHistory.length > 0
      ? Math.round(
          (attendanceHistory.filter((r: any) => r.status === 'PRESENT').length /
            attendanceHistory.length) *
            100
        )
      : 0;

  const hwRate =
    totalAssignedHw > 0
      ? `${Math.round((hwCompleted / totalAssignedHw) * 100)}%`
      : totalAttended > 0
      ? '100%'
      : '0%';

  return (
    <>
      {/* Detailed Homework & Performance */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary-600" />
          المستوى الأكاديمي والواجبات
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-500 mb-1">مستوى الأداء</p>
            <p className="text-lg font-black text-slate-800">
              {totalAssignedHw > 0
                ? hwCompleted / totalAssignedHw >= 0.8
                  ? 'ممتاز'
                  : hwCompleted / totalAssignedHw >= 0.5
                  ? 'جيد'
                  : 'ضعيف'
                : totalAttended > 0
                ? 'منتظم'
                : 'غير محدد'}
            </p>
          </div>
          <div className="bg-green-50 p-3 rounded-2xl border border-green-100 text-center">
            <p className="text-[10px] font-bold text-green-700 mb-1">تم حله</p>
            <p className="text-lg font-black text-green-700">{hwCompleted}</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-center">
            <p className="text-[10px] font-bold text-amber-700 mb-1">واجب ناقص</p>
            <p className="text-lg font-black text-amber-700">{hwIncomplete}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
            <p className="text-[10px] font-bold text-red-700 mb-1">لم يُحل</p>
            <p className="text-lg font-black text-red-700">{hwMissing}</p>
          </div>
        </div>
      </div>

      {/* Performance & Attendance History Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4 text-primary-600" />
          سجل الحضور والواجبات (آخر 10 حصص)
        </h4>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 bg-green-50 p-3 rounded-xl border border-green-100 text-center">
              <p className="text-xs text-green-700 font-bold mb-1">نسبة الحضور</p>
              <p className="text-xl font-black text-green-700">{attendanceRate}%</p>
            </div>
            <div className="flex-1 bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
              <p className="text-xs text-blue-700 font-bold mb-1">نسبة حل الواجب</p>
              <p className="text-xl font-black text-blue-700">{hwRate}</p>
            </div>
          </div>

          <div className="space-y-2 overflow-x-auto custom-scrollbar pb-2">
            {attendanceHistory && attendanceHistory.length > 0 ? (
              <table className="w-full text-center text-xs">
                <thead>
                  <tr>
                    <th className="p-2 border-b border-slate-100 text-slate-500 font-bold whitespace-nowrap text-start">
                      الحصة
                    </th>
                    {attendanceHistory
                      .map((_: any, i: number) => (
                        <th
                          key={i}
                          className="p-2 border-b border-slate-100 font-mono text-slate-400 min-w-[40px]"
                        >
                          {attendanceHistory.length - i}
                        </th>
                      ))
                      .reverse()}
                  </tr>
                </thead>
                <tbody>
                  {/* Attendance Row */}
                  <tr>
                    <td className="p-2 border-b border-slate-50 text-slate-700 font-bold whitespace-nowrap text-start">
                      الحضور
                    </td>
                    {[...attendanceHistory].reverse().map((record: any) => {
                      const isPresent = record.status === 'PRESENT';
                      return (
                        <td key={`att-${record.id}`} className="p-2 border-b border-slate-50">
                          <div
                            className={`mx-auto w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                              isPresent
                                ? 'bg-green-100 border-green-200 text-green-600'
                                : 'bg-red-50 border-red-200 text-red-500'
                            }`}
                            title={isPresent ? 'حاضر' : 'غائب'}
                          >
                            {isPresent ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {/* Homework Row */}
                  <tr>
                    <td className="p-2 text-slate-700 font-bold whitespace-nowrap text-start border-t border-slate-100">
                      الواجب
                    </td>
                    {[...attendanceHistory].reverse().map((record: any) => {
                      const isPresent = record.status === 'PRESENT';

                      let hwIcon = <span className="text-lg leading-none font-medium text-slate-400">-</span>;
                      let hwClass = 'bg-slate-50 border-slate-200';
                      let hwTitle = 'لم يحضر';

                      if (isPresent) {
                        if (
                          record.homeworkStatus === 'COMPLETED' ||
                          record.homeworkStatus === 'SUBMITTED' ||
                          record.homeworkStatus === 'EXCUSED' ||
                          record.homeworkStatus === 'CHECKED_ONSITE'
                        ) {
                          hwIcon = <Check className="w-4 h-4" />;
                          hwClass = 'bg-blue-100 border-blue-200 text-blue-600';
                          hwTitle = 'تم حل الواجب';
                        } else if (record.homeworkStatus === 'INCOMPLETE') {
                          hwIcon = <FileWarning className="w-4 h-4" />;
                          hwClass = 'bg-amber-100 border-amber-200 text-amber-600';
                          hwTitle = 'واجب ناقص';
                        } else if (
                          record.homeworkStatus === 'MISSING' ||
                          record.homeworkStatus === 'NOT_SUBMITTED'
                        ) {
                          hwIcon = <X className="w-4 h-4" />;
                          hwClass = 'bg-red-100 border-red-200 text-red-600';
                          hwTitle = 'لم يحل الواجب';
                        } else {
                          hwIcon = <span className="text-sm font-bold text-slate-400">-</span>;
                          hwClass = 'bg-slate-50 border-slate-200 text-slate-400';
                          hwTitle = 'لا يوجد واجب لهذه الحصة';
                        }
                      }

                      return (
                        <td key={`hw-${record.id}`} className="p-2 border-t border-slate-100">
                          <div
                            className={`mx-auto w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${hwClass}`}
                            title={hwTitle}
                          >
                            {hwIcon}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-slate-500 text-sm bg-slate-50 rounded-xl">
                لا يوجد سجل حصص مسجل لهذا الطالب بعد.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
