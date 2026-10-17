'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { RefreshCcw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { initQrDetector } from '@/lib/qr/qr-detector-init';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
);

interface HomeworkScannerViewportProps {
  cameraKey: number;
  facingMode: 'environment' | 'user';
  locked: boolean;
  flashType: 'success' | 'duplicate' | 'error' | null;
  onScan: (detectedCodes: any[]) => void;
  onToggleFacingMode: () => void;
}

export function HomeworkScannerViewport({
  cameraKey,
  facingMode,
  locked,
  flashType,
  onScan,
  onToggleFacingMode,
}: HomeworkScannerViewportProps) {
  return (
    <div
      className={`w-full max-w-sm aspect-square bg-slate-950 rounded-3xl overflow-hidden border border-slate-200 shadow-md relative transition-all duration-300 ring-4 ${
        flashType === 'success'
          ? 'ring-emerald-500 shadow-xl shadow-emerald-500/20'
          : flashType === 'duplicate'
          ? 'ring-amber-500 shadow-xl shadow-amber-500/20'
          : flashType === 'error'
          ? 'ring-rose-500 shadow-xl shadow-rose-500/20'
          : 'ring-emerald-100'
      }`}
    >
      <Scanner
        key={cameraKey}
        onScan={onScan}
        onError={(err: any) => {
          const msg = err?.message || '';
          if (msg.includes('Barcode detection service unavailable') || msg.includes('detect')) {
            initQrDetector();
          } else if (msg.includes('timed out') || msg.includes('timeout')) {
            console.warn('Camera stream startup delay - waiting for camera warmup');
          }
        }}
        paused={locked}
        scanDelay={350}
        startTimeoutMs={30000}
        formats={['qr_code']}
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

      {/* Camera Switch & Reload Button */}
      <button
        type="button"
        onClick={onToggleFacingMode}
        className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md p-2.5 rounded-full transition-colors focus:outline-none shadow-sm cursor-pointer"
        title="تبديل / إعادة تشغيل الكاميرا"
      >
        <RefreshCcw className="w-5 h-5" />
      </button>

      {/* Processing Spinner Overlay */}
      {locked && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 backdrop-blur-xs">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent mb-2" />
          <span className="text-xs font-bold text-white">جاري رصد الواجب والحضور...</span>
        </div>
      )}

      {/* Color-Coded Live Banner Overlay */}
      {flashType === 'success' && (
        <div className="absolute bottom-3 inset-x-3 bg-emerald-600/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span className="truncate">🟢 تم تسجيل تسليم الواجب + الحضور</span>
        </div>
      )}

      {flashType === 'duplicate' && (
        <div className="absolute bottom-3 inset-x-3 bg-amber-500/95 text-slate-950 p-2.5 rounded-2xl flex items-center gap-2 text-xs font-black shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2">
          <AlertTriangle className="w-4 h-4 text-amber-950 shrink-0" />
          <span className="truncate">🟡 مسجل مسبقاً (مكرر)</span>
        </div>
      )}

      {flashType === 'error' && (
        <div className="absolute bottom-3 inset-x-3 bg-rose-600/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2">
          <XCircle className="w-4 h-4 text-rose-200 shrink-0" />
          <span className="truncate">🔴 رمز QR غير صالح</span>
        </div>
      )}
    </div>
  );
}
