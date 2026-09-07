'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
);
import { offlineDb } from '@/lib/offline/db';
import { parseStudentQr } from '@/lib/qr/qr-parser';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardCheck,
  UserCheck,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSessionReport, useScanQrAttendance } from '../hooks/use-attendance';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { syncEngine } from '@/lib/offline/sync-engine';
import { initQrDetector } from '@/lib/qr/qr-detector-init';
import { useQueryClient } from '@tanstack/react-query';
import { toLocalDateStr } from '@/features/schedules/utils/time.utils';

interface QrHomeworkScannerProps {
  sessionId: string;
  groupId?: string;
  assessmentId?: string;
  assessmentTitle?: string;
  onSuccess?: (student: any) => void;
}

export function QrHomeworkScanner({
  sessionId,
  groupId,
  assessmentId = 'default-session-homework',
  assessmentTitle = 'واجب الحصة الدراسية',
  onSuccess,
}: QrHomeworkScannerProps) {
  const [activeAssessmentId, setActiveAssessmentId] = useState<string>(assessmentId);
  const [availableAssessments, setAvailableAssessments] = useState<Array<{ id: string; title: string }>>([]);
  const [autoHomeworkLabel, setAutoHomeworkLabel] = useState<string>(assessmentTitle);
  const [locked, setLocked] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraKey, setCameraKey] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flashType, setFlashType] = useState<'success' | 'duplicate' | 'error' | null>(null);

  const [scannedStudent, setScannedStudent] = useState<any>(null);

  const [recentChecked, setRecentChecked] = useState<
    Array<{
      studentId: string;
      studentName: string;
      studentCode: string;
      status: string;
      time: string;
    }>
  >([]);

  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    studentName?: string;
    studentCode?: string;
    message: string;
  } | null>(null);

  const [checkedCount, setCheckedCount] = useState<number>(0);
  const [localHomeworkRecords, setLocalHomeworkRecords] = useState<any[]>([]);
  const { data: sessionReport } = useSessionReport(sessionId);
  const { mutate: scanQrAttendance } = useScanQrAttendance();
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    const effectiveGroupId = groupId || sessionReport?.groupId;

    // Load available homework assessments and sessions for this group
    Promise.all([
      offlineDb.getAssessmentsOffline(),
      effectiveGroupId ? offlineDb.getSessionsOffline(effectiveGroupId) : Promise.resolve([]),
    ]).then(([allAssessments, groupSessions]) => {
      if (!isMounted) return;

      const matchingHw = allAssessments.filter(
        (a: any) =>
          (a.type === 'ASSIGNMENT' || a.assessmentType === 'ASSIGNMENT') &&
          (!effectiveGroupId || !a.groupId || a.groupId === effectiveGroupId)
      );
      setAvailableAssessments(matchingHw.map((a: any) => ({ id: a.id, title: a.title })));

      // 1. Identify Current and Previous Session
      const currentSession = groupSessions.find((s) => s.id === sessionId) || {
        id: sessionId,
        sessionDate: sessionReport?.sessionDate || new Date().toISOString(),
        startTime: '',
        topic: sessionReport?.topic,
      };

      const curDateStr = toLocalDateStr(currentSession.sessionDate);
      const curTimeStr = currentSession.startTime || '23:59';
      const curDateTime = `${curDateStr}T${curTimeStr}`;

      const previousSessions = groupSessions.filter((s) => {
        if (s.id === sessionId || s.isCancelled) return false;
        const sDateStr = toLocalDateStr(s.sessionDate);
        const sTimeStr = s.startTime || '00:00';
        return `${sDateStr}T${sTimeStr}` < curDateTime;
      });

      previousSessions.sort((a, b) => {
        const da = `${toLocalDateStr(a.sessionDate)}T${a.startTime || '00:00'}`;
        const db = `${toLocalDateStr(b.sessionDate)}T${b.startTime || '00:00'}`;
        return db.localeCompare(da);
      });

      const previousSession = previousSessions[0] || null;
      const dynamicLabel = previousSession
        ? `واجب الحصة السابقة (${previousSession.topic || toLocalDateStr(previousSession.sessionDate)})`
        : assessmentTitle;
      setAutoHomeworkLabel(dynamicLabel);

      // 2. Automatically select the homework of the previous session
      if (activeAssessmentId === 'default-session-homework' || !activeAssessmentId) {
        let bestHomework: any = null;

        // Priority 1: Check existing recorded homework in this session
        const existingRecordedId = sessionReport?.homeworkRecords?.find(
          (hr: any) => hr.assessmentId && hr.assessmentId !== 'default-session-homework'
        )?.assessmentId;
        if (existingRecordedId) {
          bestHomework = matchingHw.find((a: any) => a.id === existingRecordedId);
        }

        // Priority 2: Homework whose dueDate is today's session (assigned in previous session for submission today)
        if (!bestHomework && curDateStr) {
          bestHomework = matchingHw.find((a: any) => a.dueDate && toLocalDateStr(a.dueDate) === curDateStr);
        }

        // Priority 3: Homework explicitly titled after or matching previous session's topic or date
        if (!bestHomework && previousSession) {
          const prevDateStr = toLocalDateStr(previousSession.sessionDate);
          bestHomework = matchingHw.find((a: any) => {
            const title = a.title?.toLowerCase() || '';
            if (previousSession.topic && title.includes(previousSession.topic.toLowerCase())) return true;
            if (title.includes(prevDateStr)) return true;
            return false;
          });
        }

        // Priority 4: Homework created between previous session and current session
        if (!bestHomework && previousSession) {
          const prevTime = new Date(previousSession.sessionDate).getTime();
          const currTime = new Date(currentSession.sessionDate).getTime();
          bestHomework = matchingHw.find((a: any) => {
            if (!a.createdAt) return false;
            const created = new Date(a.createdAt).getTime();
            return created >= prevTime - 24 * 3600 * 1000 && created <= currTime;
          });
        }

        if (bestHomework) {
          setActiveAssessmentId(bestHomework.id);
        } else {
          setActiveAssessmentId('default-session-homework');
        }
      }
    }).catch(() => {});

    if (sessionReport?.records && Array.isArray(sessionReport.records)) {
      for (const r of sessionReport.records) {
        if (r.studentId && r.fullName !== 'طالب غير متزامن' && !String(r.studentId).startsWith('qr_tok_')) {
          offlineDb.getStudentByIdOffline(r.studentId).then((existing) => {
            offlineDb.putStudent({
              id: r.studentId,
              fullName: r.fullName || r.studentName || existing?.fullName || 'طالب',
              studentCode: r.studentCode || existing?.studentCode || '',
              qrCodeToken: r.qrCodeToken || existing?.qrCodeToken || '',
              groupId: sessionReport.groupId || groupId || existing?.groupId || '',
              gradeLevel: r.gradeLevel || existing?.gradeLevel || '',
            }).catch(() => { });
          });
        }
      }
    }

    const absentStudentIds = new Set<string>(
      sessionReport?.records?.filter((r: any) => r.status === 'ABSENT').map((r: any) => String(r.studentId)) || []
    );

    if (sessionReport?.homeworkRecords && Array.isArray(sessionReport.homeworkRecords)) {
      for (const hr of sessionReport.homeworkRecords) {
        if (absentStudentIds.has(hr.studentId)) continue;
        offlineDb.homework_records
          .put({
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
          })
          .catch(() => { });
      }
    }

    // Clean up any absent students from offlineDb homework records for this session
    for (const absentId of absentStudentIds) {
      offlineDb.deleteHomeworkForSessionStudent(sessionId, absentId).catch(() => {});
    }

    offlineDb
      .getHomeworkRecordsForSession(sessionId, activeAssessmentId)
      .then((records) => {
        if (isMounted) {
          const validRecords = records.filter((r) => !absentStudentIds.has(r.studentId));
          setLocalHomeworkRecords(validRecords);
          const localCount = validRecords.length;
          const serverCount = sessionReport?.homeworkRecords?.filter((hr: any) => !absentStudentIds.has(hr.studentId))?.length ?? 0;
          setCheckedCount(Math.max(localCount, serverCount));
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, [sessionId, activeAssessmentId, sessionReport, groupId]);

  const playBeep = useCallback(
    (type: 'success' | 'duplicate' | 'error') => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (type === 'success') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.25);
        } else if (type === 'duplicate') {
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
          gain1.gain.setValueAtTime(0.35, ctx.currentTime);
          gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
          osc1.start(ctx.currentTime);
          osc1.stop(ctx.currentTime + 0.12);
        } else {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.28);
        }
      } catch { }
    },
    [soundEnabled],
  );

  const handleScan = async (detectedCodes: any[]) => {
    if (locked || scannedStudent) return;
    const rawValue = detectedCodes?.[0]?.rawValue;
    if (!rawValue || typeof rawValue !== 'string') return;

    setLocked(true);

    try {
      const parsed = parseStudentQr(rawValue);
      if (!parsed.isValid) {
        playBeep('error');
        setFlashType('error');
        toast.error(parsed.errorMessage || 'رمز الـ QR غير صالح');
        setTimeout(() => {
          setLocked(false);
          setFlashType(null);
        }, 1800);
        return;
      }

      const cleanToken = parsed.token || parsed.studentId || parsed.studentCode || rawValue.trim();
      const effectiveGroupId = groupId || sessionReport?.groupId;

      // 1. Check local IndexedDB with preferred group id
      let matchQr = await offlineDb.findStudentByQrToken(rawValue, effectiveGroupId);
      if (!matchQr && cleanToken !== rawValue) {
        matchQr = await offlineDb.findStudentByQrToken(cleanToken, effectiveGroupId);
      }
      let student = matchQr?.student;

      // 2. If not found, try getStudentByIdOffline
      if (!student) {
        student = await offlineDb.getStudentByIdOffline(cleanToken);
      }

      // 3. If not found, search through all offline students
      if (!student) {
        const allStudents = await offlineDb.getStudentsOffline();
        student = allStudents.find(
          (s: any) =>
            s.qrCodeToken === cleanToken ||
            s.qrCodeToken === rawValue ||
            s.studentCode === cleanToken ||
            (parsed.studentCode && s.studentCode === parsed.studentCode) ||
            s.id === cleanToken ||
            (parsed.studentId && s.id === parsed.studentId),
        );
      }

      // 4. Check sessionReport.records
      if (!student && sessionReport?.records) {
        const match = sessionReport.records.find(
          (r: any) =>
            r.studentId === cleanToken ||
            (r.qrCodeToken && (r.qrCodeToken === cleanToken || r.qrCodeToken === rawValue)) ||
            (r.studentCode && (r.studentCode === cleanToken || r.studentCode === parsed.studentCode)) ||
            (parsed.studentId && r.studentId === parsed.studentId),
        );
        if (match) {
          student = {
            id: match.studentId,
            fullName: match.fullName || match.studentName || 'طالب',
            studentCode: match.studentCode || '',
            qrCodeToken: match.qrCodeToken || cleanToken,
            groupId: sessionReport.groupId || groupId || '',
            gradeLevel: match.gradeLevel || '',
          };
          offlineDb.putStudent(student).catch(() => { });
        }
      }

      // 5. Check group roster
      if (!student && effectiveGroupId) {
        const roster = await offlineDb.getRoster(effectiveGroupId);
        if (roster?.students) {
          const match = roster.students.find(
            (s: any) =>
              s.id === cleanToken ||
              s.qrCodeToken === cleanToken ||
              s.qrCodeToken === rawValue ||
              s.studentCode === cleanToken ||
              (parsed.studentCode && s.studentCode === parsed.studentCode),
          );
          if (match) {
            student = match;
            offlineDb.putStudent(student).catch(() => { });
          }
        }
      }

      // 6. Online lookup fallback if online
      if (!student && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const searchRes = await apiClient<any>(`/students?search=${encodeURIComponent(cleanToken)}&limit=1`, {
            method: 'GET',
          });
          const searchList = searchRes?.data || searchRes?.students || searchRes?.data?.data || [];
          if (Array.isArray(searchList) && searchList.length > 0) {
            const onlineStudent = searchList[0];
            student = {
              id: onlineStudent.id,
              fullName: onlineStudent.fullName || onlineStudent.user?.fullName || 'طالب',
              studentCode: onlineStudent.studentCode || '',
              qrCodeToken: onlineStudent.qrCodeToken || cleanToken,
              groupId: onlineStudent.groupId || groupId || '',
              gradeLevel: onlineStudent.gradeLevel || '',
            };
            offlineDb.putStudent(student).catch(() => { });
          }
        } catch { }
      }

      if (!student) {
        playBeep('error');
        setFlashType('error');
        setLastScanResult({
          success: false,
          message: 'بيانات الطالب غير مسجلة في قاعدة البيانات المحلية. يرجى التأكد من مسح رمز الطالب الصحيح أو تحديث البيانات عند توفر الإنترنت.',
        });
        toast.error('بيانات الطالب غير مسجلة محلياً');
        setTimeout(() => {
          setLocked(false);
          setFlashType(null);
        }, 2000);
        return;
      }

      // ── Duplicate check: already has a homework record for this session?
      const existingHw = await offlineDb.getHomeworkRecordsForSession(sessionId, activeAssessmentId);
      const alreadyRecorded = existingHw.find(
        (h) => h.studentId === student.id || h.studentId === cleanToken
      );
      if (alreadyRecorded) {
        playBeep('duplicate');
        setFlashType('duplicate');
        toast(`تم تسجيل هذا الطالب مسبقاً`, { icon: '⚠️' });
        setTimeout(() => {
          setLocked(false);
          setFlashType(null);
        }, 2000);
        return;
      }

      playBeep('success');
      setScannedStudent(student);

    } catch (err: any) {
      playBeep('error');
      setFlashType('error');
      toast.error('حدث خطأ أثناء معالجة الكود');
      setTimeout(() => {
        setLocked(false);
        setFlashType(null);
      }, 1500);
    }
  };

  const handleRecordHomework = async (status: 'CHECKED_ONSITE' | 'NOT_SUBMITTED' | 'INCOMPLETE' | 'EXCUSED') => {
    if (!scannedStudent) return;

    try {
      const studentName = scannedStudent.fullName || scannedStudent.name || 'طالب';
      const studentCode = scannedStudent.studentCode || '';

      // 1. Save homework record + auto-record attendance in IndexedDB atomically
      const { attendanceRecord } = await offlineDb.recordHomeworkOnsiteOffline({
        assessmentId: activeAssessmentId,
        studentId: scannedStudent.id,
        sessionId,
        status,
        recordedMethod: 'QR_SCAN',
        studentName,
        studentCode,
        qrCodeToken: scannedStudent.qrCodeToken,
      });

      // 2. Explicitly enqueue attendance into the outbox so useSessionReport
      //    (which reads pendingMutations) shows PRESENT immediately offline.
      await syncEngine.enqueue(
        'attendance',
        API_ENDPOINTS.ATTENDANCE.SCAN_QR(sessionId),
        'POST',
        {
          sessionId,
          qrCodeToken: scannedStudent.qrCodeToken || scannedStudent.id,
          studentId: scannedStudent.id,
          status: 'PRESENT',
          recordingMethod: 'QR_SCAN',
          allowCrossGroup: true,
        },
      );

      // 3. Invalidate session report so the UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'report'] });

      playBeep('success');
      setFlashType('success');
      setCheckedCount((prev) => prev + 1);

      const statusText = status === 'CHECKED_ONSITE' ? 'حل الواجب' : status === 'NOT_SUBMITTED' ? 'لم يحل' : status === 'INCOMPLETE' ? 'ناقص' : 'بعذر';

      setRecentChecked((prev) => [
        {
          studentId: scannedStudent.id,
          studentName,
          studentCode,
          status: statusText,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        ...prev.slice(0, 7),
      ]);
      setLastScanResult({
        success: true,
        studentName,
        studentCode,
        message: `تم تسجيل حالة الواجب (${statusText}) والحضور للطالب: ${studentName}`,
      });
      toast.success(`تم استلام الواجب وتسجيل الحضور: ${studentName}`);

      // Update local homework records state for immediate UI refresh
      setLocalHomeworkRecords((prev) => {
        const newRecords = [...prev];
        const existingIdx = newRecords.findIndex((r) => r.studentId === scannedStudent.id);
        if (existingIdx !== -1) {
          newRecords[existingIdx].status = status;
        } else {
          newRecords.push({ studentId: scannedStudent.id, status });
        }
        return newRecords;
      });

      if (onSuccess) {
        onSuccess(scannedStudent);
      }
    } catch (err: any) {
      playBeep('error');
      toast.error('حدث خطأ أثناء رصد الواجب');
    } finally {
      setScannedStudent(null);
      setTimeout(() => {
        setLocked(false);
        setFlashType(null);
      }, 1000);
    }
  };

  const handleRemoveHomework = async (student: any) => {
    const studentId = student.studentId || student.id;
    const studentName = student.fullName || student.studentName || 'طالب';

    try {
      await offlineDb.deleteHomeworkForSessionStudent(sessionId, studentId);

      if (syncEngine.isOnline()) {
        try {
          await apiClient(`/attendance/sessions/${sessionId}/homework/${studentId}`, {
            method: 'DELETE',
          });
        } catch (e) {
          console.warn('Failed to delete homework online:', e);
        }
      } else {
        await syncEngine.enqueue(
          'attendance',
          `/attendance/sessions/${sessionId}/homework/${studentId}`,
          'DELETE',
          { sessionId, studentId },
        );
      }

      setLocalHomeworkRecords((prev) => prev.filter((r) => r.studentId !== studentId));
      setCheckedCount((c) => Math.max(0, c - 1));
      queryClient.invalidateQueries({ queryKey: ['session-report', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'report'] });
      toast.success(`تم إلغاء تقييم الواجب: ${studentName}`);
    } catch (err) {
      console.error('Failed to remove homework:', err);
      toast.error('حدث خطأ أثناء إلغاء الواجب');
    }
  };

  const handleToggleAbsence = async (student: any) => {
    const studentId = student.studentId || student.id;
    const studentName = student.fullName || student.studentName || 'طالب';
    const studentCode = student.studentCode || '';
    const isCurrentlyAbsent = student.status === 'ABSENT';

    try {
      if (isCurrentlyAbsent) {
        // Undo absence: revert attendance record AND remove homework
        await offlineDb.revertAttendanceRecordOffline(sessionId, studentId);
        await offlineDb.deleteHomeworkForSessionStudent(sessionId, studentId);
        setLocalHomeworkRecords((prev) => prev.filter((r) => r.studentId !== studentId));

        if (syncEngine.isOnline()) {
          try {
            await apiClient(`/attendance/sessions/${sessionId}/records/${studentId}`, {
              method: 'DELETE',
            });
            await apiClient(`/attendance/sessions/${sessionId}/homework/${studentId}`, {
              method: 'DELETE',
            });
          } catch (e) {
            console.warn('Failed to delete attendance/homework online:', e);
          }
        } else {
          await syncEngine.enqueue(
            'attendance',
            `/attendance/sessions/${sessionId}/records/${studentId}`,
            'DELETE',
            { sessionId, studentId },
          );
          await syncEngine.enqueue(
            'attendance',
            `/attendance/sessions/${sessionId}/homework/${studentId}`,
            'DELETE',
            { sessionId, studentId },
          );
        }
        toast.success(`تم إلغاء غياب الطالب: ${studentName}`);
      } else {
        // Mark ABSENT: record absence AND delete homework
        await offlineDb.recordAttendanceOffline(sessionId, {
          studentId,
          status: 'ABSENT',
          recordingMethod: 'MANUAL',
          studentName,
          studentCode,
        });
        await offlineDb.deleteHomeworkForSessionStudent(sessionId, studentId);
        setLocalHomeworkRecords((prev) => prev.filter((r) => r.studentId !== studentId));

        if (syncEngine.isOnline()) {
          try {
            await apiClient(`/attendance/sessions/${sessionId}/records`, {
              method: 'POST',
              body: JSON.stringify({
                records: [{ studentId, status: 'ABSENT', notes: 'تسجيل غياب يدوي' }],
              }),
            });
            await apiClient(`/attendance/sessions/${sessionId}/homework/${studentId}`, {
              method: 'DELETE',
            });
          } catch (e) {
            console.warn('Failed to record absence online:', e);
          }
        } else {
          await syncEngine.enqueue(
            'attendance',
            `/attendance/sessions/${sessionId}/records`,
            'POST',
            {
              sessionId,
              records: [{ studentId, status: 'ABSENT', notes: 'تسجيل غياب يدوي' }],
            },
          );
          await syncEngine.enqueue(
            'attendance',
            `/attendance/sessions/${sessionId}/homework/${studentId}`,
            'DELETE',
            { sessionId, studentId },
          );
        }
        toast.success(`تم تسجيل غياب الطالب وحذف الواجب: ${studentName}`);
      }

      queryClient.invalidateQueries({ queryKey: ['session-report', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'report'] });
    } catch (err) {
      console.error('Failed to toggle absence:', err);
      toast.error('حدث خطأ أثناء تعديل الغياب');
    }
  };

  const handleManualRecord = async (student: any, status: 'CHECKED_ONSITE' | 'NOT_SUBMITTED' | 'INCOMPLETE' | 'EXCUSED') => {
    try {
      const studentId = student.studentId || student.id;
      const studentName = student.fullName || student.studentName || 'طالب';
      const studentCode = student.studentCode || '';

      const currentRecord = localHomeworkRecords.find((r) => r.studentId === studentId);

      // If clicked status is already active, toggle off and remove homework!
      if (currentRecord?.status === status) {
        await handleRemoveHomework(student);
        return;
      }

      await offlineDb.recordHomeworkOnsiteOffline({
        assessmentId: activeAssessmentId,
        studentId,
        sessionId,
        status,
        recordedMethod: 'MANUAL',
        studentName,
        studentCode,
        qrCodeToken: student.qrCodeToken || '',
      });

      toast.success(`تم استلام الواجب: ${studentName}`);

      setLocalHomeworkRecords((prev) => {
        const newRecords = [...prev];
        const existingIdx = newRecords.findIndex((r) => r.studentId === studentId);
        if (existingIdx !== -1) {
          newRecords[existingIdx].status = status;
        } else {
          newRecords.push({ studentId, status });
          setCheckedCount((c) => c + 1);
        }
        return newRecords;
      });

      queryClient.invalidateQueries({ queryKey: ['session-report', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'report'] });

    } catch (err: any) {
      toast.error('حدث خطأ أثناء رصد الواجب يدوياً');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              QR للواجب و الحضور معاً
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-slate-600">الواجب المراد تقييمه:</span>
              <select
                value={activeAssessmentId}
                onChange={(e) => setActiveAssessmentId(e.target.value)}
                className="text-xs font-bold bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-slate-800 focus:ring-1 focus:ring-indigo-500 shadow-xs cursor-pointer"
              >
                <option value="default-session-homework">{autoHomeworkLabel} (تلقائي)</option>
                {availableAssessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="info" className="px-3 py-1.5 text-xs font-bold gap-1.5 shadow-xs">
            <UserCheck className="w-4 h-4" />
            <span>تم تقييم: {checkedCount} طالب</span>
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 px-2.5 text-xs"
            title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-6 flex flex-col items-center">
          <div
            className={`w-full max-w-sm aspect-[3/4] sm:aspect-square bg-slate-950 rounded-3xl overflow-hidden border border-slate-200 shadow-md relative transition-all duration-300 ring-4 ${flashType === 'success'
              ? 'ring-indigo-500 shadow-xl shadow-indigo-500/20'
              : flashType === 'error'
                ? 'ring-rose-500 shadow-xl shadow-rose-500/20'
                : 'ring-indigo-100'
              }`}
          >
            <Scanner
              key={cameraKey}
              onScan={handleScan}
              onError={(err: any) => {
                const msg = err?.message || '';
                if (msg.includes('Barcode detection service unavailable') || msg.includes('detect')) {
                  initQrDetector();
                } else if (msg.includes('timed out') || msg.includes('timeout')) {
                  console.warn('Camera stream startup delay - waiting for camera warmup');
                }
              }}
              paused={locked || !!scannedStudent}
              scanDelay={350}
              startTimeoutMs={30000}
              formats={['qr_code']}
              constraints={{
                facingMode: { ideal: facingMode },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }}
              styles={{
                container: { width: '100%', height: '100%', position: 'relative' },
                video: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                },
              }}
            />

            <button
              type="button"
              onClick={() => {
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                setCameraKey((prev) => prev + 1);
              }}
              className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md p-2.5 rounded-full transition-colors focus:outline-none shadow-sm cursor-pointer"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>

            {scannedStudent && (
              <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-10 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
                <div className="text-center mb-5 shrink-0 mt-auto pt-4">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{scannedStudent.fullName || 'طالب'}</h3>
                  <p className="text-sm font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full inline-block">
                    {scannedStudent.studentCode || scannedStudent.id}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full max-w-[260px] shrink-0 mb-auto pb-4">
                  <Button
                    className="col-span-2 h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-md shadow-emerald-500/20"
                    onClick={() => handleRecordHomework('CHECKED_ONSITE')}
                  >
                    <CheckCircle2 className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2" />
                    حل الواجب
                  </Button>

                  <Button
                    variant="outline"
                    className="h-12 text-base font-bold text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-2xl"
                    onClick={() => handleRecordHomework('NOT_SUBMITTED')}
                  >
                    محلوش
                  </Button>

                  <Button
                    variant="outline"
                    className="h-12 text-base font-bold text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-2xl"
                    onClick={() => handleRecordHomework('EXCUSED')}
                  >
                    بعذر
                  </Button>

                  <Button
                    variant="ghost"
                    className="col-span-2 h-10 mt-1 text-slate-400 hover:text-slate-600 rounded-xl text-sm"
                    onClick={() => {
                      setScannedStudent(null);
                      setLocked(false);
                    }}
                  >
                    إلغاء ومسح طالب آخر
                  </Button>
                </div>
              </div>
            )}

            {locked && !scannedStudent && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 backdrop-blur-xs">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-2" />
                <span className="text-xs font-bold text-white">جاري البحث عن الطالب...</span>
              </div>
            )}

            {flashType === 'success' && !scannedStudent && (
              <div className="absolute bottom-3 inset-x-3 bg-emerald-600/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                <span className="truncate">🟢 تم تسجيل حالة الواجب</span>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-6 space-y-4">
          {lastScanResult && (
            <Alert
              variant={lastScanResult.success ? 'success' : 'error'}
              className="p-4 rounded-2xl border transition-all"
            >
              <div className="flex items-start gap-3">
                {lastScanResult.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold text-sm text-slate-800">
                    {lastScanResult.success ? 'تم رصد الواجب بنجاح' : 'تعذر الرصد'}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {lastScanResult.message}
                  </p>
                </div>
              </div>
            </Alert>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-primary-500" />
                <span>قائمة الطلاب (تسجيل يدوي)</span>
              </h4>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {sessionReport?.records?.filter((s: any) => s.fullName !== 'طالب غير متزامن' && !String(s.studentId).startsWith('qr_tok_')).length || 0} طالب
              </span>
            </div>

            {(!sessionReport?.records || sessionReport.records.filter((s: any) => s.fullName !== 'طالب غير متزامن' && !String(s.studentId).startsWith('qr_tok_')).length === 0) ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                لا توجد بيانات طلاب لهذه الحصة بعد.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {sessionReport.records
                  .filter((s: any) => s.fullName !== 'طالب غير متزامن' && !String(s.studentId).startsWith('qr_tok_'))
                  .map((student: any) => {
                  const isAbsent = student.status === 'ABSENT';
                  const record = isAbsent ? null : localHomeworkRecords.find((r) => r.studentId === student.studentId);
                  const status = record?.status;

                  return (
                    <div
                      key={student.studentId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          status === 'CHECKED_ONSITE' ? 'bg-emerald-100 text-emerald-700' :
                          status === 'NOT_SUBMITTED' ? 'bg-rose-100 text-rose-700' :
                          status === 'INCOMPLETE' ? 'bg-amber-100 text-amber-700' :
                          status === 'EXCUSED' ? 'bg-slate-200 text-slate-700' :
                          isAbsent ? 'bg-rose-50 text-rose-500 border border-rose-200' :
                          'bg-white text-slate-300 border border-slate-200'
                        }`}>
                          {status === 'CHECKED_ONSITE' ? '✓' : status === 'NOT_SUBMITTED' ? '✗' : status === 'INCOMPLETE' ? '!' : status === 'EXCUSED' ? '-' : isAbsent ? 'غ' : '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{student.fullName || student.studentName}</p>
                          {student.studentCode && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{student.studentCode}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 rtl:sm:mr-auto">
                        {status && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveHomework(student)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="إلغاء تقييم الواجب (تراجع)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManualRecord(student, 'CHECKED_ONSITE')}
                          className={`h-8 w-8 p-0 rounded-lg font-bold transition-all ${
                            status === 'CHECKED_ONSITE'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 ring-2 ring-emerald-500/30'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={status === 'CHECKED_ONSITE' ? 'إلغاء التحديد (تراجع)' : 'حل الواجب'}
                        >
                          ✓
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManualRecord(student, 'NOT_SUBMITTED')}
                          className={`h-8 w-8 p-0 rounded-lg font-bold transition-all ${
                            status === 'NOT_SUBMITTED'
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 ring-2 ring-rose-500/30'
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                          title={status === 'NOT_SUBMITTED' ? 'إلغاء التحديد (تراجع)' : 'لم يحل'}
                        >
                          ✗
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
