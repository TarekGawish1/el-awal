'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Award,
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  Lock,
  Trophy,
  Hourglass,
  XCircle,
  RefreshCcw,
} from 'lucide-react';
import { AssessmentSummary, CourseLesson } from '@/features/courses/types/courses.types';
import { useAssessment } from '@/features/assessments/hooks/use-assessments';
import { QuizGradedResultBanner } from './QuizGradedResultBanner';
import toast from 'react-hot-toast';

interface QuizCardProps {
  quiz: AssessmentSummary;
  level: 'lesson' | 'unit' | 'course';
  courseId?: string;
  lessonId?: string;
  learnRoomUrl: string;
  isLocked?: boolean;
  lockReason?: string;
  onBypassQuiz?: () => void;
  nextLesson?: CourseLesson | null;
  onSelectNextLesson?: () => void;
}

export function QuizCard({
  quiz,
  level,
  courseId,
  lessonId,
  learnRoomUrl,
  isLocked = false,
  lockReason,
  onBypassQuiz,
  nextLesson,
  onSelectNextLesson,
}: QuizCardProps) {
  const { data: detail, isLoading } = useAssessment(quiz.id);

  const previewSavedSubmission = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`el_awal_preview_quiz_${quiz.id}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [quiz.id]);

  const mySubmission = quiz.mySubmission ?? detail?.mySubmission ?? previewSavedSubmission ?? null;
  const hasSubmitted = Boolean(mySubmission);
  const isGraded = mySubmission?.status === 'GRADED';
  const scoreObtained: number | null =
    isGraded && mySubmission?.scoreObtained != null ? Number(mySubmission.scoreObtained) : null;
  const passingScore: number | null =
    quiz.passingScore != null
      ? Number(quiz.passingScore)
      : detail?.passingScore != null
      ? Number(detail.passingScore)
      : null;
  const totalScore = Number(quiz.totalScore);
  const percentage =
    totalScore > 0 && scoreObtained != null ? Math.round((scoreObtained / totalScore) * 100) : 0;
  const hasThreshold = passingScore != null;
  const passed = scoreObtained != null && (passingScore == null || scoreObtained >= passingScore);
  const failed = scoreObtained != null && passingScore != null && scoreObtained < passingScore;
  const isPending = hasSubmitted && !isGraded;
  const allowMultipleAttempts = Boolean(quiz.allowMultipleAttempts ?? detail?.allowMultipleAttempts);
  const requirePassingScore = Boolean(quiz.requirePassingScore ?? detail?.requirePassingScore);

  const href =
    level === 'lesson'
      ? `/student/assessments?id=${quiz.id}&courseId=${courseId || ''}&lessonId=${lessonId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`
      : `/student/assessments?id=${quiz.id}&courseId=${courseId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`;
  const retakeHref = `${href}&retake=1`;

  // ── LESSON level card ────────────────────────────────────────────────────────
  if (level === 'lesson') {
    if (isGraded && scoreObtained != null) {
      return (
        <QuizGradedResultBanner
          quiz={quiz}
          scoreObtained={scoreObtained}
          totalScore={totalScore}
          passingScore={passingScore}
          hasThreshold={hasThreshold}
          passed={passed}
          percentage={percentage}
          href={href}
          retakeHref={retakeHref}
          allowMultipleAttempts={allowMultipleAttempts}
          nextLesson={nextLesson}
          onSelectNextLesson={onSelectNextLesson}
        />
      );
    }

    if (isPending) {
      return (
        <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
              <Hourglass className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                تم تسليم الاختبار
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{quiz.title}</h3>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">
                إجاباتك قيد التصحيح والمراجعة من المعلم، وستظهر درجتك هنا فور الاعتماد
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

    return (
      <div
        id={`quiz-card-${quiz.id}`}
        className="bg-primary-50/50 border border-primary-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                اختبار الدرس السريع
              </span>
              {quiz.isOptional ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  اختياري (يمكن تجاوزه)
                </span>
              ) : requirePassingScore ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  يشترط النجاح للمتابعة
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  إجباري للمتابعة
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1">{quiz.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              الدرجة الإجمالية: {quiz.totalScore} درجة
              {quiz.durationMinutes ? ` • المدة: ${quiz.durationMinutes} دقيقة` : ''}
              {quiz.passingScore ? ` • درجة النجاح: ${quiz.passingScore}` : ''}
            </p>
            <p
              className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                allowMultipleAttempts ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {allowMultipleAttempts ? (
                <>
                  <RefreshCcw className="w-3 h-3" />
                  محاولات متعددة مسموحة — تُحتسب أعلى درجة
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  محاولة واحدة فقط
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {quiz.isOptional && onBypassQuiz && (
            <button
              type="button"
              onClick={onBypassQuiz}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <span>تخطي الاختبار ومتابعة الدروس ⏭️</span>
            </button>
          )}
          {isLoading ? (
            <div className="w-8 h-8 rounded-full border-2 border-primary-300 border-t-transparent animate-spin shrink-0" />
          ) : (
            <Link
              href={href}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <span>بدء اختبار الدرس الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── UNIT / COURSE level card ────────────────────────────────────────────────
  const isUnit = level === 'unit';

  if (isLocked && !hasSubmitted) {
    return (
      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-2xs opacity-85 transition-opacity hover:opacity-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-400 border border-slate-200">
            <Lock className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
              <Lock className="w-3 h-3 inline text-amber-600" />
              <span>{lockReason || (isUnit ? 'مقفل حتى إتمام دروس الوحدة' : 'مقفل حتى إتمام المنهج')}</span>
            </span>
            <h4 className="text-xs font-bold text-slate-700">
              {quiz.title} <span className="text-slate-400 font-mono">({totalScore} د)</span>
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toast(lockReason || 'الاختبار مقفل وفقاً لترتيب المنهج الإلزامي 🔒', { icon: '⚠️' })}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-colors border bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200 cursor-not-allowed flex items-center gap-1.5 shrink-0"
          title={lockReason}
        >
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>{isUnit ? 'مقفل حتى إتمام دروس الوحدة' : 'مقفل حتى إنهاء المنهج'}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      id={`quiz-card-${quiz.id}`}
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
          <div className="flex items-center gap-1.5 flex-wrap">
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
                ? 'تم اجتياز الاختبار بنجاح'
                : isGraded && failed
                ? 'لم تتجاوز درجة النجاح'
                : hasSubmitted
                ? 'قيد التصحيح'
                : isUnit
                ? 'امتحان الوحدة الشامل'
                : 'الامتحان الشامل والنهائي للكورس'}
            </span>
            {quiz.isOptional ? (
              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                اختياري
              </span>
            ) : requirePassingScore ? (
              <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-full">
                🎯 يشترط النجاح
              </span>
            ) : (
              <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-full">
                إجباري
              </span>
            )}
          </div>
          <h4 className="text-xs font-bold text-slate-900 mt-0.5">
            {quiz.title}{' '}
            {isGraded && scoreObtained != null ? (
              <span className={`font-mono ${passed ? 'text-emerald-600' : 'text-rose-500'}`}>
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
        <div className="flex items-center gap-2 shrink-0">
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
          {isGraded && allowMultipleAttempts && (
            <Link
              href={retakeHref}
              title="إعادة المحاولة"
              className="px-3 py-2 rounded-xl text-xs font-bold transition-colors border flex items-center gap-1.5 bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-600 hover:text-white"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              إعادة
            </Link>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          {quiz.isOptional && onBypassQuiz && (
            <button
              type="button"
              onClick={onBypassQuiz}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-colors border bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs"
            >
              تخطي ⏭️
            </button>
          )}
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
        </div>
      )}
    </div>
  );
}
