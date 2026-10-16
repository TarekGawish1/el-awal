'use client';

import React from 'react';
import Link from 'next/link';
import { CookieConsentSettingsTrigger } from '@/components/analytics/CookieConsentBanner';

export function FooterSection() {
  const policyLinkClass =
    "inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-slate-900/70 border border-slate-800 text-[13px] leading-none text-slate-300 hover:text-white hover:border-blue-500/50 hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 min-h-[44px] sm:min-h-0 sm:py-2";
  return (
    <footer
      className="bg-slate-950 text-slate-300 pt-10 pb-8 sm:pt-12 sm:pb-10 border-t border-slate-800"
      dir="rtl"
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
        {/* Policies */}
        <h3 className="text-sm font-bold text-white tracking-wide">
          السياسات والامتثال
        </h3>
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-1 w-10 rounded-full bg-blue-600"
        />
        <nav
          aria-label="روابط السياسات"
          className="mt-6 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-2.5 sm:gap-3"
        >
          <Link href="/terms" className={policyLinkClass}>
            شروط الاستخدام والخدمة
          </Link>
          <Link href="/privacy" className={policyLinkClass}>
            سياسة الخصوصية وحماية البيانات
          </Link>
          <Link href="/refund" className={policyLinkClass}>
            سياسة الاسترداد والإلغاء
          </Link>
          <Link href="/cookies" className={policyLinkClass}>
            سياسة ملفات تعريف الارتباط
          </Link>
        </nav>
        <div className="mt-4 flex justify-center">
          <CookieConsentSettingsTrigger className="inline-flex items-center justify-center min-h-[44px] sm:min-h-0 px-3 py-2 text-xs text-slate-400 hover:text-amber-300 transition-colors underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-full" />
        </div>

        {/* Bottom Bar: Copyright & Social */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col items-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <a
              href="https://www.facebook.com/ahmd.ghryb.abw.asm"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="صفحة الأستاذ أحمد غريب على فيسبوك"
              className="inline-flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-full bg-slate-900/70 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-blue-500/50 hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 min-h-[44px] sm:min-h-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="shrink-0"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>فيسبوك</span>
            </a>
            <a
              href="https://www.youtube.com/@zaker_maths"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="قناة الأستاذ أحمد غريب على يوتيوب"
              className="inline-flex items-center gap-2 px-4 py-2.5 sm:py-2 rounded-full bg-slate-900/70 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-red-500/50 hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 min-h-[44px] sm:min-h-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="shrink-0"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span>يوتيوب</span>
            </a>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md">
            جميع الحقوق محفوظة © {new Date().getFullYear()} لمنصة الأول
            التعليمية (أستاذ أحمد غريب).
          </p>
          <p className="text-[11px] text-slate-600">
            تم التطوير بواسطة شركة{" "}
            <span className="font-bold text-slate-300 tracking-wider">
              TADX
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}