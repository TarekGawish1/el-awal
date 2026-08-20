'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if app is already running in standalone mode (installed PWA)
    const isStandaloneMode =
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)')?.matches) ||
      (typeof window.navigator !== 'undefined' && (window.navigator as unknown as { standalone?: boolean })?.standalone === true);

    setIsStandalone(Boolean(isStandaloneMode));
    if (isStandaloneMode) {
      return;
    }

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = isAppleDevice && /safari/.test(userAgent) && !/crios|fxios|opios|mercury/.test(userAgent);
    setIsIOS(isSafari);

    // Check if dismissed recently (within 3 days)
    const dismissedAt = localStorage.getItem('el_awal_pwa_dismissed');
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const isDismissedRecently = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < threeDaysMs;

    // Listen for Chrome/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissedRecently) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show iOS prompt if on iOS Safari and not dismissed recently
    if (isSafari && !isDismissedRecently) {
      // Delay slightly for smooth page entry
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // Listen for custom trigger from any button in the app
    const handleCustomOpen = () => {
      setIsVisible(true);
      if (isSafari) {
        setShowIOSGuide(true);
      }
    };

    window.addEventListener('show-pwa-install-prompt', handleCustomOpen);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('show-pwa-install-prompt', handleCustomOpen);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIOSGuide(false);
    localStorage.setItem('el_awal_pwa_dismissed', Date.now().toString());
  };

  if (isStandalone || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Mobile Floating Bottom Install Prompt */}
      <aside
        aria-label="تثبيت تطبيق منصة الأول"
        className="fixed bottom-4 start-4 end-4 md:start-auto md:end-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="bg-white/95 backdrop-blur-md border border-primary-200/80 rounded-2xl p-4 shadow-xl shadow-primary-950/10 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-md shadow-primary-500/20 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="text-start">
                <h3 className="font-bold text-neutral-900 text-sm leading-snug">
                  تطبيق منصة الأول التعليمية
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  ثبّت التطبيق على هاتفك للوصول السريع بدون متصفح وتجربة أسرع
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
              aria-label="إغلاق الإشعار"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-neutral-100">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تثبيت التطبيق الآن</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-neutral-500 hover:text-neutral-800 px-3 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors font-medium"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Step-by-Step Installation Modal Guide */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Smartphone className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-900">
                تثبيت التطبيق على هاتف iPhone
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                اتبع الخطوات البسيطة التالية لإضافة المنصة لشاشتك الرئيسية:
              </p>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-4 space-y-3.5 text-start text-xs text-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="flex items-center gap-1.5">
                  <span>اضغط على زر المشاركة</span>
                  <span className="p-1 bg-white border border-neutral-200 rounded text-neutral-800 inline-flex">
                    <Share className="w-3.5 h-3.5" />
                  </span>
                  <span>في أسفل Safari</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="flex items-center gap-1.5">
                  <span>اختر</span>
                  <span className="font-semibold text-neutral-900 flex items-center gap-1">
                    <PlusSquare className="w-3.5 h-3.5 text-primary-600 inline" />
                    «إضافة إلى الصفحة الرئيسية»
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="flex items-center gap-1.5">
                  <span>اضغط على</span>
                  <span className="font-bold text-primary-700">«إضافة» (Add)</span>
                  <span>في أعلى اليمين</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all"
            >
              فهمت ذلك، تم
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Helper button component that can be placed in navbar/sidebar
 */
export function PwaInstallButton({ className = '' }: { className?: string }) {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandaloneMode =
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)')?.matches) ||
      (typeof window.navigator !== 'undefined' && (window.navigator as unknown as { standalone?: boolean })?.standalone === true);
    setIsStandalone(Boolean(isStandaloneMode));
  }, []);

  if (isStandalone) return null;

  return (
    <button
      onClick={() => {
        window.dispatchEvent(new Event('show-pwa-install-prompt'));
      }}
      className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors ${className}`}
      title="تثبيت التطبيق على الهاتف"
    >
      <Download className="w-4 h-4" />
      <span>تثبيت التطبيق</span>
    </button>
  );
}
