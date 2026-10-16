'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export interface IntroSequenceProps {
  onComplete: () => void;
}

export function IntroSequence({ onComplete }: IntroSequenceProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1300); // Reduced duration
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0f1c] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      dir="rtl"
      initial={{ y: "0%" }}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* Background Cinematic Effects */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#0a0f1c] to-[#0a0f1c]" />

      {/* Subtle Grid or Stars effect */}
      <motion.div
        className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay"
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-white"
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-2xl">
            منصة{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
              الأول
            </span>{" "}
            التعليمية
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
