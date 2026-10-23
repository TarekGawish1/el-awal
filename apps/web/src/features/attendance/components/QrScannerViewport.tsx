'use client';

import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { RefreshCcw, AlertTriangle, CheckCircle2, XCircle, Users, Camera, HelpCircle } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { CameraPermissionOverlay, SafeScannerBoundary } from '@/components/camera';

interface QrScannerViewportProps {
  scannerContainerRef: React.RefObject<HTMLDivElement | null>;
  cameraKey: number;
  facingMode: 'environment' | 'user';
  locked: boolean;
  isPending: boolean;
  hasCrossGroupPrompt: boolean;
  flashType: 'success' | 'duplicate' | 'external' | 'unknown' | 'error' | null;
  cameraError: string | null;
  isRequestingPermission: boolean;
  lastScanResult: {
    success?: boolean;
    duplicate?: boolean;
    isExternal?: boolean;
    isUnknown?: boolean;
    isNotFound?: boolean;
    title?: string;
    message?: string;
    studentName?: string;
  } | null;
  onScan: (codes: any[]) => void;
  onError: (error: any) => void;
  onToggleFacingMode: () => void;
  onRequestPermission: () => void;
  onOpenPermissionGuide: () => void;
  onRetryCamera: () => void;
}

export function QrScannerViewport({
  scannerContainerRef,
  cameraKey,
  facingMode,
  locked,
  isPending,
  hasCrossGroupPrompt,
  flashType,
  cameraError,
  isRequestingPermission,
  lastScanResult,
  onScan,
  onError,
  onToggleFacingMode,
  onRequestPermission,
  onOpenPermissionGuide,
  onRetryCamera,
}: QrScannerViewportProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        ref={scannerContainerRef}
        className={`w-full max-w-sm aspect-square bg-slate-900 rounded-3xl overflow-hidden border border-slate-100 shadow-sm relative transition-all duration-300 ring-4 ${
          flashType === 'success'
            ? 'ring-emerald-500 shadow-lg shadow-emerald-500/20'
            : flashType === 'duplicate'
            ? 'ring-amber-500 shadow-lg shadow-amber-500/20'
            : flashType === 'external'
            ? 'ring-rose-500 shadow-lg shadow-rose-500/20'
            : flashType === 'unknown'
            ? 'ring-slate-400 shadow-lg shadow-slate-400/20'
            : flashType === 'error'
            ? 'ring-rose-500 shadow-lg shadow-rose-500/20'
            : 'ring-primary-50'
        }`}
      >
        <SafeScannerBoundary onRetry={onRetryCamera}>
          <Scanner
            key={cameraKey}
            onScan={onScan}
            onError={onError}
            paused={locked || isPending || hasCrossGroupPrompt}
            scanDelay={400}
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
        </SafeScannerBoundary>

        <button
          type="button"
          onClick={onToggleFacingMode}
          className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md p-2.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm cursor-pointer"
          title="تبديل / إعادة تشغيل الكاميرا"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>

        {(locked || isPending) && !hasCrossGroupPrompt && (
          <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent mb-2"></div>
            <span className="text-xs font-bold text-slate-700">جاري معالجة الـ QR...</span>
          </div>
        )}

        {/* Dynamic Color-Coded Overlay Status Banner */}
        {flashType === 'success' && (
          <div className="absolute bottom-3 inset-x-3 bg-emerald-600/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span className="truncate">🟢 تم تسجيل الحضور بنجاح</span>
          </div>
        )}

        {flashType === 'duplicate' && (
          <div className="absolute bottom-3 inset-x-3 bg-amber-500/95 text-slate-950 p-2.5 rounded-2xl flex items-center gap-2 text-xs font-black shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2 duration-150">
            <AlertTriangle className="w-4 h-4 text-amber-950 shrink-0" />
            <span className="truncate">🟡 تم تسجيل الطالب مسبقاً (مكرر)</span>
          </div>
        )}

        {flashType === 'external' && (
          <div className="absolute bottom-3 inset-x-3 bg-rose-600/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-black shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2 duration-150">
            <Users className="w-4 h-4 text-rose-200 shrink-0" />
            <span className="truncate">🔴 طالب من خارج المجموعة الدراسية</span>
          </div>
        )}

        {flashType === 'unknown' && (
          <div className="absolute bottom-3 inset-x-3 bg-slate-700/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2 duration-150">
            <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="truncate">⚪ رمز غير صالح أو غير مسجل</span>
          </div>
        )}

        {/* Camera Permission & Error Overlay */}
        <CameraPermissionOverlay
          error={cameraError}
          isRequesting={isRequestingPermission}
          onRequestPermission={onRequestPermission}
          onOpenGuide={onOpenPermissionGuide}
          onRetry={onRetryCamera}
        />
      </div>

      {/* Result Alert Box */}
      <div className="mt-6 w-full max-w-sm min-h-[80px]">
        {cameraError ? (
          <Alert variant="error">
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col">
                <span className="font-bold flex items-center gap-1.5 text-rose-800">
                  <Camera className="w-4 h-4 text-rose-600" />
                  خطأ في الكاميرا
                </span>
                <span className="text-xs sm:text-sm mt-1 text-rose-700 leading-relaxed">{cameraError}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200/60">
                <button
                  type="button"
                  onClick={onRequestPermission}
                  disabled={isRequestingPermission}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isRequestingPermission ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري الطلب...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>طلب إذن الكاميرا مجدداً</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onOpenPermissionGuide}
                  className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>طريقة التفعيل من المتصفح 🔒</span>
                </button>
              </div>
            </div>
          </Alert>
        ) : lastScanResult ? (
          <Alert
            variant={
              lastScanResult.success
                ? 'success'
                : lastScanResult.duplicate || lastScanResult.isNotFound
                ? 'warning'
                : 'error'
            }
          >
            <div className="flex flex-col">
              {lastScanResult.title && (
                <span className="font-bold text-sm mb-1">{lastScanResult.title}</span>
              )}
              <span className="font-semibold">{lastScanResult.message}</span>
              {lastScanResult.studentName && (
                <span className="text-sm mt-1 font-bold">{lastScanResult.studentName}</span>
              )}
            </div>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
