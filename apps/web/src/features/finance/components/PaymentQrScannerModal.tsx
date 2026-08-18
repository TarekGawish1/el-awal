'use client';

import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useScanPaymentQr } from '../hooks/useFinance';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Users, 
  CreditCard, 
  Volume2, 
  VolumeX,
  Sparkles,
  X
} from 'lucide-react';

interface PaymentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGroupId?: string;
  initialPeriodYear?: number;
  initialPeriodMonth?: number;
}

export function PaymentQrScannerModal({
  isOpen,
  onClose,
  initialGroupId,
  initialPeriodYear,
  initialPeriodMonth,
}: PaymentQrScannerModalProps) {
  const [groupId, setGroupId] = useState<string>(initialGroupId || '');
  const [periodYear, setPeriodYear] = useState<number>(initialPeriodYear || new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState<number>(initialPeriodMonth || new Date().getMonth() + 1);
  const [amountPaidOverride, setAmountPaidOverride] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scannedCount, setScannedCount] = useState<number>(0);

  const [lastScanResult, setLastScanResult] = useState<{
    success?: boolean;
    isDuplicate?: boolean;
    message?: string;
    studentName?: string;
    groupName?: string;
    amount?: number;
    period?: string;
  } | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const { data: groups = [] } = useGroups();
  const { mutate: scanPayment, isPending } = useScanPaymentQr();

  // Keep state synced with props when opened
  useEffect(() => {
    if (isOpen) {
      if (initialGroupId) setGroupId(initialGroupId);
      if (initialPeriodYear) setPeriodYear(initialPeriodYear);
      if (initialPeriodMonth) setPeriodMonth(initialPeriodMonth);
      setLastScanResult(null);
      setCameraError(null);
      setLocked(false);
    }
  }, [isOpen, initialGroupId, initialPeriodYear, initialPeriodMonth]);

  // Play audio beep on scan success/error
  const playBeep = (isSuccess: boolean) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isSuccess) {
        // Crisp dual-tone success chime
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        // Low error buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // Audio context might be restricted before user interaction
    }
  };

  const handleScan = (detectedCodes: any[]) => {
    if (locked || isPending || !detectedCodes || detectedCodes.length === 0) return;

    const token = detectedCodes[0]?.rawValue;
    if (!token) return;

    setLocked(true);

    const payload: any = {
      qrCodeToken: token,
      periodYear,
      periodMonth,
    };

    if (groupId) {
      payload.groupId = groupId;
    }

    if (amountPaidOverride && !isNaN(Number(amountPaidOverride))) {
      payload.amountPaid = Number(amountPaidOverride);
    }

    scanPayment(payload, {
      onSuccess: (data) => {
        playBeep(true);
        setScannedCount((prev) => prev + 1);
        setLastScanResult({
          success: true,
          isDuplicate: data.isDuplicate,
          message: data.message,
          studentName: data.student?.fullName,
          groupName: data.group?.name || 'عام',
          amount: Number(data.payment?.amountPaid ?? 0),
          period: `شهر ${periodMonth} - ${periodYear}`,
        });

        // Resume scanner after 2.5 seconds
        setTimeout(() => {
          setLocked(false);
        }, 2500);
      },
      onError: (error: any) => {
        playBeep(false);
        const msg = error.response?.data?.message || error.message || 'رمز QR غير صالح أو حدث خطأ أثناء التسجيل';
        setLastScanResult({
          success: false,
          message: Array.isArray(msg) ? msg[0] : msg,
        });

        // Resume scanner after 2 seconds
        setTimeout(() => {
          setLocked(false);
        }, 2000);
      },
    });
  };

  const handleCameraError = (error: any) => {
    console.error('QR Scanner Camera Error:', error);
    if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
      setCameraError('تم رفض صلاحية استخدام الكاميرا. يرجى تفعيلها من إعدادات المتصفح.');
    } else if (error?.name === 'NotSupportedError' || error?.message?.includes('secure context')) {
      setCameraError('لا يمكن الوصول للكاميرا. تأكد من استخدام اتصال آمن (HTTPS) أو أنك تستخدم localhost.');
    } else {
      setCameraError(error?.message || 'حدث خطأ في تشغيل الكاميرا.');
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            دفع المصروفات عبر ماسح الـ QR
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5" dir="rtl">
          {/* Controls Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Group */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-primary" />
                المجموعة
              </label>
              <select
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-primary/20"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                <option value="">تلقائي (حسب اشتراك الطالب)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.monthlyFee} ج.م)
                  </option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                شهر الاستحقاق
              </label>
              <div className="flex gap-1.5">
                <select
                  className="w-2/3 h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-primary/20"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      شهر {m}
                    </option>
                  ))}
                </select>
                <select
                  className="w-1/3 h-9 rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-primary/20"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Amount & Sound */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  المبلغ (اختياري)
                </label>
                <input
                  type="number"
                  placeholder="تلقائي من المجموعة"
                  value={amountPaidOverride}
                  onChange={(e) => setAmountPaidOverride(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'كتم الصوت' : 'تفعيل صوت التأكيد'}
                className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border transition-colors ${
                  soundEnabled
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Scanner Viewport */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-xs aspect-square bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-xl relative ring-4 ring-primary-100">
              <Scanner
                onScan={handleScan}
                onError={handleCameraError}
                formats={['qr_code']}
              />

              {/* Scanning Overlay Grid & Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-40 h-40 border-2 border-dashed border-primary-400/70 rounded-2xl animate-pulse relative">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary-400"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary-400"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary-400"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary-400"></div>
                </div>
              </div>

              {/* Spinner Overlay during active request */}
              {(locked || isPending) && (
                <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mb-2"></div>
                  <span className="text-white text-xs font-bold tracking-wide">جاري تسجيل السداد...</span>
                </div>
              )}
            </div>

            {/* Scanned in current session counter */}
            {scannedCount > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>تم سداد <strong>{scannedCount}</strong> طلاب في هذه الجلسة</span>
              </div>
            )}
          </div>

          {/* Live Feedback Card */}
          <div className="min-h-[85px]">
            {cameraError ? (
              <Alert variant="error">
                <div className="flex flex-col">
                  <span className="font-bold">تعذر الوصول إلى الكاميرا</span>
                  <span className="text-xs mt-1 text-red-600">{cameraError}</span>
                </div>
              </Alert>
            ) : lastScanResult ? (
              lastScanResult.success ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{lastScanResult.studentName}</h4>
                        {lastScanResult.isDuplicate ? (
                          <Badge variant="warning" className="text-[10px]">مُسجل مسبقاً</Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">تم الدفع بنجاح</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        المجموعة: <strong className="text-slate-800">{lastScanResult.groupName}</strong> &bull; {lastScanResult.period}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="block text-xs text-slate-500 font-medium">المبلغ المسدد</span>
                    <span className="text-base font-black text-emerald-700">{lastScanResult.amount} ج.م</span>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-900 text-sm">فشل تسجيل الدفعة</h4>
                    <p className="text-xs text-rose-700 mt-0.5">{lastScanResult.message}</p>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center py-3 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                وجه كاميرا الجهاز نحو بطاقة الـ QR الخاصة بالطالب لتسجيل السداد تلقائياً
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={onClose}>
              إغلاق الماسح
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
