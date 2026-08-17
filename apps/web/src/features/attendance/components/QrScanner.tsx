'use client';

import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useScanQrAttendance } from '../hooks/use-attendance';
import { Alert } from '@/components/ui/Alert';

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
              message: 'This student is already marked for this session.',
              studentName: data.student.fullName,
            });
          } else {
            setLastScanResult({
              success: true,
              message: 'Attendance recorded successfully.',
              studentName: data.student.fullName,
            });
          }
          // Unlock after 2 seconds to allow next scan
          setTimeout(() => setLocked(false), 2000);
        },
        onError: (error: any) => {
          const message = error.response?.data?.message || 'Invalid QR code or scanner error.';
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
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative">
        <Scanner 
          onScan={handleScan}
          onError={handleError}
          formats={['qr_code']}
        />
        {(locked || isPending) && (
          <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

      <div className="mt-6 w-full max-w-sm min-h-[80px]">
        {lastScanResult && (
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
        )}
      </div>
    </div>
  );
}
