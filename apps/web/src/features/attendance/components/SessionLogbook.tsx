'use client';

import React, { useState, useEffect } from 'react';
import { useSessionReport } from '../hooks/use-attendance';
import { offlineDb } from '@/lib/offline/db';
import { ClipboardCheck, ClipboardList, CheckCircle2, XCircle, AlertTriangle, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface SessionLogbookProps {
  sessionId: string;
}

export function SessionLogbook({ sessionId }: SessionLogbookProps) {
  const { data: sessionReport, isLoading } = useSessionReport(sessionId);
  const [homeworkRecords, setHomeworkRecords] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    // Homework records are not fully included in sessionReport from local mutations,
    // so we fetch them directly from offlineDb just like QrHomeworkScanner does.
    offlineDb
      .getHomeworkRecordsForSession(sessionId, 'default-session-homework')
      .then((records) => {
        if (isMounted) {
          setHomeworkRecords(records);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [sessionId, sessionReport]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent mb-2"></div>
        <span className="text-sm font-bold text-slate-500">جاري تحميل الدفتر...</span>
      </div>
    );
  }

  const students = sessionReport?.records || [];

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-sm">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              الدفتر الشامل للحصة
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>عرض حالة الحضور والواجب لكل طالب في صفحة واحدة</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="info" className="px-3 py-1.5 text-xs font-bold gap-1.5 shadow-xs bg-white">
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>الإجمالي: {students.length} طالب</span>
          </Badge>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-700 text-start">اسم الطالب</th>
                <th className="px-6 py-4 font-bold text-slate-700 text-center">حالة الحضور</th>
                <th className="px-6 py-4 font-bold text-slate-700 text-center">حالة الواجب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 text-sm">
                    لا يوجد طلاب مسجلين في هذه المجموعة.
                  </td>
                </tr>
              ) : (
                students.map((student: any) => {
                  const hwRecord = homeworkRecords.find((r) => r.studentId === student.studentId);
                  const attStatus = student.status;
                  const hwStatus = hwRecord?.status;

                  return (
                    <tr key={student.studentId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">{student.fullName || student.studentName}</div>
                        {student.studentCode && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 bg-slate-100 inline-block px-1.5 rounded">
                            {student.studentCode}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {attStatus === 'PRESENT' ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> حاضر
                          </span>
                        ) : attStatus === 'ABSENT' ? (
                          <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5" /> غائب
                          </span>
                        ) : attStatus === 'EXCUSED' ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" /> بعذر
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">
                            غير مسجل
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {hwStatus === 'CHECKED_ONSITE' ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> حل الواجب
                          </span>
                        ) : hwStatus === 'NOT_SUBMITTED' ? (
                          <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5" /> لم يحل
                          </span>
                        ) : hwStatus === 'INCOMPLETE' ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" /> ناقص
                          </span>
                        ) : hwStatus === 'EXCUSED' ? (
                          <span className="inline-flex items-center gap-1.5 bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                            <ClipboardCheck className="w-3.5 h-3.5" /> بعذر
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-xs font-bold">
                            لم يقيم
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
