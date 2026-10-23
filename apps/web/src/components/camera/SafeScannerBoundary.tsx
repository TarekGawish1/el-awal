'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Camera, RefreshCw, AlertTriangle, CreditCard, Upload } from 'lucide-react';

export interface SafeScannerBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  onSwitchToManual?: () => void;
  onPickImage?: () => void;
  fallbackMessage?: string;
}

interface SafeScannerBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches camera or scanner chunk loading errors locally within the scanner viewport.
 * Prevents ChunkLoadError or camera initialization exceptions from bubbling up to
 * the global DashboardErrorBoundary and crashing the entire page.
 */
export class SafeScannerBoundary extends Component<
  SafeScannerBoundaryProps,
  SafeScannerBoundaryState
> {
  constructor(props: SafeScannerBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SafeScannerBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[SafeScannerBoundary] Scanner failed to render:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('failed to fetch');

      return (
        <div className="w-full h-full min-h-[220px] bg-slate-900/90 text-white flex flex-col items-center justify-center p-4 text-center rounded-2xl relative z-10 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
            {isChunkError ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <Camera className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1 max-w-[260px]">
            <p className="text-xs font-bold text-white">
              {isChunkError
                ? 'تعذر تشغيل الماسح في وضع عدم الاتصال'
                : 'حدث خطأ أثناء تشغيل كاميرا الماسح'}
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {this.props.fallbackMessage ||
                (isChunkError
                  ? 'يمكنك التبديل إلى الرصد اليدوي لتسجيل البيانات محلياً بدون إنترنت.'
                  : 'يرجى إعادة المحاولة أو التحويل للرصد اليدوي.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>

            {this.props.onSwitchToManual && (
              <button
                type="button"
                onClick={this.props.onSwitchToManual}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>الرصد اليدوي</span>
              </button>
            )}

            {this.props.onPickImage && (
              <button
                type="button"
                onClick={this.props.onPickImage}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>مسح من صورة</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
