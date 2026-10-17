'use client';

import React from 'react';
import { Lock, CheckCircle, FileQuestion } from 'lucide-react';
import { CourseModule } from '@/features/courses/types/courses.types';

interface SyllabusUnitExamCardProps {
  module: CourseModule;
  moduleIndex: number;
  activeQuizId?: string | null;
  isUnlocked: boolean;
  onSelectUnitQuiz: (mod: CourseModule, modIndex: number) => void;
}

export function SyllabusUnitExamCard({
  module,
  moduleIndex,
  activeQuizId,
  isUnlocked,
  onSelectUnitQuiz,
}: SyllabusUnitExamCardProps) {
  const quiz = module.unitQuiz;
  if (!quiz) return null;

  const isUnitPassed =
    quiz.mySubmission?.isPassed ??
    ((quiz.mySubmission?.scoreObtained ?? 0) >= (quiz.passingScore ?? 0));
  const mustPassThisQuiz = Boolean(quiz.requirePassingScore);
  const isUnitCompleted = Boolean(
    quiz.mySubmission &&
      (quiz.mySubmission.status === 'SUBMITTED' || quiz.mySubmission.status === 'GRADED') &&
      (!mustPassThisQuiz || isUnitPassed)
  );
  const isQuizActive = activeQuizId === quiz.id;

  return (
    <div className="pt-1">
      <button
        key={`unit-quiz-${module.id}`}
        type="button"
        onClick={() => onSelectUnitQuiz(module, moduleIndex)}
        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all text-right border ${
          isQuizActive
            ? 'bg-amber-50 text-amber-950 font-bold border-amber-300 shadow-sm'
            : isUnitCompleted
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-50'
            : !isUnlocked
            ? 'opacity-65 bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-amber-50/50 border-amber-200 text-slate-800 hover:bg-amber-50 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
              isUnitCompleted
                ? 'bg-emerald-500 text-white'
                : !isUnlocked
                ? 'bg-slate-200 text-slate-400'
                : 'bg-amber-500 text-white'
            }`}
          >
            {isUnitCompleted ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : !isUnlocked ? (
              <Lock className="w-3 h-3" />
            ) : (
              <FileQuestion className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-bold truncate text-xs">
                امتحان الوحدة: {quiz.title}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
              {quiz.isOptional ? (
                <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold">
                  اختياري
                </span>
              ) : (
                <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">
                  إجباري للوحدة
                </span>
              )}
              <span className="text-slate-400">• {quiz.totalScore} درجة</span>
              {quiz.mySubmission?.scoreObtained != null && (
                <span className="text-emerald-700 font-bold font-mono">
                  • درجتك: {quiz.mySubmission.scoreObtained}/{quiz.totalScore}
                </span>
              )}
              {!isUnlocked && (
                <span className="text-slate-400 font-bold">• مقفل</span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 mr-1">
          {isUnitCompleted ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              مكتمل ✓
            </span>
          ) : !isUnlocked ? (
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              ابدأ ✍️
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
