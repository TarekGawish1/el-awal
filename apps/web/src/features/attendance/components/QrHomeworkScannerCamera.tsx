'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { RefreshCcw, CheckCircle2 } from 'lucide-react';
import { initQrDetector } from '@/lib/qr/qr-detector-init';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
);

interface QrHomeworkScannerCameraProps {
  cameraKey: number;
  facingMode: 'environment' | 'user';
  onToggleFacingMode: () => void;
  onScan: (codes: any[]) => void;
  locked: boolean;
  scannedStudent: any;
  flashType: 'success' | 'duplicate' | 'error' | null;
  onRecordHomework: (status: 'CHECKED_ONSITE' | 'NOT_SUBMITTED' | 'INCOMPLETE' | 'EXCUSED') => void;
  onCancelScannedStudent: () => void;
}

export function QrHomeworkScannerCamera({
  cameraKey,
  facingMode,
  onToggleFacingMode,
  onScan,
  locked,
  scannedStudent,
  flashType,
  onRecordHomework,
  onCancelScannedStudent,
}: QrHomeworkScannerCameraProps) {
  return (
    <div className="md:col-span-6 flex flex-col items-center">
      <div
        className={`w-full max-w-sm aspect-[3/4] sm:aspect-square bg-slate-950 rounded-3xl overflow-hidden border border-slate-200 shadow-md relative transition-all duration-300 ring-4 ${
          flashType === 'success'
            ? 'ring-indigo-500 shadow-xl shadow-indigo-500/20'
            : flashType === 'error'
            ? 'ring-rose-500 shadow-xl shadow-rose-500/20'
            : 'ring-indigo-100'
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
          paused={locked || !!scannedStudent}
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

        <button
          type="button"
          onClick={onToggleFacingMode}
          className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md p-2.5 rounded-full transition-colors focus:outline-none shadow-sm cursor-pointer"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>

        {scannedStudent && (
          <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-10 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="text-center mb-5 shrink-0 mt-auto pt-4">
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                {scannedStudent.fullName || 'طالب'}
              </h3>
              <p className="text-sm font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full inline-block">
                {scannedStudent.studentCode || scannedStudent.id}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full max-w-[260px] shrink-0 mb-auto pb-4">
              <Button
                className="col-span-2 h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-md shadow-emerald-500/20"
                onClick={() => onRecordHomework('CHECKED_ONSITE')}
              >
                <CheckCircle2 className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2" />
                حل الواجب
              </Button>

              <Button
                variant="outline"
                className="h-12 text-base font-bold text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-2xl"
                onClick={() => onRecordHomework('NOT_SUBMITTED')}
              >
                محلوش
              </Button>

              <Button
                variant="outline"
                className="h-12 text-base font-bold text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-2xl"
                onClick={() => onRecordHomework('EXCUSED')}
              >
                بعذر
              </Button>

              <Button
                variant="ghost"
                className="col-span-2 h-10 mt-1 text-slate-400 hover:text-slate-600 rounded-xl text-sm"
                onClick={onCancelScannedStudent}
              >
                إلغاء ومسح طالب آخر
              </Button>
            </div>
          </div>
        )}

        {locked && !scannedStudent && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 backdrop-blur-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-2" />
            <span className="text-xs font-bold text-white">جاري البحث عن الطالب...</span>
          </div>
        )}

        {flashType === 'success' && !scannedStudent && (
          <div className="absolute bottom-3 inset-x-3 bg-emerald-600/95 text-white p-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg backdrop-blur-xs animate-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span className="truncate">🟢 تم تسجيل حالة الواجب</span>
          </div>
        )}
      </div>
    </div>
  );
}
