'use client';

import React from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { HeroImageSequence } from './HeroImageSequence';
import { Navbar } from './Navbar';

export function HeroSection() {
  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden"
      dir="rtl"
    >
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
                WebkitMaskImage:
                  'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                maskImage:
                  'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
              }}
            >
              <NextImage
                src="/teacher-photo.webp"
                alt="صورة الأستاذ أحمد غريب"
                width={450}
                height={450}
                priority
                fetchPriority="high"
                sizes="(max-width: 768px) 100vw, 450px"
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
            <span className="text-blue-600">الاستاذ/ أحمد غريب</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 mb-12 leading-loose max-w-lg font-medium">
            منهجية مبسطة وتدريبات مكثفة تضمن لك التفوق وفهم الرياضيات بكل سهولة.
            انضم الآن.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 w-full">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-1 inline-block"
            >
              ابدأ التعلم الآن
            </Link>
            <button
              onClick={() =>
                document
                  .getElementById('courses')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              شاهد الفيديوهات المجانية
            </button>
          </div>

          <div className="mt-14 flex flex-wrap justify-center lg:justify-start items-center gap-8 text-slate-500">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold text-lg">شرح مبسط</span>
            </div>
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold text-lg">متابعة مستمرة</span>
            </div>
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold text-lg">بنك أسئلة</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Smooth Bottom Transition to next Section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />
    </div>
  );
}
