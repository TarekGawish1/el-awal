'use client';

import React from 'react';
import Image from 'next/image';
import { isOptimizableImage } from '@/lib/utils/asset-url';

interface CertificateCardProps {
  cert: any;
  index: number;
}

export function CertificateCard({ cert, index }: CertificateCardProps) {
  const displayName = cert.student || cert.studentName || "طالب";
  const displayTitle = cert.title || (cert.subject ? `التفوق في ${cert.subject}` : "شهادة تقدير");
  const hasRealCertificateImage = Boolean(cert.image) && cert.image !== "/certification-bg.webp";
  const imageSrc = cert.image || "/certification-bg.webp";

  return (
    <div
      key={`${cert.id || displayName}-${index}`}
      className="shrink-0 w-[280px] sm:w-[320px] bg-white rounded-2xl p-3 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group"
    >
      <div className="relative overflow-hidden rounded-xl bg-slate-100 aspect-[4/3] mb-4">
        <Image
          src={imageSrc}
          fill
          sizes="(max-width: 640px) 280px, 320px"
          alt={displayTitle}
          unoptimized={!isOptimizableImage(imageSrc)}
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {!hasRealCertificateImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="font-black text-slate-800 text-lg sm:text-xl leading-snug drop-shadow-sm">
              {displayName}
            </div>
            <div className="text-xs sm:text-sm font-bold text-amber-700 mt-1.5">
              {displayTitle}
            </div>
            {cert.grade && (
              <div className="mt-1.5 text-sm font-black text-slate-700 bg-white/70 border border-amber-200 px-3 py-0.5 rounded-full shadow-sm">
                الدرجة: {cert.grade}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="text-center px-2 pb-2">
        <h4 className="font-bold text-slate-900 truncate">{displayName}</h4>
        <p className="text-sm text-slate-500 truncate">{displayTitle}</p>
        {(cert.grade || cert.year) && (
          <div className="flex items-center justify-center gap-2 mt-2">
            {cert.grade && (
              <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                الدرجة: {cert.grade}
              </span>
            )}
            {cert.year && (
              <span className="text-xs font-semibold text-slate-500">
                {cert.year}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
