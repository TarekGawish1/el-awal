'use client';

import { useState, useEffect, useRef } from 'react';
import { useScanQrAttendance } from './use-attendance';
import { parseStudentQr } from '@/lib/qr/qr-parser';
import { initQrDetector } from '@/lib/qr/qr-detector-init';
import { playAttendanceBeep } from '../utils/scanner-audio';
import toast from 'react-hot-toast';

interface UseAttendanceQrScannerProps {
  sessionId: string;
}

export function useAttendanceQrScanner({ sessionId }: UseAttendanceQrScannerProps) {
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
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

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
      if (now - lastScanTime >= 120 && !locked && !isPending && !crossGroupPrompt && scannerContainerRef.current) {
        lastScanTime = now;
        const video = scannerContainerRef.current.querySelector('video');
        if (video && video.readyState >= 2 && !video.paused) {
          try {
            const detected = await nativeDetector.detect(video);
            if (detected && detected.length > 0 && detected[0]?.rawValue) {
              handleScan([{ rawValue: detected[0].rawValue }]);
            }
          } catch {
            // Frame busy, continue next tick
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
  }, [locked, isPending, crossGroupPrompt, cameraKey]);

  const requestCameraPermission = async () => {
    setIsRequestingPermission(true);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        toast.error('المتصفح لا يدعم الوصول للكاميرا، أو يتطلب اتصال HTTPS آمن.');
        setCameraError('لا يمكن الوصول للكاميرا. تأكد من استخدام اتصال آمن (HTTPS) أو أنك تستخدم localhost.');
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      stream.getTracks().forEach((track) => track.stop());
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

  const handleScan = (detectedCodes: any[]) => {
    if (locked || isPending || crossGroupPrompt || !detectedCodes || detectedCodes.length === 0) {
      return;
    }

    const token = detectedCodes[0]?.rawValue;
    if (!token) return;

    const parsed = parseStudentQr(token);
    if (!parsed.isValid) {
      playAttendanceBeep('error');
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
            playAttendanceBeep('external');
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
            playAttendanceBeep('duplicate');
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
            playAttendanceBeep('success');
            setFlashType('success');
            setLastScanResult({
              success: true,
              message: data.message || 'تم تسجيل الحضور بنجاح.',
              studentName: data.student?.fullName,
            });
            toast.success(`تم حضور: ${data.student?.fullName}`);
          }

          setTimeout(() => {
            setLocked(false);
            setFlashType(null);
          }, 2500);
        },
        onError: (error: any) => {
          playAttendanceBeep('error');
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
          playAttendanceBeep('success');
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
          playAttendanceBeep('error');
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
    if (msg.includes('Barcode detection service unavailable') || msg.includes('detect') || msg.includes('wasm')) {
      initQrDetector();
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        return;
      }
      setTimeout(() => {
        setCameraKey((prev) => prev + 1);
      }, 400);
      return;
    }
    if (msg.includes('timed out') || msg.includes('timeout')) {
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

  return {
    lastScanResult,
    crossGroupPrompt,
    locked,
    isPending,
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
    scannerContainerRef,
    requestCameraPermission,
    handleScan,
    handleConfirmCrossGroup,
    handleCancelCrossGroup,
    handleError,
  };
}
