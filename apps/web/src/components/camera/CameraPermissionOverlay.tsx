'use client';

import React from 'react';
import { Camera, HelpCircle, Lock, RefreshCcw, Upload } from 'lucide-react';

export interface CameraPermissionOverlayProps {
  error: string | null;
  isRequesting: boolean;
  onRequestPermission: () => void;
  onOpenGuide: () => void;
  onRetry?: () => void;
  onUploadImage?: () => void;
}

export function CameraPermissionOverlay({
  error,
  isRequesting,
  onRequestPermission,
  onOpenGuide,
  onRetry,
  onUploadImage,
}: CameraPermissionOverlayProps) {
  if (!error) return null;

  const isPermissionDenied =
    error.includes('صلاحية') ||
    error.includes('إذن') ||
    error.includes('Permission') ||
    error.includes('NotAllowed');

  const isHttpsIssue =
    error.includes('HTTPS') ||
    error.includes('secure context') ||
    error.includes('آمن');

  return (
    <div
      className="absolute inset-0 z-30 bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-2">
        {isHttpsIssue ? (
          <Lock className="w-5 h-5 text-amber-400" />
        ) : (
          <Camera className="w-5 h-5 text-rose-400" />
        )}
      </div>

      <h3 className="text-white font-bold text-xs sm:text-sm mb-1">
        {isHttpsIssue
          ? 'مطلوب اتصال آمن (HTTPS)'
          : isPermissionDenied
          ? 'الكاميرا بحاجة إلى إذن التشغيل'
          : 'تعذر تشغيل الكاميرا'}
      </h3>

      <p className="text-slate-300 text-[11px] max-w-[220px] mb-3 leading-relaxed">
        {isHttpsIssue
          ? 'تتطلب متصفحات الهواتف اتصالاً مشفراً (HTTPS) لتشغيل الكاميرا.'
          : isPermissionDenied
          ? 'اضغط لمنح المتصفح إذن الكاميرا ومسح الـ QR.'
          : error}
      </p>

      <div className="flex flex-col gap-1.5 w-full max-w-[220px]">
        {/* Primary Action: Request Permission */}
        {!isHttpsIssue && (
          <button
            type="button"
            onClick={onRequestPermission}
            disabled={isRequesting}
            className="w-full py-2 px-3 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-600 active:bg-primary-700 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isRequesting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري طلب الإذن...</span>
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" />
                <span>منح إذن الكاميرا الآن</span>
              </>
            )}
          </button>
        )}

        {/* Secondary Action: Guide Modal */}
        {isPermissionDenied && (
          <button
            type="button"
            onClick={onOpenGuide}
            className="w-full py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3 h-3 text-primary-300" />
            <span>كيف أفعّل الإذن من المتصفح؟</span>
          </button>
        )}

        {/* Alternative: Image File Upload */}
        {onUploadImage && (
          <button
            type="button"
            onClick={onUploadImage}
            className="w-full py-1.5 px-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-semibold text-[11px] rounded-xl transition-colors border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3 h-3 text-emerald-400" />
            <span>مسح من صورة QR 🖼️</span>
          </button>
        )}

        {/* Retry / Switch */}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full py-1 text-slate-400 hover:text-white font-medium text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <RefreshCcw className="w-2.5 h-2.5" />
            <span>إعادة المحاولة</span>
          </button>
        )}
      </div>
    </div>
  );
}
