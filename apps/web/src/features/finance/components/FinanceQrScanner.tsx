'use client';

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useScanPaymentQr } from '../hooks/useFinance';
import { Alert } from '@/components/ui/Alert';
import { RefreshCcw } from 'lucide-react';

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

  const playBeep = (isSuccess: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isSuccess) {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Audio context might be restricted
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
          playBeep(true);
          const studentName = data.student?.fullName || 'الطالب';
          const amount = Number(data.payment?.amountPaid || 0);

          if (data.isDuplicate) {
            setLastScanResult({
              success: false,
              isDuplicate: true,
              message: `تم سداد مصروفات شهر ${periodMonth} لهذا الطالب مسبقاً (${amount} ج.م).`,
              studentName,
              groupName: data.group?.name,
              amount,
            });
          } else {
            setLastScanResult({
              success: true,
              message: `تم تسجيل سداد المصروفات بنجاح بمبلغ ${amount} ج.م لشهر ${periodMonth}.`,
              studentName,
              groupName: data.group?.name,
              amount,
            });
          }

          if (onPaymentSuccess) {
            onPaymentSuccess(studentName, amount);
          }

          // Unlock after 2 seconds to allow next scan
          setTimeout(() => setLocked(false), 2000);
        },
        onError: (error: any) => {
          playBeep(false);
          const message = error.response?.data?.message || 'رمز QR غير صالح أو خطأ في الماسح الضوئي.';
          setLastScanResult({
            success: false,
            message: Array.isArray(message) ? message[0] : message,
          });
          // Unlock sooner on error
          setTimeout(() => setLocked(false), 1500);
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
      <div className="w-full max-w-sm aspect-square bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 shadow-sm relative ring-4 ring-primary-50">
        <Scanner
          onScan={handleScan}
          onError={handleError}
          formats={['qr_code']}
          constraints={{ facingMode }}
          styles={{ video: { transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' } }}
        />
        
        <button
          onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
          className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md p-2.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
          title="تبديل الكاميرا"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
        {(locked || isPending) && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
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
            variant={lastScanResult.success ? 'success' : lastScanResult.isDuplicate ? 'warning' : 'error'}
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
