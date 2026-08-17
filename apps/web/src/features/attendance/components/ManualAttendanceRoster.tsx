'use client';

import React, { useState, useEffect } from 'react';
import { useManualAttendance } from '../hooks/use-attendance';
import { AttendanceRecord, AttendanceStatus, BatchAttendanceDto } from '../types/attendance.types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface ManualAttendanceRosterProps {
  sessionId: string;
  records: AttendanceRecord[];
}

export function ManualAttendanceRoster({ sessionId, records }: ManualAttendanceRosterProps) {
  const [localRecords, setLocalRecords] = useState<Record<string, AttendanceStatus>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const { mutate, isPending, error, isSuccess } = useManualAttendance();

  useEffect(() => {
    const initialState: Record<string, AttendanceStatus> = {};
    records.forEach((r) => {
      initialState[r.studentId] = r.status;
    });
    setLocalRecords(initialState);
    setHasChanges(false);
  }, [records]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setLocalRecords((prev) => ({ ...prev, [studentId]: status }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const payload: BatchAttendanceDto = {
      records: Object.entries(localRecords).map(([studentId, status]) => ({
        studentId,
        status,
      })),
    };

    mutate({ sessionId, payload }, {
      onSuccess: () => setHasChanges(false),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">سجل حضور المجموعة</h3>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isPending}
          className="rounded-xl px-6"
        >
          {isPending ? 'جاري الحفظ...' : 'حفظ الحضور'}
        </Button>
      </div>

      {isSuccess && !hasChanges && (
        <Alert variant="success">تم تحديث سجلات الحضور بنجاح.</Alert>
      )}

      {error && (
        <Alert variant="error">فشل حفظ الحضور. يرجى المحاولة مرة أخرى.</Alert>
      )}

      <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
        <table className="w-full text-sm text-start">
          <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-600 text-start">اسم الطالب</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-start">كود الطالب</th>
              <th className="px-6 py-4 font-semibold text-slate-600 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {records.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p>لا يوجد طلاب مسجلين في هذه المجموعة.</p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const currentStatus = localRecords[record.studentId] || record.status;
                return (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{record.fullName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md">{record.studentCode}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-3 rtl:space-x-reverse">
                        <button
                          onClick={() => handleStatusChange(record.studentId, 'PRESENT')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                          }`}
                        >
                          حاضر
                        </button>
                        <button
                          onClick={() => handleStatusChange(record.studentId, 'ABSENT')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'ABSENT'
                              ? 'bg-rose-100 text-rose-800 ring-2 ring-rose-500/20 shadow-sm'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                          }`}
                        >
                          غائب
                        </button>
                        <button
                          onClick={() => handleStatusChange(record.studentId, 'EXCUSED')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'EXCUSED'
                              ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-500/20 shadow-sm'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                          }`}
                        >
                          بعذر
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
