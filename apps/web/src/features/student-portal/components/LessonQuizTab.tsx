'use client';

import React from 'react';
import Link from 'next/link';
import { Award, ArrowLeft, CheckCircle2, Clock, FileQuestion, Sparkles } from 'lucide-react';
import { AssessmentSummary } from '@/features/courses/types/courses.types';

interface LessonQuizTabProps {
  lessonTitle?: string;
  courseId?: string;
  lessonId?: string;
  lessonQuiz?: AssessmentSummary | null;
  unitQuiz?: AssessmentSummary | null;
  courseQuiz?: AssessmentSummary | null;
}

export function LessonQuizTab({ lessonTitle, courseId, lessonId, lessonQuiz, unitQuiz, courseQuiz }: LessonQuizTabProps) {
  const hasAnyQuiz = Boolean(lessonQuiz || unitQuiz || courseQuiz);

  if (!hasAnyQuiz) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-2 text-right shadow-sm">
        <Award className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-xs text-slate-700 font-bold">لا يوجد اختبار مرتبط بهذا الدرس مباشرة</p>
        <p className="text-[11px] text-slate-400">
          استمر في متابعة الدروس القادمة لإجراء الاختبارات الشاملة للوحدات والمنهج.
        </p>
      </div>
    );
  }

  const learnRoomUrl = courseId ? `/student/courses/${courseId}/learn${lessonId ? `?lessonId=${lessonId}` : ''}` : '/student/courses';

  return (
    <div className="space-y-4 text-right animate-in fade-in">
      {/* 1. LESSON LEVEL QUIZ */}
      {lessonQuiz && (
        <div className="bg-primary-50/50 border border-primary-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                اختبار الدرس السريع
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{lessonQuiz.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                الدرجة الإجمالية: {lessonQuiz.totalScore} درجة
                {lessonQuiz.durationMinutes ? ` • المدة: ${lessonQuiz.durationMinutes} دقيقة` : ''}
              </p>
            </div>
          </div>

          <Link
            href={`/student/assessments?id=${lessonQuiz.id}&courseId=${courseId || ''}&lessonId=${lessonId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
          >
            <span>بدء اختبار الدرس الآن</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 2. UNIT LEVEL QUIZ */}
      {unitQuiz && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <FileQuestion className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary-600">اختبار الوحدة الشامل</span>
              <h4 className="text-xs font-bold text-slate-900">{unitQuiz.title} ({unitQuiz.totalScore} د)</h4>
            </div>
          </div>

          <Link
            href={`/student/assessments?id=${unitQuiz.id}&courseId=${courseId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
          >
            الانتقال للامتحان
          </Link>
        </div>
      )}

      {/* 3. COURSE LEVEL FINAL QUIZ */}
      {courseQuiz && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-600">الامتحان الشامل والنهائي للكورس</span>
              <h4 className="text-xs font-bold text-slate-900">{courseQuiz.title} ({courseQuiz.totalScore} د)</h4>
            </div>
          </div>

          <Link
            href={`/student/assessments?id=${courseQuiz.id}&courseId=${courseId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`}
            className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-colors border border-emerald-200"
          >
            بدء الامتحان النهائي
          </Link>
        </div>
      )}
    </div>
  );
}
