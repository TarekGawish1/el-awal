'use client';

import React, { useEffect, useRef } from 'react';
import { CertificateCard } from './CertificateCard';

interface StageCertificateRowProps {
  certificates: any[];
}

export function StageCertificateRow({ certificates }: StageCertificateRowProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const normalizedList =
    certificates && certificates.length > 0
      ? certificates.length < 8
        ? Array.from({
            length: Math.ceil(8 / certificates.length),
          }).flatMap(() => certificates)
        : certificates
      : [];

  // JS-driven marquee (requestAnimationFrame + inline transform).
  // A CSS keyframes animation was unreliable here: it stayed static whenever
  // the cards fit the wide desktop container, and globals.css kills ALL CSS
  // animations under `prefers-reduced-motion: reduce` (common on Windows when
  // "Animation effects" are off) — while phones kept moving. rAF is immune to
  // both, so desktop and phone behave identically.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || normalizedList.length === 0) return;

    const SPEED_PX_PER_SEC = 80; // rightward (left-to-right), like before
    let raf = 0;
    let last = performance.now();
    let half = track.offsetWidth / 2;
    let x = -half;

    const measure = () => {
      half = track.offsetWidth / 2;
      if (half > 0) {
        if (x > 0) x -= half;
        if (x < -half) x += half;
      }
    };
    measure();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    ro?.observe(track);
    window.addEventListener("resize", measure);
    // Re-measure once layout settles (fonts / late paint).
    const settleTimer = window.setTimeout(measure, 600);

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // Never pauses — no hover stop, keeps moving on desktop and phone.
      if (half <= 0) measure();
      if (half > 0) {
        x += SPEED_PX_PER_SEC * dt;
        if (x >= 0) x -= half;
        track.style.transform = `translate3d(${x}px,0,0)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.clearTimeout(settleTimer);
    };
  }, [certificates, normalizedList.length]);

  if (!certificates || certificates.length === 0) return null;

  return (
    <div className="w-full overflow-hidden pb-6">
      <div className="relative w-full overflow-hidden" dir="ltr">
        <div ref={trackRef} className="flex w-max will-change-transform" dir="ltr">
          <div className="flex gap-6 pr-6 shrink-0" dir="rtl">
            {normalizedList.map((cert, index) => (
              <CertificateCard
                cert={cert}
                index={index}
                key={`set1-${cert.id}-${index}`}
              />
            ))}
          </div>
          <div className="flex gap-6 pr-6 shrink-0" dir="rtl" aria-hidden="true">
            {normalizedList.map((cert, index) => (
              <CertificateCard
                cert={cert}
                index={index}
                key={`set2-${cert.id}-${index}`}
              />
            ))}
          </div>
        </div>
        {/* Transparent fading sides — softens the hard cut-off at both edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-slate-50 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-slate-50 to-transparent z-10" />
      </div>
    </div>
  );
}
