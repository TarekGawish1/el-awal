'use client';

import React, { useState, useEffect } from 'react';
import { useBootstrapSync } from '@/lib/offline/useBootstrapSync';
import { CloudDownload, CheckCircle2, X } from 'lucide-react';

export function BootstrapProgressIndicator() {
  const { isBootstrapping, percentage, message } = useBootstrapSync(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isBootstrapping) {
      setVisible(true);
    } else if (percentage === 100) {
      // Keep completed message briefly visible before fading out
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isBootstrapping, percentage]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/60 backdrop-blur-md flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary-600/30 text-primary-400 shrink-0">
          {percentage === 100 ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <CloudDownload className="w-5 h-5 animate-pulse text-sky-400" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">
              {percentage === 100 ? 'جاهز للعمل بدون إنترنت' : 'تجهيز مساحة العمل المحلية'}
            </span>
            <span className="font-mono text-primary-300 font-bold">{percentage}%</span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-400 to-primary-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
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
