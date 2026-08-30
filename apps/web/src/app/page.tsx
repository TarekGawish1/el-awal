'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

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
                src="/teacher-photo.webp"
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
              الاستاذ/ أحمد غريب
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

      {/* Smooth Bottom Transition to Courses Section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />
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
  const [selectedStage, setSelectedStage] = useState('secondary');
  const [selectedGrade, setSelectedGrade] = useState('الصف الأول الثانوي');
  const [schedulesMap, setSchedulesMap] = useState<Record<string, { center: string, days: string, time: string }[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const STAGES = [
    { id: 'primary', name: 'المرحلة الابتدائية' },
    { id: 'preparatory', name: 'المرحلة الإعدادية' },
    { id: 'secondary', name: 'المرحلة الثانوية' },
  ];

  const GRADES = {
    primary: [
      { id: 'الصف الرابع الابتدائي', name: 'الصف الرابع الابتدائي' },
      { id: 'الصف الخامس الابتدائي', name: 'الصف الخامس الابتدائي' },
      { id: 'الصف السادس الابتدائي', name: 'الصف السادس الابتدائي' },
    ],
    preparatory: [
      { id: 'الصف الأول الإعدادي', name: 'الصف الأول الإعدادي' },
      { id: 'الصف الثاني الإعدادي', name: 'الصف الثاني الإعدادي' },
      { id: 'الصف الثالث الإعدادي', name: 'الصف الثالث الإعدادي' },
    ],
    secondary: [
      { id: 'الصف الأول الثانوي', name: 'الصف الأول الثانوي' },
      { id: 'الصف الثاني الثانوي', name: 'الصف الثاني الثانوي' },
      { id: 'الصف الثالث الثانوي', name: 'الصف الثالث الثانوي' },
    ]
  };

  useEffect(() => {
    async function fetchSchedules() {
      try {
        setIsLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        const res = await fetch(`${baseUrl}/schedules/public/centers`);
        if (res.ok) {
           const data = await res.json();
           const newMap: Record<string, any[]> = {};
           data.forEach((item: any) => {
             // map by gradeLevel
             newMap[item.gradeLevel] = item.schedules;
           });
           setSchedulesMap(newMap);
        }
      } catch (err) {
        console.error('Failed to fetch schedules:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSchedules();
  }, []);

  const handleStageChange = (stageId: string) => {
    setSelectedStage(stageId);
    setSelectedGrade(GRADES[stageId as keyof typeof GRADES][0].id);
  };

  const currentSchedules = schedulesMap[selectedGrade] || [];
  const currentGrades = GRADES[selectedStage as keyof typeof GRADES] || [];

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
              اختر المرحلة والصف الدراسي لمعرفة مواعيد وأماكن المحاضرات الحضورية المتاحة.
            </p>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">

          {/* Stage Selector (Dropdown on Mobile, Tabs on Desktop) */}
          <div className="border-b border-slate-100 bg-slate-100/50 p-4">
            {/* Mobile Dropdown */}
            <div className="sm:hidden block w-full relative">
              <select
                value={selectedStage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 text-slate-900 font-bold py-3 pr-4 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all shadow-sm"
              >
                {STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Desktop Tabs */}
            <div className="hidden sm:flex gap-2 justify-center">
              {STAGES.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => handleStageChange(stage.id)}
                  className={`px-8 py-3 rounded-xl font-bold text-base transition-all ${selectedStage === stage.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {stage.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Tabs */}
          <div className="flex flex-wrap border-b border-slate-100 bg-white p-2 sm:p-4 gap-2 justify-center">
            {currentGrades.map((grade) => (
              <button
                key={grade.id}
                onClick={() => setSelectedGrade(grade.id)}
                className={`px-6 py-2.5 rounded-full font-bold text-sm sm:text-base transition-all ${selectedGrade === grade.id
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-600'
                  : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-slate-200'
                  }`}
              >
                {grade.name}
              </button>
            ))}
          </div>

          {/* Schedule List */}
          <div className="p-6 sm:p-8 min-h-[250px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p>جاري تحميل المواعيد...</p>
              </div>
            ) : currentSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 py-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">لا توجد مواعيد متاحة حالياً لهذا الصف</p>
              </div>
            ) : (
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
            )}

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

const TESTIMONIALS = [
  {
    id: 1,
    name: 'أحمد محمود',
    role: 'طالب - الصف الثالث الثانوي',
    content: 'بصراحة منصة الأول غيرت مفهومي عن الرياضيات، الشرح مبسط جداً والأسئلة والامتحانات بتغطي كل أفكار المنهج والنظام الجديد.',
    rating: 5
  },
  {
    id: 2,
    name: 'سارة خالد',
    role: 'طالبة - الصف الثاني الثانوي',
    content: 'المتابعة هنا ممتازة، وأكثر شيء يعجبني هو سرعة الرد على الأسئلة وتوافر مذكرات وملخصات بتسهل علينا المراجعة قبل الامتحان.',
    rating: 5
  },
  {
    id: 3,
    name: 'عمر طارق',
    role: 'طالب - الصف الأول الثانوي',
    content: 'شرح الأستاذ أحمد غريب ممتاز، بيعرف يبسط المعلومة الصعبة، ومنصة الأول فيها فيديوهات بجودة عالية وبنك أسئلة رائع.',
    rating: 5
  }
];

function TestimonialsSection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden" id="testimonials" dir="rtl">
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[30%] rounded-full bg-blue-50 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[30%] h-[40%] rounded-full bg-emerald-50 blur-[100px]" />
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
              آراء <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">طلابنا</span>
            </h2>
            <p className="text-slate-600 text-lg font-medium">
              نفخر دائماً بنجاح طلابنا وتفوقهم، إليك ما يقولونه عن تجربتهم معنا.
            </p>
          </motion.div>
        </div>

        {/* Mobile View: Continuous Marquee */}
        <div className="md:hidden flex overflow-hidden -mx-6">
          <motion.div
            className="flex gap-6 px-6 w-max"
            animate={{ x: ["0%", "50%"] }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 15,
            }}
          >
            {[...TESTIMONIALS, ...TESTIMONIALS].map((testimonial, index) => (
              <div
                key={`${testimonial.id}-${index}`}
                className="bg-slate-50 rounded-3xl p-8 border border-slate-100 relative shrink-0 w-[85vw] sm:w-[350px]"
              >
                <div className="absolute top-6 left-8 text-blue-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 rotate-180" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>

                <div className="mb-6 relative z-10">
                  <h4 className="font-bold text-slate-900 text-lg">{testimonial.name}</h4>
                  <p className="text-sm text-slate-500 font-medium">{testimonial.role}</p>
                </div>

                <div className="flex gap-1 mb-4 relative z-10">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <p className="text-slate-700 leading-relaxed relative z-10 text-lg">
                  "{testimonial.content}"
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Desktop View: Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all relative"
            >
              <div className="absolute top-6 left-8 text-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 rotate-180" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              <div className="mb-6 relative z-10">
                <h4 className="font-bold text-slate-900 text-lg">{testimonial.name}</h4>
                <p className="text-sm text-slate-500 font-medium">{testimonial.role}</p>
              </div>

              <div className="flex gap-1 mb-4 relative z-10">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-slate-700 leading-relaxed relative z-10 text-lg">
                "{testimonial.content}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const CERTIFICATES_BY_STAGE = [
  {
    stageId: 'secondary',
    stageName: 'أبطال المرحلة الثانوية',
    certificates: [
      { id: 1, title: 'المركز الأول - الصف الثالث الثانوي', student: 'محمد أحمد', image: 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate' },
      { id: 2, title: 'التفوق في الرياضيات', student: 'مريم محمود', image: 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate' },
      { id: 3, title: 'الدرجة النهائية - الترم الأول', student: 'يوسف طارق', image: 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate' },
      { id: 4, title: 'المركز الأول - الصف الأول الثانوي', student: 'فاطمة علي', image: 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate' }
    ]
  },
  {
    stageId: 'preparatory',
    stageName: 'أبطال المرحلة الإعدادية',
    certificates: [
      { id: 5, title: 'المركز الأول - الصف الثالث الإعدادي', student: 'عمر حسين', image: 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate' },
      { id: 6, title: 'التميز في الجبر', student: 'نور ياسر', image: 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate' },
      { id: 7, title: 'الدرجة النهائية', student: 'زياد طارق', image: 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate' },
    ]
  },
  {
    stageId: 'primary',
    stageName: 'أبطال المرحلة الابتدائية',
    certificates: [
      { id: 8, title: 'الأول على المدرسة - الصف السادس', student: 'جنى محمد', image: 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate' },
      { id: 9, title: 'عبقري الرياضيات', student: 'ياسين أحمد', image: 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate' },
    ]
  }
];

function CertificatesSection() {
  const [stagesData, setStagesData] = useState(CERTIFICATES_BY_STAGE);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
        let apiCerts = [];
        try {
          const res = await fetch(`${baseUrl}/certificates/public`);
          if (res.ok) {
            apiCerts = await res.json() || [];
          }
        } catch (apiError) {
          console.warn("Could not fetch API certificates", apiError);
        }

        // Get local storage certificates to prevent data loss for older certs
        let localCerts = [];
        try {
          localCerts = JSON.parse(localStorage.getItem('saved_certificates') || '[]');
        } catch(localError) {
          console.warn("Could not parse local certificates", localError);
        }

        // Merge them
        // Map API certs
        const mappedApiCerts = apiCerts.map((c: any) => ({
          id: c.id,
          title: c.subject ? `التفوق في ${c.subject}` : 'شهادة تقدير',
          student: c.studentName || 'طالب',
          image: c.fileUrl || 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate',
          stage: c.stage
        }));

        // Map Local certs
        const mappedLocalCerts = localCerts.map((c: any) => ({
          id: c.id,
          title: c.subject ? `التفوق في ${c.subject}` : 'شهادة تقدير',
          student: c.studentName || 'طالب',
          image: c.image || 'https://placehold.co/600x400/e2e8f0/475569?text=Certificate',
          stage: c.stage || (c.data && c.data.stage)
        }));

        // Combine and filter duplicates by name (if they were uploaded later)
        const combined = [...mappedApiCerts, ...mappedLocalCerts];
        const uniqueSaved = Array.from(new Map(combined.map(item => [item.student, item])).values());

        if (uniqueSaved.length > 0) {
          const newSecondary = uniqueSaved.filter((c: any) => c.stage === 'الثانوية');
          const newPreparatory = uniqueSaved.filter((c: any) => c.stage === 'الإعدادية');
          const newPrimary = uniqueSaved.filter((c: any) => c.stage === 'الابتدائية');

          setStagesData(CERTIFICATES_BY_STAGE.map(stage => {
            if (stage.stageId === 'secondary' && newSecondary.length > 0) {
              return { ...stage, certificates: newSecondary };
            }
            if (stage.stageId === 'preparatory' && newPreparatory.length > 0) {
              return { ...stage, certificates: newPreparatory };
            }
            if (stage.stageId === 'primary' && newPrimary.length > 0) {
              return { ...stage, certificates: newPrimary };
            }
            return stage;
          }));
        }
      } catch (e) {
        console.error('Failed to fetch/merge certificates:', e);
      }
    };
    
    fetchCertificates();
  }, []);

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden" id="certificates" dir="rtl">
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[40%] rounded-full bg-amber-50 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[40%] h-[30%] rounded-full bg-orange-50 blur-[120px]" />
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
              لوحة <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">الشرف</span>
            </h2>
            <p className="text-slate-600 text-lg font-medium">
              نحتفي بطلابنا المتميزين والمتفوقين، شهادات تقدير لأبطال منصة الأول في جميع المراحل.
            </p>
          </motion.div>
        </div>

        <div className="space-y-16">
          {stagesData.map((stage, stageIndex) => (
            <motion.div
              key={stage.stageId}
              className="relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: stageIndex * 0.1 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-800 border-r-4 border-amber-500 pr-4">
                  {stage.stageName}
                </h3>
              </div>

              {/* Continuous Marquee with Fade Edges */}
              <div 
                className="flex overflow-hidden -mx-6 md:-mx-4 pb-6 px-6 md:px-4"
                style={{
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                  maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
                }}
              >
                <motion.div
                  className="flex gap-6 w-max"
                  animate={{ x: ["0%", "25%"] }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 20,
                  }}
                >
                  {[...stage.certificates, ...stage.certificates, ...stage.certificates, ...stage.certificates].map((cert, index) => (
                    <div
                      key={`${cert.id}-${index}`}
                      className="shrink-0 w-[280px] sm:w-[320px] bg-white rounded-2xl p-3 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group"
                    >
                      <div className="relative overflow-hidden rounded-xl bg-slate-100 aspect-[4/3] mb-4">
                        <img
                          src={cert.image}
                          alt={cert.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <div className="text-white">
                            <div className="font-bold text-lg">{cert.student}</div>
                            <div className="text-sm text-slate-200">{cert.title}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-center px-2 pb-2">
                        <h4 className="font-bold text-slate-900 truncate">{cert.student}</h4>
                        <p className="text-sm text-slate-500 truncate">{cert.title}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutUsSection() {
  const [currentBg, setCurrentBg] = useState(1);
  const totalImages = 30;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev % totalImages) + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-16 sm:pt-24 relative overflow-hidden flex flex-col min-h-[85vh] sm:min-h-[80vh]" id="about" dir="rtl">
      {/* Background Slideshow */}
      <div className="absolute inset-0 z-0 bg-slate-900">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={currentBg}
            src={`https://pub-e729d46cf5fd4798932ccae48f7361ef.r2.dev/about_us/${currentBg}.webp`}
            alt="About us background"
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </AnimatePresence>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-slate-900/50" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10 w-full flex flex-col flex-1 justify-between h-full">
        {/* Wrapper to align content to the right on desktop */}
        <div className="w-full lg:w-[60%] xl:w-[55%] mr-0 ml-auto flex flex-col flex-1 justify-between h-full">
          
          {/* Top Feature Cards */}
          <div className="w-full max-w-4xl mx-auto mb-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-3 gap-3 sm:gap-6"
            >
              <div className="bg-white/10 p-4 sm:p-8 rounded-3xl border border-white/20 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center">
                <div className="text-3xl sm:text-5xl font-black text-blue-400 mb-2 sm:mb-4">+25</div>
                <div className="font-bold text-white text-sm sm:text-xl mb-1 text-center">سنوات خبرة</div>
                <p className="text-xs sm:text-base text-slate-300 text-center hidden sm:block">في تدريس الرياضيات</p>
              </div>
              
              <div className="bg-white/10 p-4 sm:p-8 rounded-3xl border border-white/20 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 sm:mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="font-bold text-white text-sm sm:text-xl mb-1 text-center">شرح مبسط</div>
                <p className="text-xs sm:text-base text-slate-300 text-center hidden sm:block">نركز على استيعاب كل فكرة.</p>
              </div>

              <div className="bg-white/10 p-4 sm:p-8 rounded-3xl border border-white/20 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center">
                <div className="w-10 h-10 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 sm:mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="font-bold text-white text-sm sm:text-xl mb-1 text-center">تدريبات مكثفة</div>
                <p className="text-xs sm:text-base text-slate-300 text-center hidden sm:block">مئات الأسئلة المحلولة.</p>
              </div>
            </motion.div>
          </div>

          {/* Bottom Text Card */}
          <div className="w-full mt-auto -mb-8 sm:-mb-12">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 border-b-0 p-6 sm:p-8 md:p-10 pb-10 sm:pb-12 md:pb-16 rounded-t-[2rem] sm:rounded-t-[3rem] shadow-2xl text-center text-white"
            >
              <div className="inline-block px-3 py-1 sm:px-4 sm:py-2 bg-white/20 rounded-full font-bold text-xs sm:text-sm mb-3 sm:mb-5 text-white border border-white/30">
                من نحن
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-5 leading-tight">
                تعرف على الأستاذ / <span className="text-blue-400">أحمد غريب</span>
              </h2>

              <div className="space-y-3 sm:space-y-4 text-slate-200 text-[13px] sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
                <p>
                  نحن في منصة الأول نؤمن بأن الرياضيات ليست مجرد أرقام وقوانين، بل هي لغة العقل ومنهج للتفكير. هدفنا هو تبسيط المادة وتوصيلها للطلاب بأسهل وأمتع الطرق الممكنة.
                </p>
                <p>
                  الأستاذ <strong className="text-white">أحمد غريب</strong>، خبير تدريس الرياضيات للمراحل الإعدادية والثانوية، يمتلك خبرة واسعة في تأهيل الطلاب للتعامل مع النظام الحديث للامتحانات بثقة واقتدار، من خلال التركيز على الفهم العميق والتدريب المستمر.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const [isPending, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      // Import dynamically or assume it's imported at top
      const { submitContactMessage } = await import('./actions');
      const result = await submitContactMessage(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("تم إرسال رسالتك بنجاح!");
        formRef.current?.reset();
      }
    });
  };

  return (
    <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">الاسم بالكامل</label>
        <input name="name" type="text" placeholder="اكتب اسمك هنا" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all" />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">رقم الموبايل</label>
        <input name="phone" type="tel" placeholder="01X XXXX XXXX" dir="ltr" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all text-right" />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">الرسالة أو الاستفسار</label>
        <textarea name="message" rows={4} placeholder="اكتب رسالتك هنا..." required className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all resize-none"></textarea>
      </div>
      <button type="submit" disabled={isPending} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2">
        <span>{isPending ? "جاري الإرسال..." : "إرسال الرسالة"}</span>
        {!isPending && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </form>
  );
}

