'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Step } from '../../hooks/useAssessmentWizard';

export interface WizardProgressStepperProps {
  currentStep: Step;
}

export function WizardProgressStepper({ currentStep }: WizardProgressStepperProps) {
  const steps: Step[] = ['metadata', 'questions', 'review'];
  const stepTitles = ['المعلومات الأساسية', 'الأسئلة', 'المراجعة والنشر'];

  return (
    <div className="mb-12 relative">
      {/* Background line aligned to circle centers */}
      <div className="absolute top-5 left-[20px] right-[20px] h-1 bg-slate-200 -translate-y-1/2 z-0 rounded-full">
        {/* Active progress line */}
        <div
          className="absolute top-0 right-0 h-full bg-primary-500 transition-all duration-500 ease-out rounded-full"
          style={{
            width:
              currentStep === 'metadata'
                ? '0%'
                : currentStep === 'questions'
                ? '50%'
                : '100%',
          }}
        />
      </div>

      <div className="relative z-10 flex justify-between">
        {steps.map((step, index) => {
          const isCompleted =
            (currentStep === 'questions' && index === 0) ||
            (currentStep === 'review' && index <= 1);
          const isCurrent = currentStep === step;

          return (
            <div key={step} className="flex flex-col items-center w-24">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 shadow-sm
                  ${
                    isCompleted
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : isCurrent
                      ? 'bg-white border-primary-500 text-primary-600 ring-4 ring-primary-50'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
              </div>
              <span
                className={`mt-3 text-sm font-bold text-center transition-colors ${
                  isCurrent || isCompleted ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {stepTitles[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
