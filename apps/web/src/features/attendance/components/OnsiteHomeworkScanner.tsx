'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { offlineDb, HomeworkRecordEntity } from '@/lib/offline/db';
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

interface OnsiteHomeworkScannerProps {
  sessionId: string;
  groupId?: string;
  assessmentId?: string;
  assessmentTitle?: string;
  onSuccess?: (student: any) => void;
}

export function OnsiteHomeworkScanner({
  sessionId,
  groupId,
  assessmentId = 'default-session-homework',
  assessmentTitle = 'واجب الحصة الدراسية',
  onSuccess,
}: OnsiteHomeworkScannerProps) {
  const [locked, setLocked] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flashType, setFlashType] = useState<'success' | 'duplicate' | 'error' | null>(null);
  const [recentChecked, setRecentChecked] = useState<
    Array<{
      studentId: string;
      studentName: string;
      studentCode: string;
      time: string;
    }>
  >([]);
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    studentName?: string;
    studentCode?: string;
    message: string;
    attendanceRecorded?: boolean;
  } | null>(null);
  const [checkedCount, setCheckedCount] = useState<number>(0);

  // Load initial checked homework count
  useEffect(() => {
    let isMounted = true;
    offlineDb
      .getHomeworkRecordsForSession(sessionId, assessmentId)
      .then((records) => {
        if (isMounted) {
          setCheckedCount(records.filter((r) => r.status === 'CHECKED_ONSITE').length);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [sessionId, assessmentId]);

  // Pure Web Audio API Synthesizer (Crystal Clear Chimes & Buzzers)
  const playBeep = useCallback(
    (type: 'success' | 'duplicate' | 'error') => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (type === 'success') {
          // Pleasant high chime: 880Hz -> 1320Hz
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
          // Dual warning pulse (587.33Hz)
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

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(587.33, ctx.currentTime + 0.14);
          gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.14);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.26);
          osc2.start(ctx.currentTime + 0.14);
          osc2.stop(ctx.currentTime + 0.26);
        } else {
          // Low error buzz: 220Hz sawtooth
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
      } catch {}
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

      // Find student in local database
      const matchQr = await offlineDb.findStudentByQrToken(rawValue);
      let student = matchQr?.student;
      if (!student) {
        student = await offlineDb.getStudentByIdOffline(cleanToken);
      }

      // Check group roster if still not resolved
      if (!student && groupId) {
        const roster = await offlineDb.getRoster(groupId);
        if (roster?.students) {
          const match = roster.students.find(
            (s: any) =>
              s.id === cleanToken ||
              s.qrCodeToken === cleanToken ||
              s.studentCode === cleanToken,
          );
          if (match) {
            student = match;
          }
        }
      }

      if (!student) {
        playBeep('error');
        setFlashType('error');
        setLastScanResult({
          success: false,
          message: 'تعذر العثور على بيانات الطالب محلياً. يرجى التحقق من الكود أو تحديث البيانات.',
        });
        toast.error('طالب غير مسجل في قاعدة البيانات المحلية');
        setTimeout(() => {
          setLocked(false);
          setFlashType(null);
        }, 2000);
        return;
      }

      // Check if homework is already checked
      const existingHw = await offlineDb.getHomeworkRecordsForSession(sessionId, assessmentId);
      const isAlreadyChecked = existingHw.some(
        (h) => h.studentId === student.id && h.status === 'CHECKED_ONSITE',
      );

      // Record homework onsite + automated attendance roll-call
      const studentName = student.fullName || student.name || 'طالب';
      const studentCode = student.studentCode || '';

      const { homeworkRecord, attendanceRecord } = await offlineDb.recordHomeworkOnsiteOffline({
        assessmentId,
        studentId: student.id,
        sessionId,
        status: 'CHECKED_ONSITE',
        recordedMethod: 'QR_SCAN',
        studentName,
        studentCode,
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

      // Resume camera scanning after 1.8 seconds debounce
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Assessment & Counter Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base">
              مسح واستلام الواجب في السنتر (Onsite QR Scan)
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>الواجب النشط:</span>
              <strong className="text-emerald-700 font-semibold">{assessmentTitle}</strong>
              <span>• الرصد يسجل الحضور تلقائياً</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="success" className="px-3 py-1.5 text-xs font-bold gap-1.5 shadow-xs">
            <UserCheck className="w-4 h-4" />
            <span>تم تسليم: {checkedCount} طالب</span>
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 px-2.5 text-xs"
            title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </Button>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-6 flex flex-col items-center">
          <div
            className={`w-full max-w-sm aspect-square bg-slate-950 rounded-3xl overflow-hidden border border-slate-200 shadow-md relative transition-all duration-300 ring-4 ${
              flashType === 'success'
                ? 'ring-emerald-500 shadow-xl shadow-emerald-500/20'
                : flashType === 'duplicate'
                ? 'ring-amber-500 shadow-xl shadow-amber-500/20'
                : flashType === 'error'
                ? 'ring-rose-500 shadow-xl shadow-rose-500/20'
                : 'ring-emerald-100'
            }`}
          >
            <Scanner
              onScan={handleScan}
              onError={() => {}}
              paused={locked}
              scanDelay={350}
              formats={['qr_code']}
              constraints={{ facingMode }}
              styles={{ video: { transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' } }}
            />

            {/* Camera Switch Button */}
            <button
              type="button"
              onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
              className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md p-2.5 rounded-full transition-colors focus:outline-none shadow-sm cursor-pointer"
              title="تبديل الكاميرا"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>

            {/* Processing Spinner Overlay */}
            {locked && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 backdrop-blur-xs">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent mb-2" />
                <span className="text-xs font-bold text-white">جاري رصد الواجب والحضور...</span>
              </div>
            )}

            {/* Color-Coded Live Banner Overlay */}
            {flashType === 'success' && (
              <div className="absolute bottom-3 inset-x-3 bg-emerald-600/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                <span className="truncate">🟢 تم تسجيل تسليم الواجب + الحضور</span>
              </div>
            )}

            {flashType === 'duplicate' && (
              <div className="absolute bottom-3 inset-x-3 bg-amber-500/95 text-slate-950 p-2.5 rounded-2xl flex items-center gap-2 text-xs font-black shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2">
                <AlertTriangle className="w-4 h-4 text-amber-950 shrink-0" />
                <span className="truncate">🟡 مسجل مسبقاً (مكرر)</span>
              </div>
            )}

            {flashType === 'error' && (
              <div className="absolute bottom-3 inset-x-3 bg-rose-600/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2">
                <XCircle className="w-4 h-4 text-rose-200 shrink-0" />
                <span className="truncate">🔴 رمز QR غير صالح</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-3 text-center">
            قم بتوجيه كاميرا الهاتف نحو كود الطالب لمسح الواجب ورصد حضوره تلقائياً.
          </p>
        </div>

        {/* Live Result Feedback & Recent Checkins */}
        <div className="md:col-span-6 space-y-4">
          {/* Last Result Card */}
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
                    {lastScanResult.success ? 'تم رصد الواجب والحضور بنجاح' : 'تعذر مسح الكود'}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {lastScanResult.message}
                  </p>
                  {lastScanResult.studentCode && (
                    <span className="inline-block text-[11px] font-mono bg-white/70 px-2 py-0.5 rounded-md text-slate-700 mt-1 border border-slate-200">
                      كود الطالب: {lastScanResult.studentCode}
                    </span>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {/* Recent Activity List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>الطلاب الذين تم تسليم واجبهم مؤخراً ({recentChecked.length})</span>
              </h4>
            </div>

            {recentChecked.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                لم يتم فحص أي واجب بعد في هذه الجلسة.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {recentChecked.map((item, idx) => (
                  <div
                    key={`${item.studentId}-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{item.studentName}</p>
                        {item.studentCode && (
                          <p className="text-[10px] text-slate-400 font-mono">{item.studentCode}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      <Badge variant="success" className="text-[10px] py-0.5 px-2 font-semibold">
                        حاضر + واصل
                      </Badge>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