function ContactUsSection() {
  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden" id="contact" dir="rtl">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              تواصل <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">معنا</span>
            </h2>
            <p className="text-slate-600 text-lg font-medium">
              نحن هنا دائماً لمساعدتك والإجابة على جميع استفساراتك.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* Phone */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">رقم الهاتف</h4>
                <p className="text-slate-600" dir="ltr">012 2130 1224</p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">واتساب</h4>
                <p className="text-slate-600" dir="ltr">010 2190 2000</p>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">العنوان</h4>
                <p className="text-slate-600">سنتر العدليه - دمياط</p>
                <p className="text-slate-600 mt-1">سنتر البستان - دمياط</p>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-6">أرسل لنا رسالة</h3>
            <ContactForm />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-8 border-t border-slate-800" dir="rtl">
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link href="/terms" className="hover:text-blue-400 transition-colors text-sm font-medium">شروط الاستخدام</Link>
          <Link href="/privacy" className="hover:text-blue-400 transition-colors text-sm font-medium">سياسة الخصوصية</Link>
          <a href="https://www.facebook.com/ahmd.ghryb.abw.asm" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors flex items-center gap-2 text-sm font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            فيسبوك
          </a>
        </div>
        <div className="text-sm font-medium text-slate-400">
          تم تطوير المنصه بواسطة شركة <span className="font-bold text-white tracking-wider">TAD TECH</span>
        </div>
      </div>
    </footer>
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
          <TestimonialsSection />
          <CertificatesSection />
          <AboutUsSection />
          <ContactUsSection />
          <FooterSection />
        </motion.div>
      )}
    </main>
  );
}
