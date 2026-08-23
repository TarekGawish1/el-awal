'use client';

import React, { useEffect, useState } from 'react';

interface AntiPiracyWatermarkProps {
  studentName?: string;
  studentPhone?: string;
  studentCode?: string;
}

export function AntiPiracyWatermark({
  studentName = 'طالب مسجل',
  studentPhone = '',
  studentCode = '',
}: AntiPiracyWatermarkProps) {
  const [position, setPosition] = useState({ top: '15%', left: '20%' });

  useEffect(() => {
    const updatePosition = () => {
      // Random coordinates between 10% and 80% to keep watermark within video bounds
      const randomTop = Math.floor(Math.random() * 70 + 10);
      const randomLeft = Math.floor(Math.random() * 70 + 10);
      setPosition({
        top: `${randomTop}%`,
        left: `${randomLeft}%`,
      });
    };

    // Change watermark position every 12 seconds
    const interval = setInterval(updatePosition, 12000);
    return () => clearInterval(interval);
  }, []);

  const watermarkText = [studentName, studentPhone, studentCode].filter(Boolean).join(' • ');

  return (
    <div
      className="absolute pointer-events-none select-none z-30 transition-all duration-1000 ease-in-out"
      style={{ top: position.top, left: position.left }}
    >
      <div className="bg-black/30 backdrop-blur-[1px] px-3 py-1 rounded-full border border-white/10 text-white/30 text-[11px] font-mono whitespace-nowrap shadow-sm">
        {watermarkText}
      </div>
    </div>
  );
}
