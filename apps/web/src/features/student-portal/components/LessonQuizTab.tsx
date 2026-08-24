'use client';

import React from 'react';
import Link from 'next/link';
import {
  Award,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileQuestion,
  Lock,
  Trophy,
  Hourglass,
} from 'lucide-react';
import { AssessmentSummary } from '@/features/courses/types/courses.types';
import { useAssessment } from '@/features/assessments/hooks/use-assessments';

interface LessonQuizTabProps {
  lessonTitle?: string;
  courseId?: string;
  lessonId?: string;
  lessonQuiz?: AssessmentSummary | null;
  unitQuiz?: AssessmentSummary | null;
  courseQuiz?: AssessmentSummary | null;
}

// ─── Sub-component: a single quiz card aware of submission state ───────────────
function QuizCard({
  quiz,
  level,
  courseId,
  lessonId,
  learnRoomUrl,
}: {
  quiz: AssessmentSummary;
  level: 'lesson' | 'unit' | 'course';
  courseId?: string;
  lessonId?: string;
  learnRoomUrl: string;
}) {
  // Fetch the assessment detail so we know whether the student already submitted
  const { data: detail, isLoading } = useAssessment(quiz.id);
  const mySubmission = detail?.mySubmission ?? null;
  const hasSubmitted = Boolean(mySubmission);
  const isGraded = mySubmission?.status === 'GRADED';

  const href = level === 'lesson'
    ? `/student/assessments?id=${quiz.id}&courseId=${courseId || ''}&lessonId=${lessonId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`
    : `/student/assessments?id=${quiz.id}&courseId=${courseId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`;

  // ── LESSON level card ────────────────────────────────────────────────────────
  if (level === 'lesson') {
    return (
      <div
        className={`border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          hasSubmitted
            ? 'bg-emerald-50/60 border-emerald-200'
            : 'bg-primary-50/50 border-primary-200'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${
              hasSubmitted
                ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}
          >
            {hasSubmitted ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <Award className="w-6 h-6" />
            )}
          </div>

          <div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                hasSubmitted
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {hasSubmitted ? 'تم حل اختبار الدرس' : 'اختبار الدرس السريع'}
            </span>
            <h3 className="text-sm font-bold text-slate-900 mt-1">{quiz.title}</h3>

            {hasSubmitted && isGraded && mySubmission?.scoreObtained != null ? (
              <div className="flex items-center gap-1.5 mt-1">
                <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">
                  درجتك: {mySubmission.scoreObtained} / {quiz.totalScore}
                </span>
              </div>
            ) : hasSubmitted ? (
              <div className="flex items-center gap-1.5 mt-1">
                <Hourglass className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs text-blue-600 font-semibold">
                  قيد التصحيح من المعلم
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">
                الدرجة الإجمالية: {quiz.totalScore} درجة
                {quiz.durationMinutes ? ` • المدة: ${quiz.durationMinutes} دقيقة` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Right side CTA */}
        {isLoading ? (
          <div className="w-8 h-8 rounded-full border-2 border-primary-300 border-t-transparent animate-spin shrink-0" />
        ) : hasSubmitted ? (
          /* Already submitted — show view-results link, no retry */
          <Link
            href={href}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>عرض الإجابات والنتيجة</span>
          </Link>
        ) : (
          /* Not yet submitted — start the quiz */
          <Link
            href={href}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
          >
            <span>بدء اختبار الدرس الآن</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
      </div>
    );
  }

  // ── UNIT / COURSE level card (compact) ──────────────────────────────────────
  const isUnit = level === 'unit';
  return (
    <div
      className={`bg-white border rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm ${
        hasSubmitted
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            hasSubmitted
              ? 'bg-emerald-100 text-emerald-600'
              : isUnit
              ? 'bg-primary-50 text-primary-600'
              : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {hasSubmitted ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isUnit ? (
            <FileQuestion className="w-4 h-4" />
          ) : (
            <Award className="w-4 h-4" />
          )}
        </div>
        <div>
          <span
            className={`text-[10px] font-bold ${
              hasSubmitted
                ? 'text-emerald-600'
                : isUnit
                ? 'text-primary-600'
                : 'text-emerald-600'
            }`}
          >
            {hasSubmitted
              ? 'تم الإجابة'
              : isUnit
              ? 'اختبار الوحدة الشامل'
              : 'الامتحان الشامل والنهائي للكورس'}
          </span>
          <h4 className="text-xs font-bold text-slate-900">
            {quiz.title}{' '}
            {hasSubmitted && isGraded && mySubmission?.scoreObtained != null ? (
              <span className="text-emerald-600 font-mono">
                ({mySubmission.scoreObtained}/{quiz.totalScore} د)
              </span>
            ) : (
              <span className="text-slate-400">({quiz.totalScore} د)</span>
            )}
          </h4>
        </div>
      </div>

      {isLoading ? (
        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-transparent animate-spin shrink-0" />
      ) : hasSubmitted ? (
        <Link
          href={href}
          className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors border border-emerald-200 flex items-center gap-1.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          النتيجة والمراجعة
        </Link>
      ) : (
        <Link
          href={href}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border ${
            isUnit
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border-emerald-200'
          }`}
        >
          {isUnit ? 'الانتقال للامتحان' : 'بدء الامتحان النهائي'}
        </Link>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function LessonQuizTab({
  lessonTitle,
  courseId,
  lessonId,
  lessonQuiz,
  unitQuiz,
  courseQuiz,
}: LessonQuizTabProps) {
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

  const learnRoomUrl = courseId
    ? `/student/courses/${courseId}/learn${lessonId ? `?lessonId=${lessonId}` : ''}`
    : '/student/courses';

  return (
    <div className="space-y-4 text-right animate-in fade-in">
      {/* Single-attempt policy notice */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
        <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span>يُسمح بمحاولة واحدة فقط لكل اختبار — تأكد من إجاباتك قبل التسليم النهائي</span>
      </div>

      {/* 1. LESSON LEVEL QUIZ */}
      {lessonQuiz && (
        <QuizCard
          quiz={lessonQuiz}
          level="lesson"
          courseId={courseId}
          lessonId={lessonId}
          learnRoomUrl={learnRoomUrl}
        />
      )}

      {/* 2. UNIT LEVEL QUIZ */}
      {unitQuiz && (
        <QuizCard
          quiz={unitQuiz}
          level="unit"
          courseId={courseId}
          lessonId={lessonId}
          learnRoomUrl={learnRoomUrl}
        />
      )}

      {/* 3. COURSE LEVEL FINAL QUIZ */}
      {courseQuiz && (
        <QuizCard
          quiz={courseQuiz}
          level="course"
          courseId={courseId}
          lessonId={lessonId}
          learnRoomUrl={learnRoomUrl}
        />
      )}
    </div>
  );
}
