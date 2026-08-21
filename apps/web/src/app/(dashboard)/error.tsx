'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard Route Error caught by ErrorBoundary:', error);
  }, [error]);

  const isChunkError = error?.name === 'ChunkLoadError' || error?.message?.includes('Loading chunk');

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-neutral-200 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-neutral-900">
            {isChunkError ? 'تعذر تحميل جزء من الصفحة أثناء وضع العمل بدون إنترنت' : 'حدث خطأ غير متوقع'}
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {isChunkError
              ? 'يمكنك إعادة المحاولة أو العودة للرئيسية لمتابعة العمل على البيانات المحفوظة محلياً.'
              : error?.message || 'يرجى المحاولة مرة أخرى أو العودة إلى لوحة التحكم الرئيسية.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>

          <Link
            href="/teacher/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
