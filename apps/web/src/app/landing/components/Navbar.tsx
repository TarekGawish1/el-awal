'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { getRoleLandingRoute } from '@/features/auth/utils/role-routing';

export function Navbar() {
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsLoginDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsLoginDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between">
      {/* Glass Background */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[98%] 2xl:max-w-[1880px] mx-auto flex items-center justify-between px-2 sm:px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" />
            </svg>
          </div>
          <span className="text-2xl font-black text-slate-800 tracking-tight">
            الأول
          </span>
        </div>

        {/* Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-blue-600 font-bold transition-colors"
          >
            الرئيسية
          </a>
          <a
            href="#courses"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById('courses')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-slate-600 font-medium hover:text-blue-600 transition-colors"
          >
            الكورسات
          </a>
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById('about')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-slate-600 font-medium hover:text-blue-600 transition-colors"
          >
            من نحن
          </a>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById('contact')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-slate-600 font-medium hover:text-blue-600 transition-colors"
          >
            تواصل معنا
          </a>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isInitialized && isAuthenticated && user ? (
            <Link
              href={getRoleLandingRoute(user.role)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 active:scale-95"
            >
              <span>
                لوحة التحكم (
                {user.fullName ? user.fullName.split(' ')[0] : 'حسابي'})
              </span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </Link>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
                aria-haspopup="menu"
                aria-expanded={isLoginDropdownOpen}
                aria-label="قائمة تسجيل الدخول"
                className="text-slate-700 font-bold hover:text-slate-900 transition-colors px-2 sm:px-4 py-2 flex items-center gap-1 text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              >
                تسجيل الدخول
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform duration-200 ${isLoginDropdownOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <AnimatePresence>
                {isLoginDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden"
                  >
                    <div className="py-1">
                      <Link
                        href="/login"
                        className="block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      >
                        دخول كطالب
                      </Link>
                      <Link
                        href="/login"
                        className="block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      >
                        دخول كمدرس / مساعد
                      </Link>
                      <Link
                        href="/parent-access"
                        className="block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors border-t border-slate-100"
                      >
                        دخول كولي أمر
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
