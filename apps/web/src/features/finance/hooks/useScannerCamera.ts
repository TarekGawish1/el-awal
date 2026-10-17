'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { initQrDetector } from '@/lib/qr/qr-detector-init';

export function useScannerCamera() {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraKey, setCameraKey] = useState(0);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  const handleCameraError = (error: any) => {
    console.error('QR Scanner Camera Error:', error);
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

  return {
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
  };
}
