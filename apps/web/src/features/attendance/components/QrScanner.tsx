'use client';

import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useScanQrAttendance } from '../hooks/use-attendance';
import { Alert } from '@/components/ui/Alert';
import { RefreshCcw } from 'lucide-react';

interface QrScannerProps {
  sessionId: string;
}

export function QrScanner({ sessionId }: QrScannerProps) {
  const [lastScanResult, setLastScanResult] = useState<{
    success?: boolean;
    duplicate?: boolean;
    message?: string;
    studentName?: string;
  } | null>(null);

  const { mutate, isPending } = useScanQrAttendance();
  const [locked, setLocked] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const handleScan = (detectedCodes: any[]) => {
    if (locked || isPending || !detectedCodes || detectedCodes.length === 0) return;
    
    const token = detectedCodes[0]?.rawValue;
    if (!token) return;

    setLocked(true);
    mutate(
      { sessionId, qrCodeToken: token },
      {
        onSuccess: (data) => {
          if (data.isDuplicate) {
            setLastScanResult({
              success: false,
              duplicate: true,
              message: 'تم تسجيل حضور هذا الطالب لهذه الحصة مسبقاً.',
              studentName: data.student.fullName,
            });
          } else {
            setLastScanResult({
              success: true,
              message: 'تم تسجيل الحضور بنجاح.',
              studentName: data.student.fullName,
            });
          }
          // Unlock after 2 seconds to allow next scan
          setTimeout(() => setLocked(false), 2000);
        },
        onError: (error: any) => {
          const message = error.response?.data?.message || 'رمز QR غير صالح أو خطأ في الماسح الضوئي.';
          setLastScanResult({
            success: false,
            message: Array.isArray(message) ? message[0] : message,
          });
          // Unlock sooner on error
          setTimeout(() => setLocked(false), 1500);
        },
      }
    );
  };

  const handleError = (error: any) => {
    console.error('QR Scanner Error:', error);
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
            variant={lastScanResult.success ? 'success' : lastScanResult.duplicate ? 'warning' : 'error'}
          >
            <div className="flex flex-col">
              <span className="font-semibold">{lastScanResult.message}</span>
              {lastScanResult.studentName && (
                <span className="text-sm mt-1">{lastScanResult.studentName}</span>
              )}
            </div>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
