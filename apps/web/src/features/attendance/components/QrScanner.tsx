'use client';

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useScanQrAttendance } from '../hooks/use-attendance';
import { Alert } from '@/components/ui/Alert';
import { RefreshCcw, AlertTriangle, CheckCircle2, XCircle, Users } from 'lucide-react';
import { ExternalStudentModal } from './ExternalStudentModal';
import { parseStudentQr } from '@/lib/qr/qr-parser';
import { initQrDetector } from '@/lib/qr/qr-detector-init';
import toast from 'react-hot-toast';

interface AdvancedCameraConstraints extends MediaTrackConstraintSet {
  focusMode?: string;
  exposureMode?: string;
  whiteBalanceMode?: string;
}

interface QrScannerProps {
  sessionId: string;
}

export function QrScanner({ sessionId }: QrScannerProps) {
  const [lastScanResult, setLastScanResult] = useState<{
    success?: boolean;
    duplicate?: boolean;
    isExternal?: boolean;
    isUnknown?: boolean;
    isNotFound?: boolean;
    title?: string;
    message?: string;
    studentName?: string;
  } | null>(null);

  const [crossGroupPrompt, setCrossGroupPrompt] = useState<{
    token: string;
    student?: {
      id?: string;
      fullName?: string;
      studentCode?: string;
      gradeLevel?: string;
    };
    studentGroup?: {
      id?: string;
      name?: string;
      gradeLevel?: string;
    };
    sessionGroup?: {
      id?: string;
      name?: string;
      gradeLevel?: string;
    };
    message?: string;
  } | null>(null);

  const { mutate, isPending } = useScanQrAttendance();
  const [locked, setLocked] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraKey, setCameraKey] = useState(0);
  const [flashType, setFlashType] = useState<'success' | 'duplicate' | 'external' | 'unknown' | 'error' | null>(null);

  // Web Audio API Synthesizer (Crystal Clear Audio Feedback)
  const playBeep = (type: 'success' | 'duplicate' | 'external' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'success') {
        // High pleasant double chime (880Hz -> 1320Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'duplicate') {
        // Warning dual pulse tone (587.33Hz pulse)
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
      } else if (type === 'external') {
        // External student warning triple chime (700Hz -> 500Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // Error low buzz (220Hz saw)
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
    } catch (e) {
      console.warn('Audio Context sound play failed:', e);
    }
  };

  const lastScanRef = React.useRef<{ token: string; timestamp: number } | null>(null);

  React.useEffect(() => {
    return () => {
      lastScanRef.current = null;
    };
  }, []);

  const handleScan = (detectedCodes: any[]) => {
    if (locked || isPending || crossGroupPrompt || !detectedCodes || detectedCodes.length === 0) {
      return;
    }

    const token = detectedCodes[0]?.rawValue;
    if (!token) return;

    const now = Date.now();
    const lastScan = lastScanRef.current;

    if (lastScan && lastScan.token === token) {
      const timeDiff = now - lastScan.timestamp;
      if (timeDiff <= 1000) {
        lastScanRef.current = null;
      } else {
        lastScanRef.current = { token, timestamp: now };
        return;
      }
    } else {
      lastScanRef.current = { token, timestamp: now };
      return;
    }

    // Strict client-side format and schema verification
    const parsed = parseStudentQr(token);
    if (!parsed.isValid) {
      playBeep('error');
      setFlashType('unknown');
      setLastScanResult({
        success: false,
        isUnknown: true,
        title: 'رمز QR غير صالح',
        message: 'الرمز الممسوح ضوئياً لا يتبع منصة الأول وغير مسجل في النظام.',
      });
      toast.error('الرمز الممسوح ضوئياً لا يتبع منصة الأول وغير مسجل في النظام.');
      setLocked(true);
      setTimeout(() => {
        setLocked(false);
        setFlashType(null);
      }, 1500);
      return;
    }

    setLocked(true);
    mutate(
      { sessionId, qrCodeToken: token, allowCrossGroup: false },
      {
        onSuccess: (data) => {
          if (data.isCrossGroupPrompt) {
            playBeep('external');
            setFlashType('external');
            setCrossGroupPrompt({
              token,
              student: data.student,
              studentGroup: data.studentGroup,
              sessionGroup: data.sessionGroup,
              message: data.message,
            });
            setLastScanResult({
              success: false,
              isExternal: true,
              message: 'طالب من خارج المجموعة',
              studentName: data.student?.fullName,
            });
            return;
          }

          if (data.isDuplicate) {
            playBeep('duplicate');
            setFlashType('duplicate');
            setLastScanResult({
              success: false,
              duplicate: true,
              message: data.message || 'تم تسجيل حضور الطالب مسبقاً في هذه الحصة',
              studentName: data.student?.fullName,
            });
            toast('تم تسجيل حضور الطالب مسبقاً في هذه الحصة', {
              icon: '⚠️',
              style: {
                borderRadius: '12px',
                background: '#fffbeb',
                color: '#92400e',
                border: '1px solid #fde68a',
              },
            });
          } else {
            playBeep('success');
            setFlashType('success');
            setLastScanResult({
              success: true,
              message: data.message || 'تم تسجيل الحضور بنجاح.',
              studentName: data.student?.fullName,
            });
            toast.success(`تم حضور: ${data.student?.fullName}`);
          }

          // 2.5-second debounce lock on the QR scanner hardware camera stream
          setTimeout(() => {
            setLocked(false);
            setFlashType(null);
          }, 2500);
        },
        onError: (error: any) => {
          playBeep('error');
          setFlashType('unknown');
          const message =
            error?.message ||
            error?.response?.data?.message ||
            'رمز الـ QR غير صالح أو حدث خطأ أثناء المسح.';
          const errorMsg = Array.isArray(message) ? message[0] : message;
          const isNotFound = error?.code === 'STUDENT_NOT_FOUND' || errorMsg.includes('غير مسجلة في قاعدة البيانات المحلية');

          setLastScanResult({
            success: false,
            isUnknown: !isNotFound,
            isNotFound,
            title: isNotFound ? 'طالب غير موجود' : 'رمز QR غير صالح',
            message: isNotFound
              ? 'بيانات الطالب غير مسجلة في قاعدة البيانات المحلية. يرجى تحديث البيانات عند توفر الإنترنت.'
              : errorMsg,
          });
          toast.error(errorMsg);

          // Resume camera scanning after 1.5 seconds
          setTimeout(() => {
            setLocked(false);
            setFlashType(null);
          }, 1500);
        },
      },
    );
  };

  const handleConfirmCrossGroup = () => {
    if (!crossGroupPrompt) return;

    mutate(
      { sessionId, qrCodeToken: crossGroupPrompt.token, allowCrossGroup: true },
      {
        onSuccess: (data) => {
          playBeep('success');
          setFlashType('success');
          const studentName = data.student?.fullName || crossGroupPrompt.student?.fullName || 'الطالب';
          setLastScanResult({
            success: true,
            message: `تم تسجيل حضور استثنائي للطالب (${studentName}) بنجاح.`,
            studentName,
          });
          toast.success(`تم تسجيل حضور استثنائي: ${studentName}`);
          setCrossGroupPrompt(null);
          setTimeout(() => {
            setLocked(false);
            setFlashType(null);
          }, 2500);
        },
        onError: (error: any) => {
          playBeep('error');
          setFlashType('error');
          const msg = error?.response?.data?.message || error?.message || 'فشل تسجيل الحضور الاستثنائي';
          toast.error(Array.isArray(msg) ? msg[0] : msg);
          setCrossGroupPrompt(null);
          setTimeout(() => {
            setLocked(false);
            setFlashType(null);
          }, 2500);
        },
      },
    );
  };

  const handleCancelCrossGroup = () => {
    setCrossGroupPrompt(null);
    setLocked(false);
    setFlashType(null);
    setLastScanResult(null);
  };

  const handleError = (error: any) => {
    console.error('QR Scanner Error:', error);
    const msg = error?.message || '';
    if (msg.includes('Barcode detection service unavailable') || msg.includes('detect')) {
      // Re-initialize local WASM engine silently
      initQrDetector();
      return;
    }
    if (msg.includes('timed out') || msg.includes('timeout')) {
      console.warn('Camera stream play timeout - waiting for device camera warmup');
      return;
    }
    if (error?.name === 'NotAllowedError' || msg.includes('Permission')) {
      setCameraError('تم رفض صلاحية استخدام الكاميرا. يرجى تفعيلها من إعدادات المتصفح.');
    } else if (error?.name === 'NotSupportedError' || msg.includes('secure context')) {
      setCameraError('لا يمكن الوصول للكاميرا. تأكد من استخدام اتصال آمن (HTTPS) أو أنك تستخدم localhost.');
    } else {
      setCameraError(msg || 'حدث خطأ في تشغيل الكاميرا.');
    }
  };

  return (
    <div className="flex flex-col items-center py-4">
      <div
        className={`w-full max-w-sm aspect-square bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 shadow-sm relative transition-all duration-300 ring-4 ${
          flashType === 'success'
            ? 'ring-emerald-500 shadow-lg shadow-emerald-500/20'
            : flashType === 'duplicate'
            ? 'ring-amber-500 shadow-lg shadow-amber-500/20'
            : flashType === 'external'
            ? 'ring-rose-500 shadow-lg shadow-rose-500/20'
            : flashType === 'unknown'
            ? 'ring-slate-400 shadow-lg shadow-slate-400/20'
            : flashType === 'error'
            ? 'ring-rose-500 shadow-lg shadow-rose-500/20'
            : 'ring-primary-50'
        }`}
      >
        <Scanner
          key={cameraKey}
          onScan={handleScan}
          onError={handleError}
          paused={locked || isPending || !!crossGroupPrompt}
          scanDelay={250}
          startTimeoutMs={30000}
          formats={['qr_code']}
          components={{
            torch: true,
            zoom: false,
            finder: true,
          }}
          constraints={{
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            advanced: [
              { focusMode: 'continuous' },
              { exposureMode: 'continuous' },
              { whiteBalanceMode: 'continuous' },
            ] as AdvancedCameraConstraints[]
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
          className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md p-2.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm cursor-pointer"
          title="تبديل / إعادة تشغيل الكاميرا"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>

        {(locked || isPending) && !crossGroupPrompt && (
          <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent mb-2"></div>
            <span className="text-xs font-bold text-slate-700">جاري معالجة الـ QR...</span>
          </div>
        )}

        {/* Dynamic Color-Coded Overlay Status Banner */}
        {flashType === 'success' && (
          <div className="absolute bottom-3 inset-x-3 bg-emerald-600/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span className="truncate">🟢 تم تسجيل الحضور بنجاح</span>
          </div>
        )}

        {flashType === 'duplicate' && (
          <div className="absolute bottom-3 inset-x-3 bg-amber-500/95 text-slate-950 p-2.5 rounded-2xl flex items-center gap-2 text-xs font-black shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2 duration-150">
            <AlertTriangle className="w-4 h-4 text-amber-950 shrink-0" />
            <span className="truncate">🟡 تم تسجيل الطالب مسبقاً (مكرر)</span>
          </div>
        )}

        {flashType === 'external' && (
          <div className="absolute bottom-3 inset-x-3 bg-rose-600/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-black shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2 duration-150">
            <Users className="w-4 h-4 text-rose-200 shrink-0" />
            <span className="truncate">🔴 طالب من خارج المجموعة الدراسية</span>
          </div>
        )}

        {flashType === 'unknown' && (
          <div className="absolute bottom-3 inset-x-3 bg-slate-700/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2 duration-150">
            <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="truncate">⚪ رمز غير صالح أو غير مسجل</span>
          </div>
        )}
      </div>

      {/* External Student Cross-Group Modal */}
      <ExternalStudentModal
        isOpen={!!crossGroupPrompt}
        onClose={handleCancelCrossGroup}
        onConfirm={handleConfirmCrossGroup}
        isPending={isPending}
        student={crossGroupPrompt?.student}
        studentGroup={crossGroupPrompt?.studentGroup}
        sessionGroup={crossGroupPrompt?.sessionGroup}
      />

      {/* Result Alert Box */}
      <div className="mt-6 w-full max-w-sm min-h-[80px]">
        {cameraError ? (
          <Alert variant="error">
            <div className="flex flex-col">
              <span className="font-semibold">خطأ في الكاميرا</span>
              <span className="text-sm mt-1">{cameraError}</span>
            </div>
          </Alert>
        ) : lastScanResult ? (
          <Alert
            variant={
              lastScanResult.success
                ? 'success'
                : lastScanResult.duplicate || lastScanResult.isNotFound
                ? 'warning'
                : 'error'
            }
          >
            <div className="flex flex-col">
              {lastScanResult.title && (
                <span className="font-bold text-sm mb-1">{lastScanResult.title}</span>
              )}
              <span className="font-semibold">{lastScanResult.message}</span>
              {lastScanResult.studentName && (
                <span className="text-sm mt-1 font-bold">{lastScanResult.studentName}</span>
              )}
            </div>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
