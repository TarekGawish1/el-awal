'use client';

import React, { useState, useEffect } from 'react';
import { useSessionReport, useManualAttendance } from '../hooks/use-attendance';
import toast from 'react-hot-toast';
import { offlineDb } from '@/lib/offline/db';
import { ClipboardCheck, ClipboardList, CheckCircle2, XCircle, AlertTriangle, UserCheck, Search, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

const ATTENDANCE_OPTIONS = {
  PRESENT: { label: 'حاضر', bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  ABSENT: { label: 'غائب', bg: 'bg-rose-50 text-rose-700 ring-rose-200', icon: XCircle },
  EXCUSED: { label: 'بعذر', bg: 'bg-amber-50 text-amber-700 ring-amber-200', icon: AlertTriangle },
};

const HOMEWORK_OPTIONS = {
  CHECKED_ONSITE: { label: 'حل الواجب', bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  NOT_SUBMITTED: { label: 'لم يحل', bg: 'bg-rose-50 text-rose-700 ring-rose-200', icon: XCircle },
  INCOMPLETE: { label: 'ناقص', bg: 'bg-amber-50 text-amber-700 ring-amber-200', icon: AlertTriangle },
  EXCUSED: { label: 'بعذر', bg: 'bg-slate-100 text-slate-700 ring-slate-300', icon: ClipboardCheck },
};

function StatusDropdown({
  value,
  options,
  onChange,
  defaultLabel,
}: {
  value: string;
  options: Record<string, { label: string; bg: string; icon: any }>;
  onChange: (val: string) => void;
  defaultLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const current = options[value] || { label: defaultLabel, bg: 'bg-slate-50 text-slate-500 ring-slate-200', icon: null };
  const Icon = current.icon;

  return (
    <div className="relative inline-block text-right" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-inset transition-all hover:brightness-95 w-[110px] ${current.bg}`}
      >
        <span className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {current.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-36 rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50 py-1 right-0 sm:right-1/2 sm:translate-x-1/2 animate-in fade-in zoom-in-95">
          {Object.entries(options).map(([val, { label, icon: OptIcon }]) => {
            const isSelected = value === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  onChange(val);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors hover:bg-slate-50 ${
                  isSelected ? 'text-primary-600 bg-primary-50/50' : 'text-slate-700'
                }`}
              >
                <OptIcon className={`w-4 h-4 ${isSelected ? 'text-primary-600' : 'text-slate-400'}`} />
                {label}
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 mr-auto text-primary-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="overflow-x-auto overflow-y-visible pb-24 -mb-24">
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
                        <StatusDropdown
                          value={attStatus}
                          options={ATTENDANCE_OPTIONS}
                          onChange={(val) => handleAttendanceChange(student, val)}
                          defaultLabel="غير مسجل"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusDropdown
                          value={hwStatus}
                          options={HOMEWORK_OPTIONS}
                          onChange={(val) => handleHomeworkChange(student, val)}
                          defaultLabel="لم يقيم"
                        />
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
