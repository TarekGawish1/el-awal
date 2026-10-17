'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { RefreshCcw, Sparkles } from 'lucide-react';
import { CameraPermissionOverlay } from '@/components/camera';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
);

interface PaymentScannerViewportProps {
  scannerContainerRef: React.RefObject<HTMLDivElement | null>;
  paymentType: 'TUITION' | 'BOOKLET';
  cameraKey: number;
  facingMode: 'environment' | 'user';
  setFacingMode: React.Dispatch<React.SetStateAction<'environment' | 'user'>>;
  setCameraKey: React.Dispatch<React.SetStateAction<number>>;
  setCameraError: (err: string | null) => void;
  locked: boolean;
  isPending: boolean;
  cameraError: string | null;
  isRequestingPermission: boolean;
  requestCameraPermission: () => Promise<void>;
  setShowPermissionGuide: (show: boolean) => void;
  scannedCount: number;
  onScan: (detectedCodes: any[]) => void;
  onError: (error: any) => void;
}

export function PaymentScannerViewport({
  scannerContainerRef,
  paymentType,
  cameraKey,
  facingMode,
  setFacingMode,
  setCameraKey,
  setCameraError,
  locked,
  isPending,
  cameraError,
  isRequestingPermission,
  requestCameraPermission,
  setShowPermissionGuide,
  scannedCount,
  onScan,
  onError,
}: PaymentScannerViewportProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        ref={scannerContainerRef}
        className={`w-full max-w-xs aspect-square bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 shadow-xl relative ring-4 transition-all duration-300 ${
          paymentType === 'BOOKLET' ? 'ring-purple-100' : 'ring-primary-100'
        }`}
      >
        <Scanner
          key={cameraKey}
          onScan={onScan}
          onError={onError}
          formats={['qr_code']}
          startTimeoutMs={30000}
          constraints={{
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
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

        <button
          onClick={() => {
            setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
            setCameraKey((prev) => prev + 1);
          }}
          className="absolute top-3 right-3 z-20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm cursor-pointer"
          title="تبديل / إعادة تشغيل الكاميرا"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>

        {/* Reticle */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className={`w-40 h-40 border-2 border-dashed rounded-2xl animate-pulse relative ${
              paymentType === 'BOOKLET' ? 'border-purple-400/80' : 'border-primary-400/70'
            }`}
          >
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary-400"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary-400"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary-400"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary-400"></div>
          </div>
        </div>

        {/* Spinner Overlay */}
        {(locked || isPending) && (
          <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mb-2"></div>
            <span className="text-white text-xs font-bold tracking-wide">جاري تسجيل السداد...</span>
          </div>
        )}

        {/* Camera Permission & Error Overlay */}
        <CameraPermissionOverlay
          error={cameraError}
          isRequesting={isRequestingPermission}
          onRequestPermission={requestCameraPermission}
          onOpenGuide={() => setShowPermissionGuide(true)}
          onRetry={() => {
            setCameraError(null);
            setCameraKey((prev) => prev + 1);
          }}
        />
      </div>

      {/* Scanned Count */}
      {scannedCount > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>تم سداد <strong>{scannedCount}</strong> طلاب في هذه الجلسة</span>
        </div>
      )}
    </div>
  );
}
