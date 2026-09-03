'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
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
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSessionReport, useScanQrAttendance } from '../hooks/use-attendance';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { initQrDetector } from '@/lib/qr/qr-detector-init';

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
          }).catch(() => { });
        }
      }
    }

    if (sessionReport?.homeworkRecords && Array.isArray(sessionReport.homeworkRecords)) {
      for (const hr of sessionReport.homeworkRecords) {
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

    offlineDb
      .getHomeworkRecordsForSession(sessionId, assessmentId)
      .then((records) => {
        if (isMounted) {
          setLocalHomeworkRecords(records);
          const localCount = records.length;
          const serverCount = sessionReport?.homeworkRecords?.length ?? 0;
          setCheckedCount(Math.max(localCount, serverCount));
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, [sessionId, assessmentId, sessionReport, groupId]);

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

      const matchQr = await offlineDb.findStudentByQrToken(rawValue);
      let student = matchQr?.student;
      if (!student) {
        student = await offlineDb.getStudentByIdOffline(cleanToken);
      }

      if (!student && sessionReport?.records) {
        const match = sessionReport.records.find(
          (r: any) =>
            r.studentId === cleanToken ||
            r.qrCodeToken === cleanToken ||
            r.studentCode === cleanToken ||
            (parsed.studentId && r.studentId === parsed.studentId) ||
            (parsed.studentCode && r.studentCode === parsed.studentCode),
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
        student = {
          id: cleanToken,
          fullName: 'طالب غير متزامن',
          studentCode: '',
          qrCodeToken: cleanToken,
          groupId: '',
          gradeLevel: '',
        };
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

      // recordHomeworkOnsiteOffline atomically saves:
      //   1. The homework record in IndexedDB
      //   2. The attendance record in IndexedDB (PRESENT)
      //   3. Queues both mutations in the outbox
      // This works identically online and offline.
      await offlineDb.recordHomeworkOnsiteOffline({
        assessmentId,
        studentId: scannedStudent.id,
        sessionId,
        status,
        recordedMethod: 'QR_SCAN',
        studentName,
        studentCode,
        qrCodeToken: scannedStudent.qrCodeToken,
      });

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

  const handleManualRecord = async (student: any, status: 'CHECKED_ONSITE' | 'NOT_SUBMITTED' | 'INCOMPLETE' | 'EXCUSED') => {
    try {
      const studentName = student.fullName || student.studentName || 'طالب';
      const studentCode = student.studentCode || '';

      await offlineDb.recordHomeworkOnsiteOffline({
        assessmentId,
        studentId: student.studentId || student.id,
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
        const existingIdx = newRecords.findIndex((r) => r.studentId === (student.studentId || student.id));
        if (existingIdx !== -1) {
          newRecords[existingIdx].status = status;
        } else {
          newRecords.push({ studentId: student.studentId || student.id, status });
          setCheckedCount((c) => c + 1);
        }
        return newRecords;
      });

    } catch (err: any) {
      toast.error('حدث خطأ أثناء رصد الواجب يدوياً');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              و الحضورQR للواجب فقط
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>سيتم سؤالك عن حالة الواجب بعد المسح.</span>
            </p>
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
                    className="h-12 text-base font-bold text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 rounded-2xl"
                    onClick={() => handleRecordHomework('INCOMPLETE')}
                  >
                    ناقص
                  </Button>

                  <Button
                    variant="outline"
                    className="col-span-2 h-12 text-sm font-bold text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-2xl"
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
                {sessionReport?.records?.length || 0} طالب
              </span>
            </div>

            {(!sessionReport?.records || sessionReport.records.length === 0) ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                لا توجد بيانات طلاب لهذه الحصة بعد.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {sessionReport.records.map((student: any) => {
                  const record = localHomeworkRecords.find((r) => r.studentId === student.studentId);
                  const status = record?.status;

                  return (
                    <div
                      key={student.studentId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${status === 'CHECKED_ONSITE' ? 'bg-emerald-100 text-emerald-700' :
                            status === 'NOT_SUBMITTED' ? 'bg-rose-100 text-rose-700' :
                              status === 'INCOMPLETE' ? 'bg-amber-100 text-amber-700' :
                                status === 'EXCUSED' ? 'bg-slate-200 text-slate-700' :
                                  'bg-white text-slate-300 border border-slate-200'
                          }`}>
                          {status === 'CHECKED_ONSITE' ? '✓' : status === 'NOT_SUBMITTED' ? '✗' : status === 'INCOMPLETE' ? '!' : status === 'EXCUSED' ? '-' : '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{student.fullName || student.studentName}</p>
                          {student.studentCode && (
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{student.studentCode}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 rtl:sm:mr-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManualRecord(student, 'CHECKED_ONSITE')}
                          className={`h-8 w-8 p-0 rounded-lg ${status === 'CHECKED_ONSITE' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'text-emerald-600 hover:bg-emerald-50'}`}
                          title="حل الواجب"
                        >
                          ✓
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManualRecord(student, 'NOT_SUBMITTED')}
                          className={`h-8 w-8 p-0 rounded-lg ${status === 'NOT_SUBMITTED' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'text-rose-600 hover:bg-rose-50'}`}
                          title="لم يحل"
                        >
                          ✗
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManualRecord(student, 'INCOMPLETE')}
                          className={`h-8 w-8 p-0 rounded-lg ${status === 'INCOMPLETE' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'text-amber-600 hover:bg-amber-50'}`}
                          title="ناقص"
                        >
                          !
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManualRecord(student, 'EXCUSED')}
                          className={`h-8 w-8 p-0 rounded-lg ${status === 'EXCUSED' ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'text-slate-500 hover:bg-slate-100'}`}
                          title="بعذر"
                        >
                          -
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
