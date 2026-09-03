'use client';

import React, { useState, useEffect } from 'react';
import { useSessionReport, useManualAttendance } from '../hooks/use-attendance';
import toast from 'react-hot-toast';
import { offlineDb } from '@/lib/offline/db';
import { ClipboardCheck, ClipboardList, CheckCircle2, XCircle, AlertTriangle, UserCheck, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface SessionLogbookProps {
  sessionId: string;
}

export function SessionLogbook({ sessionId }: SessionLogbookProps) {
  const { data: sessionReport, isLoading } = useSessionReport(sessionId);
  const { mutate: updateAttendance } = useManualAttendance();
  const [homeworkRecords, setHomeworkRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAttendanceChange = (student: any, newStatus: string) => {
    updateAttendance({
      sessionId,
      payload: {
        records: [{ studentId: student.studentId, status: newStatus as any, notes: 'تعديل من الدفتر الشامل' }]
      }
    }, {
      onSuccess: () => {
        toast.success(`تم تحديث حضور: ${student.fullName || student.studentName}`);
      },
      onError: () => {
        toast.error('حدث خطأ أثناء تحديث الحضور');
      }
    });
  };

  const handleHomeworkChange = async (student: any, newStatus: string) => {
    try {
      await offlineDb.recordHomeworkOnsiteOffline({
        assessmentId: 'default-session-homework',
        studentId: student.studentId,
        sessionId,
        status: newStatus as any,
        recordedMethod: 'MANUAL',
        studentName: student.fullName || student.studentName,
        studentCode: student.studentCode,
        qrCodeToken: student.qrCodeToken || student.studentId,
      });
      toast.success(`تم تحديث واجب: ${student.fullName || student.studentName}`);
      setHomeworkRecords(prev => {
        const next = [...prev];
        const idx = next.findIndex(r => r.studentId === student.studentId);
        if (idx !== -1) {
          next[idx].status = newStatus;
        } else {
          next.push({ studentId: student.studentId, status: newStatus });
        }
        return next;
      });
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ الواجب');
    }
  };

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

      <div className="relative">
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="ابحث باسم الطالب أو الكود..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-3 pr-10 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm shadow-sm transition-all"
        />
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
                students
                  .filter((st: any) => {
                    const q = searchQuery.toLowerCase();
                    const name = (st.fullName || st.studentName || '').toLowerCase();
                    const code = (st.studentCode || '').toLowerCase();
                    return name.includes(q) || code.includes(q);
                  })
                  .map((student: any) => {
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
                        <select
                          value={attStatus || ''}
                          onChange={(e) => handleAttendanceChange(student, e.target.value)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer outline-none ring-1 ring-inset transition-colors ${
                            attStatus === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100' :
                            attStatus === 'ABSENT' ? 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100' :
                            attStatus === 'EXCUSED' ? 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100' :
                            'bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <option value="" disabled>غير مسجل</option>
                          <option value="PRESENT">حاضر</option>
                          <option value="ABSENT">غائب</option>
                          <option value="EXCUSED">بعذر</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <select
                          value={hwStatus || ''}
                          onChange={(e) => handleHomeworkChange(student, e.target.value)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer outline-none ring-1 ring-inset transition-colors ${
                            hwStatus === 'CHECKED_ONSITE' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100' :
                            hwStatus === 'NOT_SUBMITTED' ? 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100' :
                            hwStatus === 'INCOMPLETE' ? 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100' :
                            hwStatus === 'EXCUSED' ? 'bg-slate-100 text-slate-700 ring-slate-300 hover:bg-slate-200' :
                            'bg-slate-50 text-slate-400 ring-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <option value="" disabled>لم يقيم</option>
                          <option value="CHECKED_ONSITE">حل الواجب</option>
                          <option value="NOT_SUBMITTED">لم يحل</option>
                          <option value="INCOMPLETE">ناقص</option>
                          <option value="EXCUSED">بعذر</option>
                        </select>
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
