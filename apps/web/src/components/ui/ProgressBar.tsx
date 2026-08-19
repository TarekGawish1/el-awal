'use client';

import React from 'react';
import { Loader2, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  loadedBytes?: number;
  totalBytes?: number;
  stage?: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  statusMessage?: string;
  fileName?: string;
  fileType?: string;
  className?: string;
  showDetails?: boolean;
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function ProgressBar({
  progress,
  loadedBytes,
  totalBytes,
  stage = 'uploading',
  statusMessage,
  fileName,
  fileType,
  className = '',
  showDetails = true,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(Math.round(progress), 0), 100);
  const isComplete = clampedProgress >= 100 || stage === 'success';
  const isProcessing = stage === 'processing' || (clampedProgress >= 100 && stage !== 'success' && stage !== 'error');
  const isError = stage === 'error';

  const defaultMessage = isError
    ? 'حدث خطأ أثناء الرفع'
    : isComplete
    ? 'تم الرفع والمعالجة بنجاح!'
    : isProcessing
    ? 'جاري حفظ ومعالجة الملف على الخادم...'
    : `جاري رفع الملف... ${clampedProgress}%`;

  const displayMessage = statusMessage || defaultMessage;

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-300 border ${
        isError
          ? 'bg-rose-50/80 border-rose-200 text-rose-800'
          : isComplete
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
          : 'bg-slate-50/90 border-slate-200/80 text-slate-800'
      } ${className}`}
    >
      {/* Top Header info */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isError ? (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce" />
          ) : isProcessing ? (
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 animate-pulse" />
          ) : (
            <Loader2 className="w-4 h-4 text-primary-600 shrink-0 animate-spin" />
          )}

          <div className="truncate">
            <span className="text-xs font-bold block truncate">
              {fileName ? fileName : displayMessage}
            </span>
            {fileName && (
              <span className="text-[11px] font-medium opacity-75">
                {displayMessage}
              </span>
            )}
          </div>
        </div>

        {/* Percentage badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-xs font-black px-2 py-0.5 rounded-full border ${
              isError
                ? 'bg-rose-100 text-rose-700 border-rose-200'
                : isComplete
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-primary-50 text-primary-700 border-primary-200'
            }`}
          >
            {clampedProgress}%
          </span>
        </div>
      </div>

      {/* Outer Progress Track */}
      <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden p-0.5 shadow-inner relative">
        {/* Animated Inner Progress Bar */}
        <div
          className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
            isError
              ? 'bg-rose-500'
              : isComplete
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
              : 'bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-500'
          }`}
          style={{ width: `${clampedProgress}%` }}
        >
          {/* Shimmer light animation effect across bar */}
          {!isComplete && !isError && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite] -skew-x-12" />
          )}
        </div>
      </div>

      {/* Bottom Byte Counter & Stage metadata */}
      {showDetails && (
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mt-2 px-0.5">
          <div>
            {loadedBytes !== undefined && totalBytes !== undefined && totalBytes > 0 ? (
              <span>
                {formatBytes(loadedBytes)} / {formatBytes(totalBytes)}
              </span>
            ) : fileType ? (
              <span>{fileType}</span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            {isProcessing && !isComplete && (
              <span className="text-indigo-600 font-bold flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                معالجة...
              </span>
            )}
            {isComplete && (
              <span className="text-emerald-700 font-bold">اكتمل 100%</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
