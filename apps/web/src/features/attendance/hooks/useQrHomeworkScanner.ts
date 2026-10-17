'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineDb } from '@/lib/offline/db';
import { parseStudentQr } from '@/lib/qr/qr-parser';
import toast from 'react-hot-toast';
import { useSessionReport, useScanQrAttendance } from './use-attendance';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { syncEngine } from '@/lib/offline/sync-engine';
import { useQueryClient } from '@tanstack/react-query';
import { playScannerBeep } from '../utils/scannerSound';
import { resolveStudentFromQr } from '../utils/studentLookup';
import { resolveAutoHomeworkAssessment, syncSessionReportToOfflineDb } from '../utils/homeworkResolution';

interface UseQrHomeworkScannerProps {
  sessionId: string;
  groupId?: string;
  assessmentId?: string;
  assessmentTitle?: string;
  onSuccess?: (student: any) => void;
}

export function useQrHomeworkScanner({
  sessionId,
  groupId,
  assessmentId = 'default-session-homework',
  assessmentTitle = 'واجب الحصة الدراسية',
  onSuccess,
}: UseQrHomeworkScannerProps) {
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

    Promise.all([
      offlineDb.getAssessmentsOffline(),
      effectiveGroupId ? offlineDb.getSessionsOffline(effectiveGroupId) : Promise.resolve([]),
    ]).then(([allAssessments, groupSessions]) => {
      if (!isMounted) return;

      const result = resolveAutoHomeworkAssessment({
        sessionId,
        effectiveGroupId,
        sessionReport,
        assessmentTitle,
        allAssessments,
        groupSessions,
      });

      setAvailableAssessments(result.availableAssessments);
      setAutoHomeworkLabel(result.autoHomeworkLabel);

      if (activeAssessmentId === 'default-session-homework' || !activeAssessmentId) {
        setActiveAssessmentId(result.bestHomeworkId);
      }
    }).catch(() => {});

    syncSessionReportToOfflineDb({ sessionReport, groupId, sessionId }).then((absentStudentIds) => {
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
        .catch(() => {});
    });

    return () => {
      isMounted = false;
    };
  }, [sessionId, activeAssessmentId, sessionReport, groupId, assessmentTitle]);

  const playBeep = useCallback(
    (type: 'success' | 'duplicate' | 'error') => {
      playScannerBeep(type, soundEnabled);
    },
    [soundEnabled]
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
      const student = await resolveStudentFromQr(rawValue, parsed, {
        groupId,
        sessionReport,
      });

      if (!student) {
        playBeep('error');
        setFlashType('error');
        setLastScanResult({
          success: false,
          message:
            'بيانات الطالب غير مسجلة في قاعدة البيانات المحلية. يرجى التأكد من مسح رمز الطالب الصحيح أو تحديث البيانات عند توفر الإنترنت.',
        });
        toast.error('بيانات الطالب غير مسجلة محلياً');
        setTimeout(() => {
          setLocked(false);
          setFlashType(null);
        }, 2000);
        return;
      }

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
    } catch {
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

      await offlineDb.recordHomeworkOnsiteOffline({
        assessmentId: activeAssessmentId,
        studentId: scannedStudent.id,
        sessionId,
        status,
        recordedMethod: 'QR_SCAN',
        studentName,
        studentCode,
        qrCodeToken: scannedStudent.qrCodeToken,
      });

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
        }
      );

      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'report'] });

      playBeep('success');
      setFlashType('success');
      setCheckedCount((prev) => prev + 1);

      const statusText =
        status === 'CHECKED_ONSITE'
          ? 'حل الواجب'
          : status === 'NOT_SUBMITTED'
          ? 'لم يحل'
          : status === 'INCOMPLETE'
          ? 'ناقص'
          : 'بعذر';

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
    } catch {
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
          { sessionId, studentId }
        );
      }

      setLocalHomeworkRecords((prev) => prev.filter((r) => r.studentId !== studentId));
      setCheckedCount((c) => Math.max(0, c - 1));
      queryClient.invalidateQueries({ queryKey: ['session-report', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'report'] });
      toast.success(`تم إلغاء تقييم الواجب: ${studentName}`);
    } catch {
      toast.error('حدث خطأ أثناء إلغاء الواجب');
    }
  };

  const handleManualRecord = async (
    student: any,
    status: 'CHECKED_ONSITE' | 'NOT_SUBMITTED' | 'INCOMPLETE' | 'EXCUSED'
  ) => {
    try {
      const studentId = student.studentId || student.id;
      const studentName = student.fullName || student.studentName || 'طالب';
      const studentCode = student.studentCode || '';

      const currentRecord = localHomeworkRecords.find((r) => r.studentId === studentId);

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
    } catch {
      toast.error('حدث خطأ أثناء رصد الواجب يدوياً');
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setCameraKey((prev) => prev + 1);
  };

  return {
    activeAssessmentId,
    setActiveAssessmentId,
    availableAssessments,
    autoHomeworkLabel,
    locked,
    setLocked,
    facingMode,
    cameraKey,
    soundEnabled,
    setSoundEnabled,
    flashType,
    scannedStudent,
    setScannedStudent,
    recentChecked,
    lastScanResult,
    checkedCount,
    localHomeworkRecords,
    sessionReport,
    handleScan,
    handleRecordHomework,
    handleRemoveHomework,
    handleManualRecord,
    toggleFacingMode,
  };
}
