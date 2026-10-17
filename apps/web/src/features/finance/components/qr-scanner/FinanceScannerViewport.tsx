'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { RefreshCcw, Image as ImageIcon } from 'lucide-react';
import { CameraPermissionOverlay } from '@/components/camera';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
);

interface FinanceScannerViewportProps {
  scannerContainerRef: React.RefObject<HTMLDivElement | null>;
  flashType: 'success' | 'duplicate' | 'error' | null;
  paymentType: 'TUITION' | 'BOOKLET';
  cameraKey: number;
  onScan: (detectedCodes: any[]) => void;
  onError: (error: any) => void;
  locked: boolean;
  isPending: boolean;
  facingMode: 'environment' | 'user';
  onSwitchCamera: () => void;
  onPickImage: () => void;
  isDecodingImage: boolean;
  cameraError: string | null;
  isRequestingPermission: boolean;
  onRequestPermission: () => void;
  onOpenGuide: () => void;
  onRetry: () => void;
}

export function FinanceScannerViewport({
  scannerContainerRef,
  flashType,
  paymentType,
  cameraKey,
  onScan,
  onError,
  locked,
  isPending,
  facingMode,
  onSwitchCamera,
  onPickImage,
  isDecodingImage,
  cameraError,
  isRequestingPermission,
  onRequestPermission,
  onOpenGuide,
  onRetry,
}: FinanceScannerViewportProps) {
  return (
    <div
      ref={scannerContainerRef}
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
        onScan={onScan}
        onError={onError}
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
          onClick={onSwitchCamera}
          className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md p-1.5 rounded-full transition-colors focus:outline-none shadow-xs cursor-pointer"
          title="تبديل الكاميرا (أمامية / خلفية)"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onPickImage}
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
        onRequestPermission={onRequestPermission}
        onOpenGuide={onOpenGuide}
        onRetry={onRetry}
        onUploadImage={onPickImage}
      />
    </div>
  );
}
