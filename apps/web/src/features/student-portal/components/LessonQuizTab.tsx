'use client';

import React from 'react';
import Link from 'next/link';
import { Award, ArrowLeft, CheckCircle2, Clock, HelpCircle, Sparkles } from 'lucide-react';
import { AssessmentSummary } from '@/features/courses/types/courses.types';

interface LessonQuizTabProps {
  lessonQuiz?: AssessmentSummary | null;
  unitQuiz?: AssessmentSummary | null;
  courseQuiz?: AssessmentSummary | null;
  lessonTitle: string;
}

export function LessonQuizTab({
  lessonQuiz,
  unitQuiz,
  courseQuiz,
  lessonTitle,
}: LessonQuizTabProps) {
  if (!lessonQuiz && !unitQuiz && !courseQuiz) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2 text-right">
        <Award className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-xs text-slate-400 font-bold">لا يوجد اختبار مرتبط بهذا الدرس مباشرة</p>
        <p className="text-[11px] text-slate-500">يمكنك مراجعة ملخص الدرس أو الانتقال للدرس التالي.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-right">
      {/* 1. Lesson Quiz (Primary) */}
      {lessonQuiz && (
        <div className="bg-gradient-to-l from-indigo-950/50 to-slate-900 border border-indigo-800/40 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                اختبار الدرس الحالي
              </span>
              <h3 className="text-sm font-bold text-white mt-1">{lessonQuiz.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                الدرجة الإجمالية: {lessonQuiz.totalScore} درجة • النوع: {lessonQuiz.type === 'EXAM' ? 'امتحان' : 'واجب'}
              </p>
            </div>
          </div>

          <Link
            href={`/student/assessments/${lessonQuiz.id}`}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 self-start sm:self-auto"
          >
            <span>بدء الاختبار الآن</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 2. Unit Quiz Banner */}
      {unitQuiz && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-400">اختبار الوحدة الشامل</span>
              <h4 className="text-xs font-bold text-white">{unitQuiz.title} ({unitQuiz.totalScore} د)</h4>
            </div>
          </div>

          <Link
            href={`/student/assessments/${unitQuiz.id}`}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
          >
            عرض اختبار الوحدة
          </Link>
        </div>
      )}

      {/* 3. Course Final Quiz Banner */}
      {courseQuiz && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400">الامتحان النهائي للكورس</span>
              <h4 className="text-xs font-bold text-white">{courseQuiz.title} ({courseQuiz.totalScore} د)</h4>
            </div>
          </div>

          <Link
            href={`/student/assessments/${courseQuiz.id}`}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
          >
            عرض الامتحان النهائي
          </Link>
        </div>
      )}
    </div>
  );
}
