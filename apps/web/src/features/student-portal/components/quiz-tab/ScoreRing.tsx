'use client';

import React from 'react';

interface ScoreRingProps {
  score: number;
  total: number;
  passed: boolean;
  size?: number;
}

export function ScoreRing({
  score,
  total,
  passed,
  size = 96,
}: ScoreRingProps) {
  const pct = total > 0 ? Math.min(100, Math.round((score / total) * 100)) : 0;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 96 96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={passed ? '#d1fae5' : '#fee2e2'}
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={passed ? '#10b981' : '#f87171'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-xl font-black font-mono leading-none ${
            passed ? 'text-emerald-700' : 'text-rose-600'
          }`}
        >
          {pct}%
        </span>
        <span className="text-[9px] text-slate-500 font-semibold mt-0.5">النتيجة</span>
      </div>
    </div>
  );
}
