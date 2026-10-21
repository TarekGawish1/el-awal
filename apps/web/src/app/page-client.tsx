'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useLandingInteractions } from './landing/useLandingInteractions';
import { HeroSection } from './landing/components/HeroSection';
import { FooterSection } from './landing/components/FooterSection';

const CenterScheduleSection = dynamic(
  () => import('./landing/components/CenterScheduleSection').then((mod) => mod.CenterScheduleSection),
  { ssr: true }
);

const CoursesSection = dynamic(
  () => import('./landing/components/CoursesSection').then((mod) => mod.CoursesSection),
  { ssr: true }
);

const TestimonialsSection = dynamic(
  () => import('./landing/components/TestimonialsSection').then((mod) => mod.TestimonialsSection),
  { ssr: true }
);

const CertificatesSection = dynamic(
  () => import('./landing/components/CertificatesSection').then((mod) => mod.CertificatesSection),
  { ssr: true }
);

const AboutUsSection = dynamic(
  () => import('./landing/components/AboutUsSection').then((mod) => mod.AboutUsSection),
  { ssr: true }
);

const ContactUsSection = dynamic(
  () => import('./landing/components/ContactUsSection').then((mod) => mod.ContactUsSection),
  { ssr: true }
);

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
