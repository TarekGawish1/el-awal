'use client';

import React from 'react';
import { Lock, CheckCircle, Trophy } from 'lucide-react';
import { AssessmentSummary } from '@/features/courses/types/courses.types';

interface SyllabusFinalExamCardProps {
  courseQuiz: AssessmentSummary | null | undefined;
  isUnlocked: boolean;
  onSelectCourseQuiz: () => void;
}

export function SyllabusFinalExamCard({
  courseQuiz,
  isUnlocked,
  onSelectCourseQuiz,
}: SyllabusFinalExamCardProps) {
  if (!courseQuiz) return null;

  const quiz = courseQuiz;
  const isPassed =
    quiz.mySubmission?.isPassed ??
    ((quiz.mySubmission?.scoreObtained ?? 0) >= (quiz.passingScore ?? 0));
  const mustPassThisQuiz = Boolean(quiz.requirePassingScore);
  const isFinalCompleted = Boolean(
    quiz.mySubmission &&
      (quiz.mySubmission.status === 'SUBMITTED' || quiz.mySubmission.status === 'GRADED') &&
      (!mustPassThisQuiz || isPassed)
  );

  return (
    <div className="p-3.5 pt-2 border-t border-slate-200 bg-gradient-to-b from-indigo-50/30 to-white">
      <button
        type="button"
        onClick={onSelectCourseQuiz}
        className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs transition-all text-right border ${
          isFinalCompleted
            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs hover:bg-emerald-100'
            : !isUnlocked
            ? 'opacity-65 bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-indigo-50/80 border-indigo-200 text-indigo-950 hover:bg-indigo-100 shadow-sm cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs ${
              isFinalCompleted
                ? 'bg-emerald-500 text-white'
                : !isUnlocked
                ? 'bg-slate-200 text-slate-400'
                : 'bg-indigo-600 text-white shadow-xs'
            }`}
          >
            {isFinalCompleted ? (
              <CheckCircle className="w-4 h-4" />
            ) : !isUnlocked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Trophy className="w-4 h-4" />
            )}
          </div>

          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-bold truncate text-xs">
                الامتحان النهائي الشامل للكورس
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
              <span className="text-slate-500 font-medium truncate">{quiz.title}</span>
              <span className="text-slate-400">• {quiz.totalScore} درجة</span>
              {quiz.mySubmission?.scoreObtained != null && (
                <span className="text-emerald-700 font-bold font-mono">
                  • درجتك: {quiz.mySubmission.scoreObtained}/{quiz.totalScore}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 mr-1">
          {isFinalCompleted ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              مكتمل ✓
            </span>
          ) : !isUnlocked ? (
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full shadow-2xs">
              ابدأ 🏆
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
