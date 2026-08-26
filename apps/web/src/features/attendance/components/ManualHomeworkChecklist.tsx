'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { offlineDb, HomeworkRecordEntity } from '@/lib/offline/db';
import { useSessionReport } from '../hooks/use-attendance';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Search,
  CheckCircle2,
  Circle,
  Clock,
  ClipboardCheck,
  Users,
  AlertCircle,
  Sparkles,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ManualHomeworkChecklistProps {
  sessionId: string;
  groupId?: string;
  assessmentId?: string;
  assessmentTitle?: string;
}

interface StudentChecklistItem {
  studentId: string;
  studentCode: string;
  fullName: string;
  isChecked: boolean;
  score?: number | null;
  feedback?: string | null;
  attendanceStatus?: 'PRESENT' | 'ABSENT' | 'EXCUSED' | null;
  checkedAt?: string | null;
}

export function ManualHomeworkChecklist({
  sessionId,
  groupId,
  assessmentId = 'default-session-homework',
  assessmentTitle = 'واجب الحصة الدراسية',
}: ManualHomeworkChecklistProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch session report (online or offline cache)
  const { data: sessionReport, refetch: refetchReport } = useSessionReport(sessionId);

  // Load student checklist from offline DB and session report
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Get students for session
      let candidateStudents: Array<{ id: string; studentCode?: string; fullName?: string }> = [];

      if (sessionReport?.records && sessionReport.records.length > 0) {
        candidateStudents = sessionReport.records.map((r: any) => ({
          id: r.studentId,
          studentCode: r.studentCode,
          fullName: r.fullName,
        }));
      } else if (groupId) {
        const roster = await offlineDb.getRoster(groupId);
        if (roster?.students && roster.students.length > 0) {
          candidateStudents = roster.students.map((s: any) => ({
            id: s.id,
            studentCode: s.studentCode,
            fullName: s.fullName,
          }));
        } else {
          const offlineStudents = await offlineDb.getStudentsOffline({ groupId });
          candidateStudents = offlineStudents.map((s: any) => ({
            id: s.id,
            studentCode: s.studentCode,
            fullName: s.fullName,
          }));
        }
      }

      // 1.5 Hydrate offline database if server returned homework records
      if (sessionReport?.homeworkRecords && Array.isArray(sessionReport.homeworkRecords)) {
        for (const hr of sessionReport.homeworkRecords) {
          await offlineDb.homework_records.put({
            id: hr.id,
            assessmentId: hr.assessmentId,
            studentId: hr.studentId,
            sessionId: hr.sessionId,
            status: hr.status,
            score: hr.score !== null && hr.score !== undefined ? Number(hr.score) : undefined,
            feedback: hr.feedback,
            recordedMethod: hr.recordedMethod,
            clientTimestamp: hr.clientTimestamp ? new Date(hr.clientTimestamp).getTime() : Date.now(),
            syncStatus: 'SYNCED',
          });
        }
      }

      // 2. Get existing homework records
      const hwRecords = await offlineDb.getHomeworkRecordsForSession(sessionId, assessmentId);
      const hwMap = new Map<string, HomeworkRecordEntity>(hwRecords.map((h) => [h.studentId, h]));

      // 3. Get session attendance map
      const attendanceMap = new Map<string, string>();
      if (sessionReport?.records) {
        sessionReport.records.forEach((r: any) => {
          if (r.status) attendanceMap.set(r.studentId, r.status);
        });
      }

      const items: StudentChecklistItem[] = candidateStudents.map((stu) => {
        const hw = hwMap.get(stu.id);
        const serverRec = sessionReport?.records?.find(
          (r: any) => String(r.studentId).trim() === String(stu.id).trim(),
        );
        const isChecked =
          hw?.status === 'CHECKED_ONSITE' || serverRec?.homeworkStatus === 'CHECKED_ONSITE';
        const attStatus = attendanceMap.get(stu.id) || (isChecked ? 'PRESENT' : null);

        const checkedTimestamp = hw?.clientTimestamp || serverRec?.homeworkCheckedAt;
        const checkedAt = checkedTimestamp
          ? new Date(checkedTimestamp).toLocaleTimeString('ar-EG', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : null;

        return {
          studentId: stu.id,
          studentCode: stu.studentCode || serverRec?.studentCode || '',
          fullName: stu.fullName || serverRec?.fullName || 'طالب',
          isChecked,
          score: hw?.score ?? serverRec?.homeworkScore,
          feedback: hw?.feedback ?? serverRec?.homeworkFeedback,
          attendanceStatus: attStatus as any,
          checkedAt,
        };
      });

      setStudents(items);
    } catch (e) {
      console.warn('Failed to load homework checklist:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId, groupId, assessmentId, sessionReport]);

  const handleToggleHomework = async (item: StudentChecklistItem) => {
    setUpdatingId(item.studentId);
    const newChecked = !item.isChecked;

    try {
      if (newChecked) {
        // Mark as CHECKED_ONSITE + Auto attendance PRESENT
        await offlineDb.recordHomeworkOnsiteOffline({
          assessmentId,
          studentId: item.studentId,
          sessionId,
          status: 'CHECKED_ONSITE',
          recordedMethod: 'MANUAL',
          score: item.score ?? 10,
          studentName: item.fullName,
          studentCode: item.studentCode,
        });

        setStudents((prev) =>
          prev.map((s) =>
            s.studentId === item.studentId
              ? {
                  ...s,
                  isChecked: true,
                  attendanceStatus: 'PRESENT',
                  score: s.score ?? 10,
                  checkedAt: new Date().toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                }
              : s,
          ),
        );

        toast.success(`تم استلام الواجب ورصد الحضور: ${item.fullName}`);
      } else {
        // Mark as NOT_SUBMITTED
        await offlineDb.recordHomeworkOnsiteOffline({
          assessmentId,
          studentId: item.studentId,
          sessionId,
          status: 'NOT_SUBMITTED',
          recordedMethod: 'MANUAL',
          score: null,
          studentName: item.fullName,
          studentCode: item.studentCode,
        });

        setStudents((prev) =>
          prev.map((s) =>
            s.studentId === item.studentId
              ? {
                  ...s,
                  isChecked: false,
                  score: null,
                  checkedAt: null,
                }
              : s,
          ),
        );

        toast('تم إلغاء تأشير استلام الواجب', { icon: 'ℹ️' });
      }

      if (refetchReport) {
        refetchReport();
      }
    } catch (err: any) {
      toast.error('حدث خطأ أثناء حفظ حالة الواجب');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.trim().toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(query) ||
        s.studentCode.toLowerCase().includes(query),
    );
  }, [students, searchQuery]);

  const checkedCount = useMemo(() => students.filter((s) => s.isChecked).length, [students]);
  const totalCount = students.length;
  const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">إجمالي طلاب الحصة</p>
          <p className="text-xl font-black text-slate-800 mt-1">{totalCount}</p>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-700">تم تسليم الواجب</p>
          <p className="text-xl font-black text-emerald-800 mt-1">{checkedCount}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">لم يسلموا بعد</p>
          <p className="text-xl font-black text-slate-700 mt-1">{totalCount - checkedCount}</p>
        </div>

        <div className="bg-primary-50/60 p-4 rounded-2xl border border-primary-200 shadow-xs">
          <p className="text-xs font-semibold text-primary-700">نسبة التسليم</p>
          <p className="text-xl font-black text-primary-800 mt-1">{percentage}%</p>
        </div>
      </div>

      {/* Search & Action Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب أو كود الطالب..."
            className="pr-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              // Quick check-all for remaining students
              const unchecked = students.filter((s) => !s.isChecked);
              if (unchecked.length === 0) return;
              for (const s of unchecked) {
                await offlineDb.recordHomeworkOnsiteOffline({
                  assessmentId,
                  studentId: s.studentId,
                  sessionId,
                  status: 'CHECKED_ONSITE',
                  recordedMethod: 'MANUAL',
                  score: 10,
                  studentName: s.fullName,
                  studentCode: s.studentCode,
                });
              }
              await loadData();
              toast.success('تم رصد تسليم الواجب والحضور للجميع');
            }}
            className="text-xs h-9"
          >
            تحديد الكل كـ مستلم (تسليم جماعي)
          </Button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل قائمة الطلاب...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {searchQuery ? 'لا يوجد طلاب يطابقون البحث الحالي.' : 'لا يوجد طلاب مسجلين في هذه الحصة.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">كود الطالب</th>
                  <th className="py-3.5 px-4">اسم الطالب</th>
                  <th className="py-3.5 px-4 text-center">حالة استلام الواجب في السنتر</th>
                  <th className="py-3.5 px-4 text-center">حضور الحصة (تلقائي)</th>
                  <th className="py-3.5 px-4 text-center">وقت الاستلام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => (
                  <tr
                    key={student.studentId}
                    className={`transition-colors hover:bg-slate-50/60 ${
                      student.isChecked ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {student.studentCode || '—'}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{student.fullName}</p>
                    </td>

                    {/* Homework Delivery Toggle Checkbox Button */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={updatingId === student.studentId}
                        onClick={() => handleToggleHomework(student)}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-2xs cursor-pointer ${
                          student.isChecked
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {student.isChecked ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>تم استلام ومراجعة الواجب</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4 text-slate-400" />
                            <span>لم يُسلَّم</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Automatic Session Attendance Status Badge */}
                    <td className="py-3 px-4 text-center">
                      {student.attendanceStatus === 'PRESENT' ? (
                        <Badge variant="success" className="px-2.5 py-1 font-bold">
                          حاضر ✓
                        </Badge>
                      ) : student.attendanceStatus === 'EXCUSED' ? (
                        <Badge variant="warning" className="px-2.5 py-1 font-bold">
                          معذور
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="px-2.5 py-1 text-slate-400">
                          غائب
                        </Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {student.checkedAt ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {student.checkedAt}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
