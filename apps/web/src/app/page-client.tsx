'use client';

import React from 'react';
import { useLandingInteractions } from './landing/useLandingInteractions';
import {
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
  const { isMounted, isRedirecting, redirectText } = useLandingInteractions();

  // If authenticated user is being redirected to their role dashboard
  if (isMounted && isRedirecting) {
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
      <HeroSection />
      <CenterScheduleSection />
      <CoursesSection />
      <TestimonialsSection />
      <CertificatesSection />
      <AboutUsSection />
      <ContactUsSection />
      <FooterSection />
    </main>
  );
}
