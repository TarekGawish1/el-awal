'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
);
import { useScanPaymentQr } from '../hooks/useFinance';
import { useBooklets } from '@/features/booklets/hooks/useBooklets';
import { Alert } from '@/components/ui/Alert';
import { RefreshCcw, CreditCard, BookOpen, Calendar, Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { parseStudentQr } from '@/lib/qr/qr-parser';
import { initQrDetector } from '@/lib/qr/qr-detector-init';
import { scanQrFromImageFile } from '@/lib/qr/qr-image-scanner';
import { CameraPermissionModal, CameraPermissionOverlay } from '@/components/camera';
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
  const [paymentType, setPaymentType] = useState<'TUITION' | 'BOOKLET'>('TUITION');
  const [selectedBookletId, setSelectedBookletId] = useState<string>('');
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState<number>(periodMonth || new Date().getMonth() + 1);
  const [selectedPeriodYear, setSelectedPeriodYear] = useState<number>(periodYear || new Date().getFullYear());

  useEffect(() => {
    if (periodMonth) setSelectedPeriodMonth(periodMonth);
  }, [periodMonth]);

  useEffect(() => {
    if (periodYear) setSelectedPeriodYear(periodYear);
  }, [periodYear]);

  const { booklets = [] } = useBooklets();

  useEffect(() => {
    if (paymentType === 'BOOKLET' && booklets.length > 0 && !selectedBookletId) {
      setSelectedBookletId(booklets[0].id);
    }
  }, [paymentType, booklets, selectedBookletId]);

  const [lastScanResult, setLastScanResult] = useState<{
    success?: boolean;
    isDuplicate?: boolean;
    isNotFound?: boolean;
    title?: string;
    message?: string;
    studentName?: string;
    bookletTitle?: string;
    amount?: number;
    groupName?: string;
  } | null>(null);

  const { mutate, isPending } = useScanPaymentQr();
  const [locked, setLocked] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraKey, setCameraKey] = useState(0);
  const [flashType, setFlashType] = useState<'success' | 'duplicate' | 'error' | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect single-camera devices (e.g. desktop/laptop webcam) and default to 'user'
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        if (videoInputs.length === 1) {
          setFacingMode('user');
        }
      }).catch(() => {});
    }
  }, []);

  const requestCameraPermission = async () => {
    setIsRequestingPermission(true);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        toast.error('المتصفح لا يدعم الوصول للكاميرا، أو يتطلب اتصال HTTPS آمن.');
        setCameraError('لا يمكن الوصول للكاميرا. تأكد من استخدام اتصال آمن (HTTPS) أو أنك تستخدم localhost.');
        return;
      }

      // Cascading request with fallback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
      } catch (err1) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      // Stream acquired, release tracks cleanly so Scanner component can bind
      stream.getTracks().forEach((track) => track.stop());

      // Small pause to allow camera device hardware to release before Scanner remounts
      await new Promise((r) => setTimeout(r, 200));

      setCameraError(null);
      setCameraKey((prev) => prev + 1);
      toast.success('تم تفعيل صلاحية الكاميرا بنجاح! جاري تشغيل الماسح...');
    } catch (err: any) {
      console.warn('Manual camera permission request failed:', err);
      const msg = err?.message || '';
      if (err?.name === 'NotAllowedError' || msg.includes('Permission') || msg.includes('denied')) {
        setCameraError('تم رفض صلاحية استخدام الكاميرا. يرجى تفعيلها من إعدادات المتصفح.');
        setShowPermissionGuide(true);
      } else if (err?.name === 'NotSupportedError' || msg.includes('secure context')) {
        setCameraError('لا يمكن الوصول للكاميرا. تأكد من استخدام اتصال آمن (HTTPS) أو أنك تستخدم localhost.');
      } else {
        toast.error('تعذر تشغيل الكاميرا: ' + (msg || 'خطأ غير معروف'));
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingImage(true);
    try {
      const token = await scanQrFromImageFile(file);
      handleScan([{ rawValue: token }]);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر قراءة رمز QR من الصورة المحددة.');
    } finally {
      setIsDecodingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Web Audio API Synthesizer
  const playBeep = (type: 'success' | 'duplicate' | 'error') => {
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
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
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

    // Strict client-side format and schema verification
    const parsed = parseStudentQr(token);
    if (!parsed.isValid) {
      playBeep('error');
      setFlashType('error');
      setLastScanResult({
        success: false,
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

    if (paymentType === 'BOOKLET' && !selectedBookletId) {
      toast.error('يرجى اختيار المذكرة المراد تحصيل قيمتها أولاً');
      return;
    }

    setLocked(true);
    mutate(
      {
        qrCodeToken: token,
        paymentType,
        bookletId: paymentType === 'BOOKLET' ? selectedBookletId : undefined,
        groupId: groupId || undefined,
        periodYear: selectedPeriodYear,
        periodMonth: selectedPeriodMonth,
      },
      {
        onSuccess: (data) => {
          const studentName = data.student?.fullName || 'الطالب';
          const amount = Number(data.payment?.amountPaid || (data.booklet?.price ?? 0));
          const bookletTitle = data.booklet?.title;

          if (data.isDuplicate) {
            playBeep('duplicate');
            setFlashType('duplicate');
            setLastScanResult({
              success: false,
              isDuplicate: true,
              message:
                paymentType === 'BOOKLET'
                  ? `تم سداد قيمة المذكرة لهذا الطالب مسبقاً (${amount} ج.م).`
                  : `تم سداد مصروفات شهر ${selectedPeriodMonth} لهذا الطالب مسبقاً (${amount} ج.م).`,
              studentName,
              bookletTitle,
              groupName: data.group?.name,
              amount,
            });
            toast.error('تم السداد لهذا الطالب مسبقاً');
          } else {
            playBeep('success');
            setFlashType('success');
            setLastScanResult({
              success: true,
              message:
                paymentType === 'BOOKLET'
                  ? `تم تسجيل سداد المذكرة بنجاح بمبلغ ${amount} ج.م.`
                  : `تم تسجيل سداد المصروفات بنجاح بمبلغ ${amount} ج.م لشهر ${selectedPeriodMonth}/${selectedPeriodYear}.`,
              studentName,
              bookletTitle,
              groupName: data.group?.name,
              amount,
            });
            toast.success(
              paymentType === 'BOOKLET'
                ? `تم سداد مذكرة ${bookletTitle || ''}: ${studentName} (${amount} ج.م)`
                : `تم سداد: ${studentName} (${amount} ج.م)`,
            );
          }

          if (onPaymentSuccess) {
            onPaymentSuccess(studentName, amount);
          }

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
          const isNotFound = error?.code === 'STUDENT_NOT_FOUND' || errorMsg.includes('غير مسجلة في قاعدة البيانات المحلية');

          setLastScanResult({
            success: false,
            isNotFound,
            title: isNotFound ? 'طالب غير موجود' : 'رمز QR غير صالح',
            message: isNotFound
              ? 'بيانات الطالب غير مسجلة في قاعدة البيانات المحلية. يرجى تحديث البيانات عند توفر الإنترنت.'
              : errorMsg,
          });
          toast.error(errorMsg);

          setTimeout(() => {
            setLocked(false);
            setFlashType(null);
          }, 1500);
        },
      },
    );
  };

  const handleError = (error: any) => {
    console.error('Finance QR Scanner Error:', error);
    const msg = error?.message || '';
    if (msg.includes('Barcode detection service unavailable') || msg.includes('detect')) {
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
    <div className="flex flex-col items-center py-1 space-y-3">
      {/* Hidden File Input for Image QR Scanning */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Mode Selector */}
      <div className="w-full max-w-xs flex bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setPaymentType('TUITION')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentType === 'TUITION'
              ? 'bg-white text-primary shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          اشتراك شهري
        </button>
        <button
          type="button"
          onClick={() => setPaymentType('BOOKLET')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentType === 'BOOKLET'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          سداد قيمة مذكرة
        </button>
      </div>

      {/* Month & Year Selector in Tuition Mode */}
      {paymentType === 'TUITION' && (
        <div className="w-full max-w-xs bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary-600" />
              <span>شهر وسنة الاشتراك:</span>
            </label>
            <span className="text-[10px] font-black text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100">
              شهر {selectedPeriodMonth} / {selectedPeriodYear}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <select
                className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-primary/30 cursor-pointer"
                value={selectedPeriodMonth}
                onChange={(e) => setSelectedPeriodMonth(Number(e.target.value))}
              >
                {[
                  { m: 1, name: 'شهر 1 (يناير)' },
                  { m: 2, name: 'شهر 2 (فبراير)' },
                  { m: 3, name: 'شهر 3 (مارس)' },
                  { m: 4, name: 'شهر 4 (أبريل)' },
                  { m: 5, name: 'شهر 5 (مايو)' },
                  { m: 6, name: 'شهر 6 (يونيو)' },
                  { m: 7, name: 'شهر 7 (يوليو)' },
                  { m: 8, name: 'شهر 8 (أغسطس)' },
                  { m: 9, name: 'شهر 9 (سبتمبر)' },
                  { m: 10, name: 'شهر 10 (أكتوبر)' },
                  { m: 11, name: 'شهر 11 (نوفمبر)' },
                  { m: 12, name: 'شهر 12 (ديسمبر)' },
                ].map(({ m, name }) => (
                  <option key={m} value={m}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-primary/30 cursor-pointer"
                value={selectedPeriodYear}
                onChange={(e) => setSelectedPeriodYear(Number(e.target.value))}
              >
                {[selectedPeriodYear - 1, selectedPeriodYear, selectedPeriodYear + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Booklet Selector in Booklet Mode */}
      {paymentType === 'BOOKLET' && (
        <div className="w-full max-w-xs animate-in fade-in duration-200">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            المذكرة المراد سدادها للطالب
          </label>
          <select
            className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            value={selectedBookletId}
            onChange={(e) => setSelectedBookletId(e.target.value)}
          >
            <option value="">-- اختر المذكرة للتحصيل --</option>
            {booklets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} ({b.price} ج.م) - {b.gradeLevel}
              </option>
            ))}
          </select>
          {booklets.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              لا توجد مذكرات نشطة حالياً. يمكنك إنشاء مذكرات من تبويب "المذكرات والملازم".
            </p>
          )}
        </div>
      )}

      {/* Camera Viewport (Constrained to a sleek 250px) */}
      <div
        className={`w-full max-w-[250px] aspect-square bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 shadow-md relative transition-all duration-300 ring-4 mx-auto ${
          flashType === 'success'
            ? 'ring-emerald-500 shadow-lg shadow-emerald-500/20'
            : flashType === 'duplicate'
            ? 'ring-amber-500 shadow-lg shadow-amber-500/20'
            : flashType === 'error'
            ? 'ring-rose-500 shadow-lg shadow-rose-500/20'
            : paymentType === 'BOOKLET'
            ? 'ring-purple-100'
            : 'ring-primary-50'
        }`}
      >
        <Scanner
          key={cameraKey}
          onScan={handleScan}
          onError={handleError}
          paused={locked || isPending}
          scanDelay={400}
          startTimeoutMs={30000}
          formats={['qr_code']}
          constraints={{
            facingMode: { ideal: facingMode },
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

        {/* Top Viewfinder Controls */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
              setCameraKey((prev) => prev + 1);
            }}
            className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md p-1.5 rounded-full transition-colors focus:outline-none shadow-xs cursor-pointer"
            title="تبديل الكاميرا (أمامية / خلفية)"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDecodingImage}
            className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md p-1.5 rounded-full transition-colors focus:outline-none shadow-xs cursor-pointer"
            title="مسح رمز QR من صورة أو ملف"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {(locked || isPending || isDecodingImage) && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-10 backdrop-blur-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-600 border-t-transparent mb-1.5"></div>
            <span className="text-[11px] font-bold text-slate-800">
              {isDecodingImage ? 'جاري قراءة رمز الصورة...' : 'جاري معالجة الـ QR...'}
            </span>
          </div>
        )}

        {/* Permission & Error Overlay inside camera viewfinder */}
        <CameraPermissionOverlay
          error={cameraError}
          isRequesting={isRequestingPermission}
          onRequestPermission={requestCameraPermission}
          onOpenGuide={() => setShowPermissionGuide(true)}
          onRetry={() => {
            setCameraError(null);
            setCameraKey((prev) => prev + 1);
          }}
          onUploadImage={() => fileInputRef.current?.click()}
        />
      </div>

      {/* Live Scan Results & Clean Action Area */}
      <div className="w-full max-w-xs min-h-[44px]">
        {lastScanResult ? (
          <Alert
            variant={
              lastScanResult.success
                ? 'success'
                : lastScanResult.isDuplicate || lastScanResult.isNotFound
                ? 'warning'
                : 'error'
            }
          >
            <div className="flex flex-col text-xs">
              {lastScanResult.title && (
                <span className="font-bold mb-0.5">{lastScanResult.title}</span>
              )}
              <span className="font-medium leading-relaxed">{lastScanResult.message}</span>
              {lastScanResult.studentName && (
                <span className="mt-1 font-bold">
                  {lastScanResult.studentName}{' '}
                  {lastScanResult.bookletTitle && `(مذكرة: ${lastScanResult.bookletTitle})`}
                </span>
              )}
            </div>
          </Alert>
        ) : cameraError ? (
          <div className="text-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>أو مسح رمز QR من صورة / كاميرا الهاتف</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-2 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            {paymentType === 'BOOKLET'
              ? 'وجه الكاميرا نحو بطاقة QR الطالب لتحصيل المذكرة'
              : 'وجه الكاميرا نحو بطاقة QR الطالب لتسجيل السداد'}
          </div>
        )}
      </div>

      {/* Camera Permission Guide Modal */}
      <CameraPermissionModal
        isOpen={showPermissionGuide}
        onClose={() => setShowPermissionGuide(false)}
        onPermissionGranted={() => {
          setCameraError(null);
          setCameraKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}
