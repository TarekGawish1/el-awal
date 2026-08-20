'use client';

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useScanPaymentQr } from '../hooks/useFinance';
import { Alert } from '@/components/ui/Alert';
import { RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface FinanceQrScannerProps {
  groupId?: string;
  periodYear: number;
  periodMonth: number;
  onPaymentSuccess?: (studentName: string, amount: number) => void;
}

export function FinanceQrScanner({
  groupId,
  periodYear,
  periodMonth,
  onPaymentSuccess,
}: FinanceQrScannerProps) {
  const [lastScanResult, setLastScanResult] = useState<{
    success?: boolean;
    isDuplicate?: boolean;
    message?: string;
    studentName?: string;
    amount?: number;
    groupName?: string;
  } | null>(null);

  const { mutate, isPending } = useScanPaymentQr();
  const [locked, setLocked] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashType, setFlashType] = useState<'success' | 'duplicate' | 'error' | null>(null);

  // Web Audio API Synthesizer (Crystal Clear Audio Feedback)
  const playBeep = (type: 'success' | 'duplicate' | 'error') => {
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
        // Warning dual pulse tone (587Hz pulse)
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

  const handleScan = (detectedCodes: any[]) => {
    if (locked || isPending || !detectedCodes || detectedCodes.length === 0) return;

    const token = detectedCodes[0]?.rawValue;
    if (!token) return;

    setLocked(true);
    mutate(
      {
        qrCodeToken: token,
        groupId: groupId || undefined,
        periodYear,
        periodMonth,
      },
      {
        onSuccess: (data) => {
          const studentName = data.student?.fullName || 'الطالب';
          const amount = Number(data.payment?.amountPaid || 0);

          if (data.isDuplicate) {
            playBeep('duplicate');
            setFlashType('duplicate');
            setLastScanResult({
              success: false,
              isDuplicate: true,
              message: `⚠️ تم سداد مصروفات شهر ${periodMonth} لهذا الطالب مسبقاً (${amount} ج.م).`,
              studentName,
              groupName: data.group?.name,
              amount,
            });
            toast('تم سداد المصروفات لهذا الطالب مسبقاً', { icon: '⚠️' });
          } else {
            playBeep('success');
            setFlashType('success');
            setLastScanResult({
              success: true,
              message: `تم تسجيل سداد المصروفات بنجاح بمبلغ ${amount} ج.م لشهر ${periodMonth}.`,
              studentName,
              groupName: data.group?.name,
              amount,
            });
            toast.success(`تم سداد: ${studentName} (${amount} ج.م)`);
          }

          if (onPaymentSuccess) {
            onPaymentSuccess(studentName, amount);
          }

          // Unlock after 1.2s and clear flash to allow subsequent scans of same or new codes
          setTimeout(() => {
            setLocked(false);
            setFlashType(null);
          }, 1200);
        },
        onError: (error: any) => {
          playBeep('error');
          setFlashType('error');
          const message =
            error?.message ||
            error?.response?.data?.message ||
            'رمز الـ QR غير صالح أو حدث خطأ أثناء المسح.';
          const errorMsg = Array.isArray(message) ? message[0] : message;

          setLastScanResult({
            success: false,
            message: errorMsg,
          });
          toast.error(errorMsg);

          // Unlock after 1.2s to allow retry
          setTimeout(() => {
            setLocked(false);
            setFlashType(null);
          }, 1200);
        },
      },
    );
  };

  const handleError = (error: any) => {
    console.error('Finance QR Scanner Error:', error);
    if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
      setCameraError('تم رفض صلاحية استخدام الكاميرا. يرجى تفعيلها من إعدادات المتصفح.');
    } else if (error?.name === 'NotSupportedError' || error?.message?.includes('secure context')) {
      setCameraError('لا يمكن الوصول للكاميرا. تأكد من استخدام اتصال آمن (HTTPS) أو أنك تستخدم localhost.');
    } else {
      setCameraError(error?.message || 'حدث خطأ في تشغيل الكاميرا.');
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
            : flashType === 'error'
            ? 'ring-rose-500 shadow-lg shadow-rose-500/20'
            : 'ring-primary-50'
        }`}
      >
        <Scanner
          onScan={handleScan}
          onError={handleError}
          paused={locked || isPending}
          scanDelay={400}
          formats={['qr_code']}
          constraints={{ facingMode }}
          styles={{ video: { transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' } }}
        />

        <button
          type="button"
          onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
          className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md p-2.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm cursor-pointer"
          title="تبديل الكاميرا"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>

        {(locked || isPending) && (
          <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent mb-2"></div>
            <span className="text-xs font-bold text-slate-700">جاري معالجة الـ QR...</span>
          </div>
        )}
      </div>

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
                : lastScanResult.isDuplicate
                ? 'warning'
                : 'error'
            }
          >
            <div className="flex flex-col">
              <span className="font-semibold">{lastScanResult.message}</span>
              {lastScanResult.studentName && (
                <span className="text-sm mt-1 font-bold">{lastScanResult.studentName}</span>
              )}
            </div>
          </Alert>
        ) : (
          <div className="text-center py-3 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
            وجه كاميرا الجهاز نحو بطاقة الـ QR الخاصة بالطالب لتسجيل السداد فورياً
          </div>
        )}
      </div>
    </div>
  );
}
