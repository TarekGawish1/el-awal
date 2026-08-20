'use client';

import React, { useState, useEffect } from 'react';
import { useManualAttendance } from '../hooks/use-attendance';
import { AttendanceRecord, AttendanceStatus, BatchAttendanceDto } from '../types/attendance.types';
import { ExcuseNoteModal } from './ExcuseNoteModal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FileText, Edit2, CheckCircle2 } from 'lucide-react';

interface ManualAttendanceRosterProps {
  sessionId: string;
  records: AttendanceRecord[];
}

export function ManualAttendanceRoster({ sessionId, records }: ManualAttendanceRosterProps) {
  const [localRecords, setLocalRecords] = useState<Record<string, AttendanceStatus>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [excuseModalStudent, setExcuseModalStudent] = useState<{
    studentId: string;
    fullName: string;
    studentCode?: string;
    currentNote?: string;
  } | null>(null);

  const { mutate, isPending, error, isSuccess } = useManualAttendance();

  useEffect(() => {
    const initialStatusState: Record<string, AttendanceStatus> = {};
    const initialNotesState: Record<string, string> = {};

    records.forEach((r) => {
      if (r.status) {
        initialStatusState[r.studentId] = r.status;
      }
      if (r.notes) {
        initialNotesState[r.studentId] = r.notes;
      }
    });

    setLocalRecords(initialStatusState);
    setLocalNotes(initialNotesState);
    setHasChanges(false);
  }, [records]);

  const handleStatusChange = (
    studentId: string,
    status: AttendanceStatus,
    student?: { fullName: string; studentCode?: string }
  ) => {
    if (status === 'EXCUSED') {
      // Open modal to prompt for excuse note
      setExcuseModalStudent({
        studentId,
        fullName: student?.fullName || 'الطالب',
        studentCode: student?.studentCode,
        currentNote: localNotes[studentId] || '',
      });
      return;
    }

    // Direct status change for PRESENT and ABSENT
    setLocalRecords((prev) => ({ ...prev, [studentId]: status }));
    setHasChanges(true);
  };

  const handleSaveExcuseNote = (note: string) => {
    if (!excuseModalStudent) return;
    const { studentId } = excuseModalStudent;

    setLocalRecords((prev) => ({ ...prev, [studentId]: 'EXCUSED' }));
    setLocalNotes((prev) => ({ ...prev, [studentId]: note }));
    setHasChanges(true);
    setExcuseModalStudent(null);
  };

  const handleSave = () => {
    const payload: BatchAttendanceDto = {
      records: Object.entries(localRecords)
        .filter(([_, status]) => status !== null)
        .map(([studentId, status]) => ({
          studentId,
          status,
          notes: localNotes[studentId] || undefined,
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

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
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
                const currentNote = localNotes[record.studentId];

                return (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div>
                        <p className="font-bold text-slate-800">{record.fullName}</p>
                        {currentStatus === 'EXCUSED' && currentNote && (
                          <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                            <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="truncate max-w-[200px]">{currentNote}</span>
                            <button
                              type="button"
                              onClick={() => setExcuseModalStudent({
                                studentId: record.studentId,
                                fullName: record.fullName,
                                studentCode: record.studentCode,
                                currentNote: currentNote,
                              })}
                              className="text-amber-700 hover:text-amber-900 mr-1 p-0.5 rounded"
                              title="تعديل العذر"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md">{record.studentCode}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-3 rtl:space-x-reverse">
                        <button
                          type="button"
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
                          type="button"
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
                          type="button"
                          onClick={() => handleStatusChange(record.studentId, 'EXCUSED', {
                            fullName: record.fullName,
                            studentCode: record.studentCode,
                          })}
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

      {/* Mobile Card Roster View */}
      <div className="block md:hidden space-y-3">
        {records.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-sm">
            لا يوجد طلاب مسجلين في هذه المجموعة.
          </div>
        ) : (
          records.map((record) => {
            const currentStatus = localRecords[record.studentId] || record.status;
            const currentNote = localNotes[record.studentId];

            return (
              <div
                key={record.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  currentStatus === 'PRESENT'
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : currentStatus === 'ABSENT'
                    ? 'bg-rose-50/40 border-rose-200'
                    : currentStatus === 'EXCUSED'
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{record.fullName}</h4>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-0.5 inline-block">
                      {record.studentCode}
                    </span>
                  </div>

                  {currentStatus === 'EXCUSED' && currentNote && (
                    <button
                      type="button"
                      onClick={() => setExcuseModalStudent({
                        studentId: record.studentId,
                        fullName: record.fullName,
                        studentCode: record.studentCode,
                        currentNote: currentNote,
                      })}
                      className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100/70 px-2 py-1 rounded-lg font-medium"
                    >
                      <FileText className="w-3 h-3 text-amber-600" />
                      <span>تعديل العذر</span>
                    </button>
                  )}
                </div>

                {/* Full-width thumb-friendly buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(record.studentId, 'PRESENT')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center ${
                      currentStatus === 'PRESENT'
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    حاضر ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(record.studentId, 'ABSENT')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center ${
                      currentStatus === 'ABSENT'
                        ? 'bg-rose-600 text-white shadow-rose-600/30'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    غائب ✗
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(record.studentId, 'EXCUSED', {
                      fullName: record.fullName,
                      studentCode: record.studentCode,
                    })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center ${
                      currentStatus === 'EXCUSED'
                        ? 'bg-amber-500 text-white shadow-amber-500/30'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    بعذر 📋
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pop up to add and edit excuses */}
      {excuseModalStudent && (
        <ExcuseNoteModal
          isOpen={!!excuseModalStudent}
          onClose={() => setExcuseModalStudent(null)}
          studentName={excuseModalStudent.fullName}
          studentCode={excuseModalStudent.studentCode}
          initialNote={excuseModalStudent.currentNote}
          onSave={handleSaveExcuseNote}
        />
      )}
    </div>
  );
}
