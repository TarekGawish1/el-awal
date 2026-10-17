'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useScanPaymentQr } from './useFinance';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useBooklets } from '@/features/booklets/hooks/useBooklets';
import { isBookletEligibleForStudent, formatBookletMismatchError } from '../utils/bookletEligibility';
import { parseStudentQr } from '@/lib/qr/qr-parser';
import { initQrDetector } from '@/lib/qr/qr-detector-init';
import { useScannerCamera } from './useScannerCamera';
import { playFinanceBeep } from '../utils/scanner-audio';

export interface ScanResultState {
  success?: boolean;
  isDuplicate?: boolean;
  title?: string;
  message?: string;
  studentName?: string;
  groupName?: string;
  bookletTitle?: string;
  amount?: number;
  period?: string;
}

interface UsePaymentQrScannerProps {
  isOpen: boolean;
  initialGroupId?: string;
  initialPeriodYear?: number;
  initialPeriodMonth?: number;
}

export function usePaymentQrScanner({
  isOpen,
  initialGroupId,
  initialPeriodYear,
  initialPeriodMonth,
}: UsePaymentQrScannerProps) {
  const [paymentType, setPaymentType] = useState<'TUITION' | 'BOOKLET'>('TUITION');
  const [groupId, setGroupId] = useState<string>(initialGroupId || '');
  const [selectedBookletId, setSelectedBookletId] = useState<string>('');
  const [periodYear, setPeriodYear] = useState<number>(initialPeriodYear || new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState<number>(initialPeriodMonth || new Date().getMonth() + 1);
  const [amountPaidOverride, setAmountPaidOverride] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scannedCount, setScannedCount] = useState<number>(0);

  const [lastScanResult, setLastScanResult] = useState<ScanResultState | null>(null);
  const [locked, setLocked] = useState(false);
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
    handleCameraError,
    requestCameraPermission,
  } = useScannerCamera();

  useEffect(() => {
    initQrDetector();
  }, []);

  const { data: groups = [] } = useGroups();
  const { booklets = [] } = useBooklets();
  const { mutate: scanPayment, isPending } = useScanPaymentQr();

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId),
    [groups, groupId],
  );

  const eligibleBooklets = useMemo(() => {
    if (!selectedGroup?.gradeLevel) return [];

    return booklets.filter((booklet) =>
      isBookletEligibleForStudent(booklet, {
        gradeLevel: selectedGroup.gradeLevel,
        groupIds: groupId ? [groupId] : [],
      }),
    );
  }, [booklets, groupId, selectedGroup?.gradeLevel]);

  useEffect(() => {
    if (paymentType !== 'BOOKLET') return;
    if (!eligibleBooklets.some((booklet) => booklet.id === selectedBookletId)) {
      setSelectedBookletId(eligibleBooklets[0]?.id || '');
    }
  }, [paymentType, eligibleBooklets, selectedBookletId]);

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

  const playBeep = (isSuccess: boolean) => playFinanceBeep(isSuccess, soundEnabled);

  const handleScan = (detectedCodes: any[]) => {
    if (locked || isPending || !detectedCodes || detectedCodes.length === 0) return;

    const token = detectedCodes[0]?.rawValue;
    if (!token) return;

    const parsed = parseStudentQr(token);
    if (!parsed.isValid) {
      playBeep(false);
      setLastScanResult({
        success: false,
        title: 'رمز QR غير صالح',
        message: 'الرمز الممسوح ضوئياً لا يتبع منصة الأول وغير مسجل في النظام.',
      });
      setLocked(true);
      setTimeout(() => {
        setLocked(false);
      }, 1500);
      return;
    }

    if (paymentType === 'BOOKLET' && !groupId) {
      setLastScanResult({
        success: false,
        message: 'يرجى اختيار مجموعة الطالب أولاً لعرض المذكرات المتوافقة.',
      });
      return;
    }

    if (paymentType === 'BOOKLET' && !selectedBookletId) {
      setLastScanResult({
        success: false,
        message: 'لا توجد مذكرة متوافقة مع صف أو مجموعة الطالب المحددة.',
      });
      return;
    }

    setLocked(true);

    const payload: any = {
      qrCodeToken: token,
      paymentType,
      periodYear,
      periodMonth,
    };

    if (paymentType === 'BOOKLET') {
      payload.bookletId = selectedBookletId;
    }

    if (groupId) {
      payload.groupId = groupId;
    }

    if (amountPaidOverride && !isNaN(Number(amountPaidOverride)) && Number(amountPaidOverride) > 0) {
      payload.amountPaid = Number(amountPaidOverride);
    } else if (paymentType === 'BOOKLET') {
      const bkt = eligibleBooklets.find((b) => b.id === selectedBookletId);
      if (bkt && Number(bkt.price) > 0) {
        payload.amountPaid = Number(bkt.price);
      }
    } else if (selectedGroup && Number(selectedGroup.monthlyFee) > 0) {
      payload.amountPaid = Number(selectedGroup.monthlyFee);
    }

    scanPayment(payload, {
      onSuccess: (data) => {
        const studentName = data.student?.fullName || 'الطالب';
        const amount = Number(data.payment?.amountPaid ?? (data.booklet?.price || data.payment?.amountExpected || 0));
        const bookletTitle = data.booklet?.title;

        if (data.isDuplicate) {
          playBeep(false);
          setLastScanResult({
            success: false,
            isDuplicate: true,
            message:
              data.message ||
              (paymentType === 'BOOKLET'
                ? `تم سداد قيمة المذكرة لهذا الطالب مسبقاً`
                : `تم سداد اشتراك شهر ${periodMonth} - ${periodYear} للطالب مسبقاً`),
            studentName,
            groupName: data.group?.name || 'عام',
            bookletTitle,
            amount,
            period:
              paymentType === 'BOOKLET'
                ? `مذكرة: ${bookletTitle || ''}`
                : `شهر ${periodMonth} - ${periodYear}`,
          });
        } else {
          playBeep(true);
          setScannedCount((prev) => prev + 1);
          setLastScanResult({
            success: true,
            isDuplicate: false,
            message: data.message,
            studentName,
            groupName: data.group?.name || 'عام',
            bookletTitle,
            amount,
            period:
              paymentType === 'BOOKLET'
                ? `مذكرة: ${bookletTitle || ''}`
                : `شهر ${periodMonth} - ${periodYear}`,
          });
        }

        setTimeout(() => {
          setLocked(false);
        }, 2200);
      },
      onError: (error: any) => {
        playBeep(false);
        const msg =
          error.response?.data?.message ||
          error.message ||
          'رمز QR غير صالح أو حدث خطأ أثناء التسجيل';
        const errorMsg = formatBookletMismatchError(msg) || (Array.isArray(msg) ? msg[0] : msg);
        const isNotFound = error?.code === 'STUDENT_NOT_FOUND' || String(errorMsg).includes('غير مسجلة في قاعدة البيانات المحلية');

        setLastScanResult({
          success: false,
          title: isNotFound ? 'طالب غير موجود' : 'رمز QR غير صالح',
          message: isNotFound
            ? 'بيانات الطالب غير مسجلة في قاعدة البيانات المحلية. يرجى تحديث البيانات عند توفر الإنترنت.'
            : errorMsg,
        });

        setTimeout(() => {
          setLocked(false);
        }, 1500);
      },
    });
  };

  // Continuous frame scanner loop using native BarcodeDetector
  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

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
      if (now - lastScanTime >= 120 && !locked && scannerContainerRef.current) {
        lastScanTime = now;
        const video = scannerContainerRef.current.querySelector('video');
        if (video && video.readyState >= 2 && !video.paused) {
          try {
            const detected = await nativeDetector.detect(video);
            if (detected && detected.length > 0 && detected[0]?.rawValue) {
              handleScan([{ rawValue: detected[0].rawValue }]);
            }
          } catch {
            // Ignore frame scan errors
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
  }, [locked, isOpen, cameraKey]);

  return {
    paymentType,
    setPaymentType,
    groupId,
    setGroupId,
    selectedBookletId,
    setSelectedBookletId,
    periodYear,
    setPeriodYear,
    periodMonth,
    setPeriodMonth,
    amountPaidOverride,
    setAmountPaidOverride,
    soundEnabled,
    setSoundEnabled,
    scannedCount,
    lastScanResult,
    cameraError,
    setCameraError,
    locked,
    facingMode,
    setFacingMode,
    cameraKey,
    setCameraKey,
    isRequestingPermission,
    showPermissionGuide,
    setShowPermissionGuide,
    scannerContainerRef,
    groups,
    eligibleBooklets,
    isPending,
    handleScan,
    handleCameraError,
    requestCameraPermission,
  };
}
