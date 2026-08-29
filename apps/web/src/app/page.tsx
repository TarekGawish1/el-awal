'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

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
            <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-1 inline-block">
              ابدأ التعلم الآن
            </Link>
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

const COURSES = [
  {
    id: 1,
    title: 'الصف الأول الثانوي',
    description: 'شرح مبسط ومفصل لمنهج الرياضيات للصف الأول الثانوي مع تدريبات مكثفة وتطبيقات على النظام الجديد.',
    badge: 'ترم أول',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 2,
    title: 'الصف الثاني الثانوي',
    description: 'تأسيس قوي في التفاضل وحساب المثلثات والجبر مع حل أسئلة بنك المعرفة وامتحانات سابقة.',
    badge: 'ترم أول',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    id: 3,
    title: 'الصف الثالث الثانوي',
    description: 'مراجعات نهائية وتدريبات متقدمة للثانوية العامة تضمن لك الدرجة النهائية في جميع فروع الرياضيات.',
    badge: 'علمي رياضة',
    color: 'from-emerald-500 to-teal-500'
  }
];

function CoursesSection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden" id="courses" dir="rtl">
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute -top-[10%] right-[10%] w-[30%] h-[40%] rounded-full bg-blue-50 blur-[100px]" />
        <div className="absolute bottom-[10%] -left-[5%] w-[40%] h-[30%] rounded-full bg-indigo-50 blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              اكتشف <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">كورساتنا</span>
            </h2>
            <p className="text-slate-600 text-lg font-medium">
              اختر المرحلة الدراسية الخاصة بك وابدأ رحلة التفوق مع أقوى محتوى تعليمي في الرياضيات.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {COURSES.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all overflow-hidden flex flex-col"
            >
              {/* Image/Gradient Area */}
              <div className={`h-48 w-full bg-gradient-to-br ${course.color} relative overflow-hidden flex items-start justify-start p-6`}>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="relative z-10 bg-white/25 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-bold shadow-sm self-start">
                  {course.badge}
                </div>
                {/* Decorative Math Icon */}
                <div className="absolute -bottom-6 -left-6 text-white/20 text-9xl font-black -rotate-12 pointer-events-none">
                  {index === 0 ? '∑' : index === 1 ? '∫' : '∞'}
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col bg-white">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{course.title}</h3>
                <p className="text-slate-600 text-base leading-relaxed mb-6 flex-1">
                  {course.description}
                </p>
                
                <Link href="/login" className="mt-auto hover:bg-blue-50 flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-slate-100 text-slate-700 font-bold transition-colors group-hover:border-blue-100">
                  <span>اشترك الآن</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180 text-blue-600 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CenterScheduleSection() {
  const [selectedGrade, setSelectedGrade] = useState('grade-1');

  const SCHEDULE_DATA: Record<string, { center: string, days: string, time: string }[]> = {
    'grade-1': [
      { center: 'سنتر الأوائل - مدينة نصر', days: 'السبت والثلاثاء', time: '4:00 عصراً' },
      { center: 'سنتر القمة - مصر الجديدة', days: 'الأحد والأربعاء', time: '6:00 مساءً' },
    ],
    'grade-2': [
      { center: 'سنتر الأوائل - مدينة نصر', days: 'السبت والثلاثاء', time: '6:00 مساءً' },
      { center: 'سنتر الفرسان - المعادي', days: 'الإثنين والخميس', time: '5:00 عصراً' },
    ],
    'grade-3': [
      { center: 'سنتر الأوائل - مدينة نصر', days: 'الجمعة', time: '9:00 صباحاً (مكثف)' },
      { center: 'سنتر القمة - مصر الجديدة', days: 'الأحد والأربعاء', time: '8:00 مساءً' },
    ],
  };

  const GRADES = [
    { id: 'grade-1', name: 'الصف الأول الثانوي' },
    { id: 'grade-2', name: 'الصف الثاني الثانوي' },
    { id: 'grade-3', name: 'الصف الثالث الثانوي' },
  ];

  const currentSchedules = SCHEDULE_DATA[selectedGrade] || [];

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden" id="schedule" dir="rtl">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              مواعيد <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">السنتر</span>
            </h2>
            <p className="text-slate-600 text-lg font-medium">
              اختر الصف الدراسي لمعرفة مواعيد وأماكن المحاضرات الحضورية (الأوفلاين) المتاحة.
            </p>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          {/* Tabs */}
          <div className="flex flex-wrap border-b border-slate-100 bg-slate-50/50 p-2 sm:p-4 gap-2 justify-center">
            {GRADES.map((grade) => (
              <button
                key={grade.id}
                onClick={() => setSelectedGrade(grade.id)}
                className={`px-6 py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${
                  selectedGrade === grade.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-105'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {grade.name}
              </button>
            ))}
          </div>

          {/* Schedule List */}
          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedGrade}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {currentSchedules.map((item, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:shadow-lg hover:border-blue-100 transition-all group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-slate-900 mb-4">{item.center}</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-slate-600 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {item.days}
                          </div>
                          <div className="flex items-center gap-3 text-slate-600 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {item.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
            
            <div className="mt-10 text-center">
              <Link href="/login" className="bg-slate-900 hover:bg-blue-600 text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg shadow-slate-900/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-1 inline-flex items-center justify-center gap-3 w-full sm:w-auto">
                <span>احجز مكانك الآن</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
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
          <CoursesSection />
          <CenterScheduleSection />
        </motion.div>
      )}
    </main>
  );
}
