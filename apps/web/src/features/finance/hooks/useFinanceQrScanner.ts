'use client';

import { useState, useEffect, useRef } from 'react';
import { useScanPaymentQr } from './useFinance';
import { useBooklets } from '@/features/booklets/hooks/useBooklets';
import { parseStudentQr } from '@/lib/qr/qr-parser';
import { initQrDetector } from '@/lib/qr/qr-detector-init';
import { scanQrFromImageFile } from '@/lib/qr/qr-image-scanner';
import { useScannerCamera } from './useScannerCamera';
import { playAttendanceBeep } from '@/features/attendance/utils/scanner-audio';
import toast from 'react-hot-toast';

interface UseFinanceQrScannerProps {
  groupId?: string;
  periodYear: number;
  periodMonth: number;
  onPaymentSuccess?: (studentName: string, amount: number) => void;
}

export function useFinanceQrScanner({
  groupId,
  periodYear,
  periodMonth,
  onPaymentSuccess,
}: UseFinanceQrScannerProps) {
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
  const [flashType, setFlashType] = useState<'success' | 'duplicate' | 'error' | null>(null);
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const {
    cameraError,
    setCameraError,
    facingMode,
    setFacingMode,
    cameraKey,
    setCameraKey,
    isRequestingPermission,
    showPermissionGuide,
    setShowPermissionGuide,
    handleCameraError: handleError,
    requestCameraPermission,
  } = useScannerCamera();

  useEffect(() => {
    initQrDetector();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isScanning = true;
    let animationId: number;
    let nativeDetector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        nativeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (err) {
        console.warn('Native BarcodeDetector initialization:', err);
      }
    }

    if (!nativeDetector) return;

    let lastScanTime = 0;
    const scanFrame = async () => {
      if (!isScanning) return;

      const now = Date.now();
      if (now - lastScanTime >= 120 && !locked && !isPending && scannerContainerRef.current) {
        lastScanTime = now;
        const video = scannerContainerRef.current.querySelector('video');
        if (video && video.readyState >= 2 && !video.paused) {
          try {
            const detected = await nativeDetector.detect(video);
            if (detected && detected.length > 0 && detected[0]?.rawValue) {
              handleScan([{ rawValue: detected[0].rawValue }]);
            }
          } catch (e) {
            // Transient frame detection error
          }
        }
      }

      animationId = requestAnimationFrame(scanFrame);
    };

    animationId = requestAnimationFrame(scanFrame);

    return () => {
      isScanning = false;
      cancelAnimationFrame(animationId);
    };
  }, [locked, isPending, cameraKey]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          if (videoInputs.length === 1) {
            setFacingMode('user');
          }
        })
        .catch(() => {});
    }
  }, []);

  const playBeep = (type: 'success' | 'duplicate' | 'error') => {
    playAttendanceBeep(type);
  };

  const handleScan = (detectedCodes: any[]) => {
    if (locked || isPending || !detectedCodes || detectedCodes.length === 0) return;

    const token = detectedCodes[0]?.rawValue;
    if (!token) return;

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


  return {
    paymentType,
    setPaymentType,
    selectedBookletId,
    setSelectedBookletId,
    selectedPeriodMonth,
    setSelectedPeriodMonth,
    selectedPeriodYear,
    setSelectedPeriodYear,
    booklets,
    lastScanResult,
    isPending,
    locked,
    cameraError,
    setCameraError,
    facingMode,
    setFacingMode,
    cameraKey,
    setCameraKey,
    flashType,
    isRequestingPermission,
    showPermissionGuide,
    setShowPermissionGuide,
    isDecodingImage,
    fileInputRef,
    scannerContainerRef,
    requestCameraPermission,
    handleScan,
    handleImageUpload,
    handleError,
  };
}
