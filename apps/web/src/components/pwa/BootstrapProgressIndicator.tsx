'use client';

import React, { useState, useEffect } from 'react';
import { useBootstrapSync } from '@/lib/offline/useBootstrapSync';
import { CloudDownload, CheckCircle2, AlertCircle, X } from 'lucide-react';

export function BootstrapProgressIndicator() {
  const { isBootstrapping, percentage, message } = useBootstrapSync(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isBootstrapping) {
      setVisible(true);
    } else if (visible) {
      // Fade out after completion (success or error/fallback)
      const timer = setTimeout(() => {
        setVisible(false);
      }, percentage === 100 ? 3000 : 4000);
      return () => clearTimeout(timer);
    }
  }, [isBootstrapping, percentage, visible]);

  if (!visible) return null;

  const isSuccess = percentage === 100;
  const isError = !isBootstrapping && percentage === 0;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/60 backdrop-blur-md flex items-center gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${
          isSuccess 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : isError 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'bg-primary-600/30 text-primary-400'
        }`}>
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-amber-400" />
          ) : (
            <CloudDownload className="w-5 h-5 animate-pulse text-sky-400" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">
              {isSuccess
                ? 'جاهز للعمل بدون إنترنت'
                : isError
                  ? 'اكتمل التجهيز بالبيانات المحلية'
                  : 'تجهيز مساحة العمل المحلية'}
            </span>
            <span className="font-mono text-primary-300 font-bold">
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

          <p className="text-[11px] text-slate-400 truncate">{message}</p>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
