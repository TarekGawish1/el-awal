'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { offlineDb, HomeworkRecordEntity } from '@/lib/offline/db';
import { useSessionReport } from './use-attendance';
import toast from 'react-hot-toast';

export interface StudentChecklistItem {
  studentId: string;
  studentCode: string;
  fullName: string;
  isChecked: boolean;
  score?: number | null;
  feedback?: string | null;
  attendanceStatus?: 'PRESENT' | 'ABSENT' | 'EXCUSED' | null;
  checkedAt?: string | null;
}

interface UseManualHomeworkChecklistOptions {
  sessionId: string;
  groupId?: string;
  assessmentId?: string;
  assessmentTitle?: string;
}

export function useManualHomeworkChecklist({
  sessionId,
  groupId,
  assessmentId = 'default-session-homework',
}: UseManualHomeworkChecklistOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch session report (online or offline cache)
  const { data: sessionReport, refetch: refetchReport } = useSessionReport(sessionId);

  // Load student checklist from offline DB and session report
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Get students for session
      let candidateStudents: Array<{ id: string; studentCode?: string; fullName?: string }> = [];

      if (sessionReport?.records && sessionReport.records.length > 0) {
        candidateStudents = sessionReport.records
          .filter((r: any) => r.fullName !== 'طالب غير متزامن' && !String(r.studentId).startsWith('qr_tok_'))
          .map((r: any) => ({
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
  }, [sessionId, groupId, assessmentId, sessionReport]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleHomework = useCallback(
    async (item: StudentChecklistItem) => {
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
    },
    [assessmentId, sessionId, refetchReport],
  );

  const handleBulkCheckAll = useCallback(async () => {
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
  }, [students, assessmentId, sessionId, loadData]);

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

  return {
    searchQuery,
    setSearchQuery,
    students,
    filteredStudents,
    isLoading,
    updatingId,
    handleToggleHomework,
    handleBulkCheckAll,
    checkedCount,
    totalCount,
    percentage,
  };
}
