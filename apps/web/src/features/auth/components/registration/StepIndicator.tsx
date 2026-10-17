'use client';

import React from 'react';
import { Check } from 'lucide-react';

export function StepIndicator({ current }: { current: number }) {
  const steps = ['الحضور', 'البيانات', 'المراجعة', 'بيانات الدخول'];
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`الخطوة ${current} من ${steps.length}`}>
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === current;
        const isDone = stepNumber < current;
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isDone
                    ? 'bg-success-500 text-white'
                    : isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-200 text-neutral-500'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : stepNumber}
              </span>
              <span className={`text-[11px] font-semibold ${isActive ? 'text-neutral-800' : 'text-neutral-400'}`}>
                {label}
              </span>
            </div>
            {index < steps.length - 1 && <span className="h-px w-6 bg-neutral-200" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
