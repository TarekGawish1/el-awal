'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useBootstrapSync } from '@/lib/offline/useBootstrapSync';
import { CloudDownload, CheckCircle2, AlertCircle, X } from 'lucide-react';

export function BootstrapProgressIndicator() {
  const { isBootstrapping, percentage, message, lastEvent } = useBootstrapSync(true);
  const [visible, setVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger visibility when bootstrapping is active or completes
  useEffect(() => {
    if (isDismissed) {
      setVisible(false);
      return;
    }

    if (isBootstrapping) {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
      setVisible(true);
      return;
    }

    const isComplete =
      lastEvent?.type === 'SUCCESS' ||
      lastEvent?.type === 'OFFLINE_FALLBACK' ||
      lastEvent?.type === 'ERROR' ||
      percentage === 100;

    if (isComplete) {
      setVisible(true);
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      autoHideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 3500);
    }

    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, [isBootstrapping, lastEvent, percentage, isDismissed]);

  // When a new bootstrap starts, reset dismissed state
  useEffect(() => {
    if (isBootstrapping) {
      setIsDismissed(false);
    }
  }, [isBootstrapping]);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    setIsDismissed(true);
    setVisible(false);
  };

  if (!visible || isDismissed) return null;

  const isSuccess = percentage === 100 || lastEvent?.type === 'SUCCESS';
  const isError = (!isBootstrapping && percentage === 0) || lastEvent?.type === 'ERROR';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 max-w-sm w-auto animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto select-none"
    >
      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/70 backdrop-blur-md flex items-center gap-3">
        <div
          className={`p-2 rounded-xl shrink-0 ${
            isSuccess
              ? 'bg-emerald-500/20 text-emerald-400'
              : isError
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-primary-600/30 text-primary-400'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-amber-400" />
          ) : (
            <CloudDownload className="w-5 h-5 animate-pulse text-sky-400" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between text-xs gap-3">
            <span className="font-semibold text-slate-200 truncate">
              {isSuccess
                ? 'جاهز للعمل بدون إنترنت'
                : isError
                  ? 'اكتمل التجهيز بالبيانات المحلية'
                  : 'تجهيز مساحة العمل المحلية'}
            </span>
            <span className="font-mono text-primary-300 font-bold shrink-0">
              {isError ? '100%' : `${percentage}%`}
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isSuccess
                  ? 'bg-emerald-500'
                  : isError
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-sky-400 to-primary-500'
              }`}
              style={{ width: `${isError ? 100 : percentage}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 truncate">
            {message || (isSuccess ? 'تم تجهيز مساحة العمل بنجاح' : 'جاري التحميل...')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 active:bg-slate-700 active:scale-95 transition-all cursor-pointer shrink-0"
          title="إغلاق الإشعار"
          aria-label="إغلاق الإشعار"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

