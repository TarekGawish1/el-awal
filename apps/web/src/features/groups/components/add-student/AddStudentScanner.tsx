'use client';

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SafeScannerBoundary } from '@/components/camera';

export interface AddStudentScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function AddStudentScanner({ onScan, onClose }: AddStudentScannerProps) {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 rounded-xl overflow-hidden p-6 border-2 border-primary-500/30 shadow-inner">
      <div className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-2xl ring-4 ring-primary-500/50 bg-black relative">
        <SafeScannerBoundary>
          <Scanner
            onScan={(detectedCodes) => {
              if (detectedCodes && detectedCodes.length > 0 && detectedCodes[0]?.rawValue) {
                onScan(detectedCodes[0].rawValue);
              }
            }}
            startTimeoutMs={30000}
            formats={['qr_code']}
            components={{}}
            constraints={{ facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }}
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
          onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
          className="absolute top-3 right-3 z-20 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md p-2 rounded-full transition-colors"
          title="تبديل الكاميرا"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>
      <p className="text-slate-300 mt-6 text-sm text-center font-medium">
        قم بتوجيه الكاميرا نحو رمز QR الخاص بالطالب
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
        onClick={onClose}
      >
        إلغاء المسح
      </Button>
    </div>
  );
}
