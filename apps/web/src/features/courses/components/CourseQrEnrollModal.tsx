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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-900">مسح QR الطالب للضم الفوري</h2>
              <p className="text-xs text-slate-500 truncate max-w-xs">{courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-center bg-white">
          <p className="text-xs text-slate-600">
            وجه كاميرا الجهاز نحو بطاقة QR الخاصة بالطالب لتفعيله فورياً في هذا الكورس
          </p>

          {/* Scanner Viewport */}
          <div className="relative aspect-square w-full max-w-[260px] mx-auto rounded-2xl overflow-hidden border-2 border-primary-500 bg-black shadow-inner">
            <Scanner
              onScan={handleScan}
              startTimeoutMs={30000}
              formats={['qr_code']}
              styles={{
                container: { width: '100%', height: '100%' },
                video: { width: '100%', height: '100%', objectFit: 'cover' },
              }}
            />

            {enrollMutation.isPending && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                <span className="text-xs font-bold">جاري التحقق والاشتراك...</span>
              </div>
            )}
          </div>

          {/* Scanned Student Card */}
          {scannedStudent && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-right animate-in fade-in">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-emerald-950">تم تفعيل الاشتراك بنجاح!</p>
                <p className="text-xs font-bold text-emerald-950 truncate mt-0.5">{scannedStudent.fullName}</p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-700 mt-0.5">
                  <span className="font-mono">{scannedStudent.studentCode}</span>
                  <span>•</span>
                  <span>{scannedStudent.gradeLevel}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
