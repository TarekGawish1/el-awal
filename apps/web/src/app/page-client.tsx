'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLandingInteractions } from './landing/useLandingInteractions';
import {
  IntroSequence,
  HeroSection,
  CenterScheduleSection,
  CoursesSection,
  TestimonialsSection,
  CertificatesSection,
  AboutUsSection,
  ContactUsSection,
  FooterSection,
} from './landing/components';

export default function RootPage() {
  const { isMounted, showIntro, dismissIntro, isRedirecting, redirectText } =
    useLandingInteractions();

  if (!isMounted) {
    return <div className="min-h-screen bg-[#0a0f1c]" />;
  }

  if (isRedirecting) {
    return (
      <div
        className="min-h-screen bg-[#0a0f1c] flex items-center justify-center text-slate-300 text-sm"
        dir="rtl"
      >
        {redirectText}
      </div>
    );
  }

  return (
    <main>
      <AnimatePresence mode="wait">
        {showIntro && <IntroSequence key="intro" onComplete={dismissIntro} />}
      </AnimatePresence>

      {!showIntro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <HeroSection />
          <CenterScheduleSection />
          <CoursesSection />
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
