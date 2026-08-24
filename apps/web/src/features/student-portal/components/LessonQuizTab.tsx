'use client';

import React from 'react';
import Link from 'next/link';
import {
  Award,
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  Lock,
  Trophy,
  Hourglass,
  Star,
  Sparkles,
  XCircle,
  RefreshCcw,
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

// ─── Animated Score Ring ──────────────────────────────────────────────────────
function ScoreRing({
  score,
  total,
  passed,
  size = 96,
}: {
  score: number;
  total: number;
  passed: boolean;
  size?: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((score / total) * 100)) : 0;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 96 96" className="-rotate-90">
        {/* Background track */}
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={passed ? '#d1fae5' : '#fee2e2'}
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={passed ? '#10b981' : '#f87171'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-black font-mono leading-none ${passed ? 'text-emerald-700' : 'text-rose-600'}`}>
          {pct}%
        </span>
        <span className="text-[9px] text-slate-500 font-semibold mt-0.5">النتيجة</span>
      </div>
    </div>
  );
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
  const scoreObtained: number | null = isGraded && mySubmission?.scoreObtained != null
    ? Number(mySubmission.scoreObtained)
    : null;
  const passingScore: number | null = detail?.passingScore != null ? Number(detail.passingScore) : null;
  const totalScore = Number(quiz.totalScore);
  const passed = scoreObtained != null && passingScore != null && scoreObtained >= passingScore;
  const failed = scoreObtained != null && passingScore != null && scoreObtained < passingScore;
  const isPending = hasSubmitted && !isGraded;

  const href =
    level === 'lesson'
      ? `/student/assessments?id=${quiz.id}&courseId=${courseId || ''}&lessonId=${lessonId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`
      : `/student/assessments?id=${quiz.id}&courseId=${courseId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`;

  // ── LESSON level card — full result banner when graded ───────────────────────
  if (level === 'lesson') {
    // Graded + we know the result → show a rich result panel
    if (isGraded && scoreObtained != null) {
      return (
        <div
          className={`border rounded-2xl overflow-hidden shadow-sm ${
            passed ? 'border-emerald-200' : 'border-rose-200'
          }`}
        >
          {/* Congratulations / Encouragement banner */}
          <div
            className={`px-6 py-5 flex flex-col sm:flex-row items-center gap-5 ${
              passed
                ? 'bg-gradient-to-l from-emerald-600 to-teal-600'
                : 'bg-gradient-to-l from-rose-500 to-orange-500'
            }`}
          >
            {/* Score ring */}
            <ScoreRing
              score={scoreObtained}
              total={totalScore}
              passed={passed}
              size={84}
            />

            <div className="flex-1 text-white text-right">
              {passed ? (
                <>
                  <div className="flex items-center gap-2 mb-1 justify-end sm:justify-start">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wide">
                      مبروك! لقد اجتزت الاختبار بنجاح 🎉
                    </span>
                  </div>
                  <h3 className="text-lg font-black leading-tight">
                    أحسنت يا بطل! نتيجتك رائعة
                  </h3>
                  <p className="text-xs text-emerald-100 mt-1">
                    حصلت على{' '}
                    <span className="font-black text-white text-sm font-mono">
                      {scoreObtained}
                    </span>{' '}
                    من{' '}
                    <span className="font-bold text-white font-mono">{totalScore}</span>{' '}
                    درجة — فوق درجة النجاح ({passingScore} د) ✨
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1 justify-end sm:justify-start">
                    <XCircle className="w-4 h-4 text-rose-200" />
                    <span className="text-[11px] font-bold text-rose-100 uppercase tracking-wide">
                      لم تتجاوز درجة النجاح هذه المرة
                    </span>
                  </div>
                  <h3 className="text-lg font-black leading-tight">
                    لا تستسلم — المراجعة مفتاح النجاح 💪
                  </h3>
                  <p className="text-xs text-rose-100 mt-1">
                    حصلت على{' '}
                    <span className="font-black text-white text-sm font-mono">
                      {scoreObtained}
                    </span>{' '}
                    من{' '}
                    <span className="font-bold text-white font-mono">{totalScore}</span>{' '}
                    درجة — راجع الإجابات لتفهم أين أخطأت وتتحسن أكثر
                  </p>
                </>
              )}
            </div>

            {/* Stars only if passed */}
            {passed && (
              <div className="hidden sm:flex flex-col items-center gap-1 shrink-0">
                {[...Array(scoreObtained >= totalScore * 0.9 ? 3 : scoreObtained >= totalScore * 0.7 ? 2 : 1)].map(
                  (_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  )
                )}
              </div>
            )}
          </div>

          {/* Footer row with quiz name + CTA */}
          <div className="px-5 py-3.5 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400">اختبار الدرس</span>
              <p className="text-xs font-bold text-slate-800">{quiz.title}</p>
            </div>
            <Link
              href={href}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                passed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              مراجعة الإجابات والنموذج
            </Link>
          </div>
        </div>
      );
    }

    // Submitted but pending teacher grading
    if (isPending) {
      return (
        <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
              <Hourglass className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                تم تسليم الاختبار
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{quiz.title}</h3>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">
                إجاباتك قيد التصحيح والمراجعة من المعلم — ستظهر درجتك هنا فور الاعتماد
              </p>
            </div>
          </div>
          <Link
            href={href}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            عرض الإجابات
          </Link>
        </div>
      );
    }

    // Not yet submitted
    return (
      <div className="bg-primary-50/50 border border-primary-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              اختبار الدرس السريع
            </span>
            <h3 className="text-sm font-bold text-slate-900 mt-1">{quiz.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              الدرجة الإجمالية: {quiz.totalScore} درجة
              {quiz.durationMinutes ? ` • المدة: ${quiz.durationMinutes} دقيقة` : ''}
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="w-8 h-8 rounded-full border-2 border-primary-300 border-t-transparent animate-spin shrink-0" />
        ) : (
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
        isGraded && passed
          ? 'border-emerald-200 bg-emerald-50/30'
          : isGraded && failed
          ? 'border-rose-200 bg-rose-50/20'
          : hasSubmitted
          ? 'border-blue-200 bg-blue-50/20'
          : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isGraded && passed
              ? 'bg-emerald-100 text-emerald-600'
              : isGraded && failed
              ? 'bg-rose-100 text-rose-600'
              : hasSubmitted
              ? 'bg-blue-100 text-blue-600'
              : isUnit
              ? 'bg-primary-50 text-primary-600'
              : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {isGraded && passed ? (
            <Trophy className="w-4 h-4" />
          ) : isGraded && failed ? (
            <XCircle className="w-4 h-4" />
          ) : hasSubmitted ? (
            <Hourglass className="w-4 h-4" />
          ) : isUnit ? (
            <FileQuestion className="w-4 h-4" />
          ) : (
            <Award className="w-4 h-4" />
          )}
        </div>
        <div>
          <span
            className={`text-[10px] font-bold ${
              isGraded && passed
                ? 'text-emerald-600'
                : isGraded && failed
                ? 'text-rose-600'
                : hasSubmitted
                ? 'text-blue-600'
                : isUnit
                ? 'text-primary-600'
                : 'text-emerald-600'
            }`}
          >
            {isGraded && passed
              ? '✨ مبروك! تجاوزت الاختبار'
              : isGraded && failed
              ? 'لم تتجاوز درجة النجاح'
              : hasSubmitted
              ? 'قيد التصحيح'
              : isUnit
              ? 'اختبار الوحدة الشامل'
              : 'الامتحان الشامل والنهائي للكورس'}
          </span>
          <h4 className="text-xs font-bold text-slate-900">
            {quiz.title}{' '}
            {isGraded && scoreObtained != null ? (
              <span
                className={`font-mono ${passed ? 'text-emerald-600' : 'text-rose-500'}`}
              >
                ({scoreObtained}/{totalScore} د)
              </span>
            ) : (
              <span className="text-slate-400">({totalScore} د)</span>
            )}
          </h4>
        </div>
      </div>

      {isLoading ? (
        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-transparent animate-spin shrink-0" />
      ) : hasSubmitted ? (
        <Link
          href={href}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border flex items-center gap-1.5 ${
            passed
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border-emerald-200'
              : failed
              ? 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border-rose-200'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isPending ? 'عرض الإجابات' : 'النتيجة والمراجعة'}
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
