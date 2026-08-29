'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function IntroSequence({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1300); // Reduced duration further
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0f1c] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]" dir="rtl"
      initial={{ y: "0%" }}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* Background Cinematic Effects */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#0a0f1c] to-[#0a0f1c]"></div>

      {/* Subtle Grid or Stars effect */}
      <motion.div
        className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 1 }}
      />

      <div className="z-10 text-center px-4 flex flex-col items-center">
        {/* Logo/Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
          className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(37,99,235,0.5)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-2xl">
            منصة <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">الأول</span> التعليمية
          </h1>
        </motion.div>
      </div>

      {/* Cinematic subtle light at the bottom */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full md:w-3/4 h-32 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
    </motion.div>
  );
}

function Navbar() {
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLoginDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between"
    >
      {/* Glass Background */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm" />

      {/* Content */}
      <div className="relative z-10 container mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" />
            </svg>
          </div>
          <span className="text-2xl font-black text-slate-800 tracking-tight">
            الأول
          </span>
        </div>

        {/* Links (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-blue-600 font-bold transition-colors">الرئيسية</a>
          <a href="#" className="text-slate-600 font-medium hover:text-blue-600 transition-colors">الكورسات</a>
          <a href="#" className="text-slate-600 font-medium hover:text-blue-600 transition-colors">من نحن</a>
          <a href="#" className="text-slate-600 font-medium hover:text-blue-600 transition-colors">تواصل معنا</a>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
              className="text-slate-600 font-bold hover:text-slate-900 transition-colors px-2 sm:px-4 py-2 flex items-center gap-1 text-sm sm:text-base"
            >
              تسجيل الدخول
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${isLoginDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            <AnimatePresence>
              {isLoginDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden"
                >
                  <div className="py-1">
                    <a href="/login" className="block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                      دخول كطالب
                    </a>
                    <a href="/login" className="block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                      دخول كمدرس
                    </a>
                    <a href="/parent-access" className="block px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors border-t border-slate-100">
                      دخول كولي أمر
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a href="/register/student" className="bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 text-sm sm:text-base">
            إنشاء حساب
          </a>
        </div>
      </div>
    </motion.nav>
  );
}

function HeroImageSequence() {
  const [frameIndex, setFrameIndex] = useState(0);
  const totalFrames = 22;

  useEffect(() => {
    // Preload images to avoid flickering
    for (let i = 0; i < totalFrames; i++) {
      const img = new Image();
      img.src = `/hero-animation/frame_${String(i).padStart(6, '0')}.webp`;
    }
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % totalFrames);
    }, 150); // ~6.6 FPS for an even slower animation
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="absolute inset-0 z-0 opacity-10">
      <img
        src={`/hero-animation/frame_${String(frameIndex).padStart(6, '0')}.webp`}
        alt="خلفية متحركة"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function HeroSection() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden" dir="rtl">
      <HeroImageSequence />
      <Navbar />

      {/* Background decorations for a Math theme */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-[100px]" />
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-200/40 blur-[120px]" />

      </div>

      <div className="flex-1 relative z-10 container mx-auto px-6 pt-32 pb-16 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">

        {/* Right side: Teacher Image */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full lg:w-1/2 flex justify-center lg:justify-end relative"
        >
          <div className="relative w-full max-w-[350px] lg:max-w-[500px] h-[350px] lg:h-[500px] flex items-end justify-center mt-10 lg:mt-0">

            {/* The Cutout Image with Bottom Fade */}
            <div
              className="relative w-full h-full z-10 flex items-end justify-center"
              style={{
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)'
              }}
            >
              <img
                src="/teacherPhoto.webp"
                alt="صورة الأستاذ"
                className="w-full h-full object-cover object-top drop-shadow-2xl rounded-t-[3rem]"
              />
            </div>
          </div>
        </motion.div>

        {/* Left side: Text & CTA */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-right"
        >
          <h1 className="flex flex-col gap-4 text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 mb-8 leading-normal">
            <span className="text-blue-600">
              ألاستاذ/ أحمد غريب
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 mb-12 leading-loose max-w-lg font-medium">
            منهجية مبسطة وتدريبات مكثفة تضمن لك التفوق وفهم الرياضيات بكل سهولة. انضم الآن.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 w-full">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-1">
              ابدأ التعلم الآن
            </button>
            <button className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              شاهد الفيديوهات المجانية
            </button>
          </div>

          <div className="mt-14 flex flex-wrap justify-center lg:justify-start items-center gap-8 text-slate-500">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-lg">شرح مبسط</span>
            </div>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-lg">متابعة مستمرة</span>
            </div>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-lg">بنك أسئلة</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

export default function RootPage() {
  const [showIntro, setShowIntro] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="min-h-screen bg-[#0a0f1c]" />;

  return (
    <main>
      <AnimatePresence mode="wait">
        {showIntro && (
          <IntroSequence key="intro" onComplete={() => setShowIntro(false)} />
        )}
      </AnimatePresence>

      {!showIntro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <HeroSection />
        </motion.div>
      )}
    </main>
  );
}
