'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineDb } from '@/lib/offline/db';
import { parseStudentQr } from '@/lib/qr/qr-parser';
import { useSessionReport } from './use-attendance';
import { apiClient } from '@/lib/api/client';
import { playAttendanceBeep } from '../utils/scanner-audio';
import toast from 'react-hot-toast';

export interface RecentCheckedStudent {
  studentId: string;
  studentName: string;
  studentCode: string;
  time: string;
}

export interface LastScanResult {
  success: boolean;
  studentName?: string;
  studentCode?: string;
  message: string;
  attendanceRecorded?: boolean;
}

interface UseOnsiteHomeworkScannerProps {
  sessionId: string;
  groupId?: string;
  assessmentId: string;
  onSuccess?: (student: any) => void;
}

export function useOnsiteHomeworkScanner({
  sessionId,
  groupId,
  assessmentId,
  onSuccess,
}: UseOnsiteHomeworkScannerProps) {
  const [locked, setLocked] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraKey, setCameraKey] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flashType, setFlashType] = useState<'success' | 'duplicate' | 'error' | null>(null);
  const [recentChecked, setRecentChecked] = useState<RecentCheckedStudent[]>([]);
  const [lastScanResult, setLastScanResult] = useState<LastScanResult | null>(null);
  const [checkedCount, setCheckedCount] = useState<number>(0);
  const { data: sessionReport } = useSessionReport(sessionId);

  // Load initial checked homework count & hydrate students from report
  useEffect(() => {
    let isMounted = true;

    if (sessionReport?.records && Array.isArray(sessionReport.records)) {
      for (const r of sessionReport.records) {
        if (r.studentId) {
          offlineDb.putStudent({
            id: r.studentId,
            fullName: r.fullName || r.studentName || 'طالب',
            studentCode: r.studentCode || '',
            qrCodeToken: r.qrCodeToken || '',
            groupId: sessionReport.groupId || groupId || '',
            gradeLevel: r.gradeLevel || '',
          }).catch(() => {});
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
          .catch(() => {});
      }
    }

    for (const absentId of absentStudentIds) {
      offlineDb.deleteHomeworkForSessionStudent(sessionId, absentId).catch(() => {});
    }

    offlineDb
      .getHomeworkRecordsForSession(sessionId, assessmentId)
      .then((records) => {
        if (isMounted) {
          const validRecords = records.filter((r) => !absentStudentIds.has(r.studentId));
          const localCount = validRecords.filter((r) => r.status === 'CHECKED_ONSITE').length;
          const serverCount =
            sessionReport?.metrics?.homeworkCheckedCount ??
            sessionReport?.records?.filter((r: any) => r.status !== 'ABSENT' && r.homeworkStatus === 'CHECKED_ONSITE').length ??
            0;
          setCheckedCount(Math.max(localCount, serverCount));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [sessionId, assessmentId, sessionReport, groupId]);

  const playBeep = useCallback(
    (type: 'success' | 'duplicate' | 'error') => {
      if (!soundEnabled) return;
      playAttendanceBeep(type);
    },
    [soundEnabled],
  );

  const handleScan = async (detectedCodes: any[]) => {
    if (locked) return;
    const rawValue = detectedCodes?.[0]?.rawValue;
    if (!rawValue || typeof rawValue !== 'string') return;

    setLocked(true);

    try {
      const parsed = parseStudentQr(rawValue);
      if (!parsed.isValid) {
        playBeep('error');
        setFlashType('error');
        setLastScanResult({
          success: false,
          message: parsed.errorMessage || 'رمز الـ QR غير صالح أو لا يتبع المنصة.',
        });
        toast.error(parsed.errorMessage || 'رمز الـ QR غير صالح');
        setTimeout(() => {
          setLocked(false);
          setFlashType(null);
        }, 1800);
        return;
      }

      const cleanToken = parsed.token || parsed.studentId || parsed.studentCode || rawValue.trim();
      const effectiveGroupId = groupId || sessionReport?.groupId;

      // 1. Find student in local IndexedDB
      let matchQr = await offlineDb.findStudentByQrToken(rawValue, effectiveGroupId);
      if (!matchQr && cleanToken !== rawValue) {
        matchQr = await offlineDb.findStudentByQrToken(cleanToken, effectiveGroupId);
      }
      let student = matchQr?.student;
      if (!student) {
        student = await offlineDb.getStudentByIdOffline(cleanToken);
      }

      // 2. Search through all offline students
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

      // 3. Check session report records
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
          offlineDb.putStudent(student).catch(() => {});
        }
      }

      // 4. Check group roster if still not resolved
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
            offlineDb.putStudent(student).catch(() => {});
          }
        }
      }

      // 5. Online dynamic lookup fallback
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
            offlineDb.putStudent(student).catch(() => {});
          }
        } catch {
          // Fall through to not found error
        }
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
        }, 1800);
        return;
      }

      // Check if homework is already checked locally or on server
      const existingHw = await offlineDb.getHomeworkRecordsForSession(sessionId, assessmentId);
      const isAlreadyCheckedLocal = existingHw.some(
        (h) => h.studentId === student.id && h.status === 'CHECKED_ONSITE',
      );
      const isAlreadyCheckedServer = sessionReport?.records?.some(
        (r: any) => r.studentId === student.id && r.homeworkStatus === 'CHECKED_ONSITE',
      );
      const isAlreadyChecked = isAlreadyCheckedLocal || !!isAlreadyCheckedServer;

      // Record homework onsite + automated attendance roll-call
      const studentName = student.fullName || student.name || 'طالب';
      const studentCode = student.studentCode || '';

      await offlineDb.recordHomeworkOnsiteOffline({
        assessmentId,
        studentId: student.id,
        sessionId,
        status: 'CHECKED_ONSITE',
        recordedMethod: 'QR_SCAN',
        studentName,
        studentCode,
        qrCodeToken: student.qrCodeToken,
      });

      if (isAlreadyChecked) {
        playBeep('duplicate');
        setFlashType('duplicate');
        setLastScanResult({
          success: true,
          studentName,
          studentCode,
          message: `تم فحص وتأكيد واجب الطالب مسبقاً في هذه الحصة: ${studentName}`,
          attendanceRecorded: true,
        });
        toast('تم تأكيد تسليم الواجب والحضور مسبقاً', { icon: '⚠️' });
      } else {
        playBeep('success');
        setFlashType('success');
        setCheckedCount((prev) => prev + 1);
        setRecentChecked((prev) => [
          {
            studentId: student.id,
            studentName,
            studentCode,
            time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
          ...prev.slice(0, 7),
        ]);
        setLastScanResult({
          success: true,
          studentName,
          studentCode,
          message: `تم تسجيل تسليم الواجب + رصد الحضور بنجاح للطالب: ${studentName}`,
          attendanceRecorded: true,
        });
        toast.success(`تم استلام الواجب + حضور: ${studentName}`);
      }

      if (onSuccess) {
        onSuccess(student);
      }

      setTimeout(() => {
        setLocked(false);
        setFlashType(null);
      }, 1800);
    } catch (err: any) {
      playBeep('error');
      setFlashType('error');
      setLastScanResult({
        success: false,
        message: err.message || 'حدث خطأ أثناء معالجة مسح الكود',
      });
      toast.error('حدث خطأ أثناء رصد الواجب');
      setTimeout(() => {
        setLocked(false);
        setFlashType(null);
      }, 1500);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setCameraKey((prev) => prev + 1);
  };

  return {
    locked,
    facingMode,
    cameraKey,
    soundEnabled,
    setSoundEnabled,
    flashType,
    recentChecked,
    lastScanResult,
    checkedCount,
    handleScan,
    toggleFacingMode,
  };
}
