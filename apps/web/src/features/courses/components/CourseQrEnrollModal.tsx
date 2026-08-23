'use client';

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, QrCode, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useEnrollByQrToken } from '../hooks/useCourses';
import toast from 'react-hot-toast';

interface CourseQrEnrollModalProps {
  isOpen: boolean;
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

export function CourseQrEnrollModal({
  isOpen,
  courseId,
  courseTitle,
  onClose,
}: CourseQrEnrollModalProps) {
  const enrollMutation = useEnrollByQrToken(courseId);
  const [scannedStudent, setScannedStudent] = useState<any | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);

  if (!isOpen) return null;

  // Synthesize pleasant audio confirmation on successful scan
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore audio error if not supported
    }
  };

  const handleScan = async (detectedCodes: any[]) => {
    if (scanCooldown || enrollMutation.isPending || !detectedCodes || detectedCodes.length === 0) {
      return;
    }

    const rawValue = detectedCodes[0]?.rawValue?.trim();
    if (!rawValue) return;

    setScanCooldown(true);

    try {
      const result = await enrollMutation.mutateAsync(rawValue);
      playSuccessChime();
      setScannedStudent(result.student);
    } catch {
      // Error handled by mutation
    } finally {
      setTimeout(() => setScanCooldown(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">مسح QR الطالب للضم الفوري</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            وجه كاميرا الجهاز نحو بطاقة QR الخاصة بالطالب لتفعيله فورياً في هذا الكورس
          </p>

          {/* Scanner Viewport */}
          <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-3xl overflow-hidden border-2 border-blue-500 bg-black shadow-inner">
            <Scanner
              onScan={handleScan}
              styles={{
                container: { width: '100%', height: '100%' },
                video: { width: '100%', height: '100%', objectFit: 'cover' },
              }}
            />

            {/* Target Reticle Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-blue-400 rounded-2xl border-dashed animate-pulse" />
            </div>

            {enrollMutation.isPending && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="text-xs font-bold">جاري التحقق والضم...</span>
              </div>
            )}
          </div>

          {/* Success Banner */}
          {scannedStudent && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-right animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>تم تفعيل الاشتراك بنجاح!</span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-white">{scannedStudent.fullName}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                كود الطالب: {scannedStudent.studentCode} • {scannedStudent.phone}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/80 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
