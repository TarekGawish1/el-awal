'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, Zap, Bell, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check standalone mode (already installed as PWA)
    const isStandaloneMode =
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)')?.matches) ||
      (typeof window.navigator !== 'undefined' && (window.navigator as unknown as { standalone?: boolean })?.standalone === true);

    setIsStandalone(Boolean(isStandaloneMode));
    if (isStandaloneMode) {
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = isAppleDevice && /safari/.test(ua) && !/crios|fxios|opios|mercury/.test(ua);
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth < 768;

    setIsIOS(isSafari);
    setIsMobile(isMobileDevice);

    // Check if dismissed recently (within 24 hours)
    const dismissedAt = localStorage.getItem('el_awal_pwa_dismissed');
    const dayMs = 24 * 60 * 60 * 1000;
    const isDismissedRecently = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < dayMs;

    // Listen for Chrome/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissedRecently) {
        setTimeout(() => setIsVisible(true), 1200);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If mobile Safari (or mobile browser where beforeinstallprompt doesn't fire immediately)
    if (isMobileDevice && !isDismissedRecently) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1800);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // Listen for custom trigger from anywhere in the app
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
    } else {
      // Fallback for Android Chrome when prompt already resolved or direct menu
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
        className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:left-4 z-50 max-w-sm rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 shadow-2xl border border-primary-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-5 duration-300 ring-1 ring-black/5"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/25 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="text-start">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-neutral-900 dark:text-slate-100 text-sm leading-snug">
                    تثبيت تطبيق منصة الأول
                  </h3>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary-50 text-primary-700 rounded-md border border-primary-200/60">
                    مجاني 📱
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  وصول أسرع بدون متصفح، إشعارات فورية وتجربة تطبيق سلسة
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label="إغلاق الإشعار"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-slate-800">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-primary-600 hover:bg-primary-700 active:scale-98 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-primary-600/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تثبيت التطبيق الآن</span>
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200 py-2.5 px-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors font-medium flex items-center justify-center cursor-pointer"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </aside>

      {/* Step-by-Step Installation Modal Guide (for iOS / Safari / Manual Add) */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-inner">
              <Smartphone className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-slate-100">
                {isIOS ? 'تثبيت التطبيق على هاتف iPhone' : 'إضافة التطبيق للشاشة الرئيسية'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                اتبع الخطوات البسيطة التالية لإضافة المنصة لشاشتك الرئيسية:
              </p>
            </div>

            <div className="bg-neutral-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-3.5 text-start text-xs text-neutral-700 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>اضغط على زر المشاركة أو القائمة</span>
                  <span className="p-1 bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded text-neutral-800 dark:text-slate-200 inline-flex">
                    <Share className="w-3.5 h-3.5" />
                  </span>
                  <span>{isIOS ? 'في شريط Safari' : 'في متصفحك'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>اختر</span>
                  <span className="font-semibold text-neutral-900 dark:text-slate-100 flex items-center gap-1">
                    <PlusSquare className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 inline" />
                    «إضافة إلى الشاشة الرئيسية»
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>اضغط على</span>
                  <span className="font-bold text-primary-700 dark:text-primary-400">«إضافة» (Add)</span>
                  <span>في أعلى الشاشة</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-primary-600/20"
            >
              فهمت ذلك، تم ✅
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
