'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Cookie, Shield, Check, X, Sliders, ChevronDown } from 'lucide-react';
import {
  getStoredConsent,
  saveConsent,
  COOKIE_SETTINGS_OPEN_EVENT,
  triggerOpenCookieSettings,
  CookieConsentState,
} from '@/lib/consent/cookie-consent';

export function CookieConsentSettingsTrigger({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => triggerOpenCookieSettings()}
      className={className || 'text-xs text-slate-400 hover:text-blue-400 transition-colors underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1'}
      aria-label="تعديل تفضيلات ملفات تعريف الارتباط"
    >
      {children || 'إعدادات ملفات تعريف الارتباط'}
    </button>
  );
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [marketingAllowed, setMarketingAllowed] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Check if user already made a decision
    const existing = getStoredConsent();
    if (!existing) {
      // Delay slightly so it doesn't jarringly pop during initial paint
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      setAnalyticsAllowed(existing.analytics);
      setMarketingAllowed(existing.marketing);
    }
  }, []);

  // Listen for open settings event (e.g. from footer or cookies page)
  useEffect(() => {
    const handleOpenSettings = () => {
      const current = getStoredConsent();
      if (current) {
        setAnalyticsAllowed(current.analytics);
        setMarketingAllowed(current.marketing);
      }
      setIsModalOpen(true);
      setIsVisible(true);
    };

    window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, handleOpenSettings);
    return () => window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, handleOpenSettings);
  }, []);

  // Handle ESC key to close modal if open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleAcceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
    setAnalyticsAllowed(true);
    setMarketingAllowed(true);
    setIsVisible(false);
    setIsModalOpen(false);
  };

  const handleRejectOptional = () => {
    saveConsent({ analytics: false, marketing: false });
    setAnalyticsAllowed(false);
    setMarketingAllowed(false);
    setIsVisible(false);
    setIsModalOpen(false);
  };

  const handleSaveCustom = () => {
    saveConsent({ analytics: analyticsAllowed, marketing: marketingAllowed });
    setIsVisible(false);
    setIsModalOpen(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 1. Subtle Fixed Bottom Banner (Initial view if settings modal isn't open) */}
      {!isModalOpen && (
        <aside
          role="region"
          aria-label="إشعار ملفات تعريف الارتباط والخصوصية"
          dir="rtl"
          className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-100 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        >
          <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 max-w-3xl">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-right">
                <h2 className="text-sm font-bold text-white">إشعار ملفات تعريف الارتباط والخصوصية</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  نحن نستخدم ملفات تعريف ارتباط أساسية لتشغيل المنصة، وملفات تحليلية اختيارية (مثل Microsoft Clarity) لتحسين تجربة التصفح وحل المشاكل الفنية. يمكنك قبول الجميع، أو رفض الأدوات الاختيارية، أو تخصيص خياراتك وفقاً لما يناسبك. لمزيد من التفاصيل، راجع{' '}
                  <Link href="/cookies" className="text-blue-400 hover:underline font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded">
                    سياسة الكوكيز
                  </Link>{' '}
                  و{' '}
                  <Link href="/privacy" className="text-blue-400 hover:underline font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded">
                    سياسة الخصوصية
                  </Link>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end w-full md:w-auto">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="تخصيص خيارات ملفات تعريف الارتباط"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>تخصيص الخيارات</span>
              </button>

              <button
                type="button"
                onClick={handleRejectOptional}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="رفض ملفات تعريف الارتباط الاختيارية والتحليلات"
              >
                رفض غير الضروري
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label="قبول جميع ملفات تعريف الارتباط"
              >
                قبول الكل
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Granular Settings Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
          aria-describedby="cookie-modal-description"
          dir="rtl"
        >
          <div
            ref={modalRef}
            className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-right animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 id="cookie-modal-title" className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>تخصيص تفضيلات الخصوصية والكوكيز</span>
                </h2>
                <p id="cookie-modal-description" className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  حدد الأدوات التي ترغب في السماح بها لتعزيز تجربتك على المنصة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="إغلاق نافذة إعدادات الكوكيز"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Granular Toggles */}
            <div className="space-y-4">
              {/* Category 1: Essential */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">الملفات الضرورية للتشغيل</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">تأمين الجلسة، الحضور عبر QR، وحماية الحساب</p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    مفعلة دائماً
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  هذه الملفات إجبارية لتشغيل الخدمات الأساسية، مثل حفظ كود الطالب وحالة تسجيل الدخول، ولا يمكن تعطيلها.
                </p>
              </div>

              {/* Category 2: Analytics */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">ملفات التحليلات والأداء (Microsoft Clarity)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">قياس تفاعل المستخدم وتشخيص المشاكل الفنية</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsAllowed}
                      onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                      className="sr-only peer"
                      aria-label="تفعيل أو تعطيل تحليلات الأداء وMicrosoft Clarity"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  تساعدنا هذه التحليلات على معرفة الصفحات التي تواجه بطئاً أو أعطالاً لدى الطلاب لتحسين سرعة المنصة. لا نجمع أي بيانات حساسة أو نصوص لكلمات المرور.
                </p>
              </div>

              {/* Category 3: Marketing */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">ملفات التسويق والوسائط الخارجية</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">تخصيص الحملات الترويجية ومحتوى منصات التواصل</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingAllowed}
                      onChange={(e) => setMarketingAllowed(e.target.checked)}
                      className="sr-only peer"
                      aria-label="تفعيل أو تعطيل ملفات التسويق والوسائط الخارجية"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  تُستخدم لعرض فيديوهات ترويجية أو ربط صفحاتنا على وسائل التواصل الاجتماعي (مثل فيسبوك).
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleRejectOptional}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                رفض غير الضروري
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                حفظ تفضيلاتي
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                قبول الكل
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
