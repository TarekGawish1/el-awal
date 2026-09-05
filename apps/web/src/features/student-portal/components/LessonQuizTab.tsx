'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { AssessmentSummary, CourseModule, CourseLesson } from '@/features/courses/types/courses.types';
import { useAssessment } from '@/features/assessments/hooks/use-assessments';
import toast from 'react-hot-toast';

interface LessonQuizTabProps {
  lessonTitle?: string;
  courseId?: string;
  lessonId?: string;
  lessonQuiz?: AssessmentSummary | null;
  lessonHomework?: AssessmentSummary | null;
  unitQuiz?: AssessmentSummary | null;
  courseQuiz?: AssessmentSummary | null;
  enforceSequentialLessons?: boolean;
  completedLessonIds?: string[];
  activeModule?: CourseModule | null;
  allModules?: CourseModule[];
  allLessons?: CourseLesson[];
  isPreviewMode?: boolean;
  onBypassQuiz?: (lessonId?: string) => void;
  onSelectLesson?: (lessonId: string) => void;
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
  isLocked = false,
  lockReason,
  onBypassQuiz,
  nextLesson,
  onSelectNextLesson,
}: {
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
}) {
  // Fetch the assessment detail for the review link + answers. But prefer the
  // submission/score that arrived WITH the lesson-viewer payload (immediate, no
  // 60s-staleTime/invalidation-timing dependency) so the mark shows on return.
  const { data: detail, isLoading } = useAssessment(quiz.id);

  // Check if a preview submission exists in local storage (teacher preview testing)
  const previewSavedSubmission = React.useMemo(() => {
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
  const scoreObtained: number | null = isGraded && mySubmission?.scoreObtained != null
    ? Number(mySubmission.scoreObtained)
    : null;
  const passingScore: number | null =
    quiz.passingScore != null
      ? Number(quiz.passingScore)
      : detail?.passingScore != null
      ? Number(detail.passingScore)
      : null;
  const totalScore = Number(quiz.totalScore);
  const percentage =
    totalScore > 0 && scoreObtained != null
      ? Math.round((scoreObtained / totalScore) * 100)
      : 0;
  const hasThreshold = passingScore != null;
  // With no passing threshold, a graded score is a success — it must never render as a
  // red "fail" (e.g. a perfect score on a quiz with no set passing grade).
  const passed = scoreObtained != null && (passingScore == null || scoreObtained >= passingScore);
  const failed = scoreObtained != null && passingScore != null && scoreObtained < passingScore;
  const isPending = hasSubmitted && !isGraded;
  const allowMultipleAttempts = Boolean(quiz.allowMultipleAttempts ?? detail?.allowMultipleAttempts);
  const requirePassingScore = Boolean(quiz.requirePassingScore ?? detail?.requirePassingScore);

  const href =
    level === 'lesson'
      ? `/student/assessments?id=${quiz.id}&courseId=${courseId || ''}&lessonId=${lessonId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`
      : `/student/assessments?id=${quiz.id}&courseId=${courseId || ''}&returnUrl=${encodeURIComponent(learnRoomUrl)}`;
  // Retake lands directly in the solver (the assessments page reads &retake=1).
  const retakeHref = `${href}&retake=1`;

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
                      {hasThreshold ? 'مبروك! لقد اجتزت الاختبار بنجاح 🎉' : 'تم تصحيح اختبارك ✅'}
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
                    درجة{hasThreshold ? ` — فوق درجة النجاح (${passingScore} د) ✨` : ' — عمل ممتاز ✨'}
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

          {/* Footer row with score banner + actions */}
          <div className="px-5 py-4 bg-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span>🎓</span>
                  <span>
                    درجتك في الاختبار: {scoreObtained} / {totalScore} ({percentage}%)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{quiz.title}</p>
              </div>
              <span
                className={`self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-bold border ${
                  percentage >= 50
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {percentage >= 50 ? 'ناجح - أحسنت!' : 'بحاجة لتحسين'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {nextLesson && onSelectNextLesson && (
                <button
                  type="button"
                  onClick={onSelectNextLesson}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  <span>الانتقال للدرس التالي ({nextLesson.title})</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
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
              {allowMultipleAttempts ? (
                <Link
                  href={retakeHref}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-600 hover:text-white"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  إعادة الاختبار مرة أخرى
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5" />
                  تم استنفاد المحاولة الوحيدة
                </button>
              )}
            </div>
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                اختبار الدرس السريع
              </span>
              {quiz.isOptional ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  اختياري (يمكن تجاوزه)
                </span>
              ) : requirePassingScore ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  🎯 يشترط النجاح للمتابعة
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
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

  // ── UNIT / COURSE level card (compact) ──────────────────────────────────────
  const isUnit = level === 'unit';

  if (isLocked && !hasSubmitted) {
    return (
      <div
        className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-2xs opacity-85 transition-opacity hover:opacity-100"
      >
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
                ? '✨ مبروك! تجاوزت الاختبار'
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

// ─── Main component ────────────────────────────────────────────────────────────
export function LessonQuizTab({
  lessonTitle,
  courseId,
  lessonId,
  lessonQuiz,
  lessonHomework,
  unitQuiz,
  courseQuiz,
  enforceSequentialLessons = false,
  completedLessonIds = [],
  activeModule = null,
  allModules = [],
  allLessons = [],
  isPreviewMode = false,
  onBypassQuiz,
  onSelectLesson,
}: LessonQuizTabProps) {
  const pathname = usePathname();
  const isTeacherPreview = isPreviewMode || (pathname?.includes('/preview') ?? false);

  const learnRoomUrl = courseId
    ? isTeacherPreview
      ? `/teacher/courses/${courseId}/preview${lessonId ? `?lessonId=${lessonId}` : ''}`
      : `/student/courses/${courseId}/learn${lessonId ? `?lessonId=${lessonId}` : ''}`
    : '/student/courses';

  // 1. UNIT QUIZ LOCKING
  const currentUnitLessons = activeModule?.lessons || [];
  const totalInUnit = currentUnitLessons.length;
  const completedInUnit = currentUnitLessons.filter((l) => completedLessonIds.includes(l.id)).length;
  const isUnitLessonsCompleted = totalInUnit > 0 ? completedInUnit >= totalInUnit : true;
  const isUnitQuizLocked = enforceSequentialLessons && !isUnitLessonsCompleted;
  const unitQuizLockReason = `مقفل — يجب إكمال جميع دروس واختبارات الوحدة (${completedInUnit}/${totalInUnit}) أولاً`;

  // 2. COURSE FINAL EXAM LOCKING
  const totalCourseLessons = allLessons.length;
  const completedAllCourseLessons = totalCourseLessons > 0 ? completedLessonIds.length >= totalCourseLessons : true;

  // Check if all units have their unit quizzes submitted (optional unit quizzes do not block!)
  const uncompletedUnits = allModules.filter((mod) => {
    if (!mod.unitQuizId && !mod.unitQuiz) return false;
    const uq = mod.unitQuiz;
    if (uq?.isOptional) return false; // Optional unit exams do not block final exam!
    if (uq?.mySubmission) return false;
    if (typeof window !== 'undefined') {
      const uqId = mod.unitQuizId || uq?.id;
      if (uqId && localStorage.getItem(`el_awal_preview_quiz_${uqId}`)) return false;
    }
    return true;
  });
  const hasUncompletedUnits = uncompletedUnits.length > 0;

  const isCourseQuizLocked = enforceSequentialLessons && (!completedAllCourseLessons || hasUncompletedUnits);
  let courseQuizLockReason = '';
  if (isCourseQuizLocked) {
    if (!completedAllCourseLessons) {
      courseQuizLockReason = `مقفل — يجب إنهاء جميع دروس المنهج (${completedLessonIds.length}/${totalCourseLessons}) أولاً`;
    } else if (hasUncompletedUnits) {
      courseQuizLockReason = `مقفل — يجب إنهاء اختبارات جميع الوحدات أولاً قبل دخول الامتحان النهائي`;
    } else {
      courseQuizLockReason = 'مقفل — يجب إتمام جميع دروس واختبارات المنهج أولاً';
    }
  }

  // In enforceSequentialLessons mode, only show unit quiz once all lessons in the unit are finished,
  // and only show course final quiz once all lessons in the entire course are finished.
  const shouldShowUnitQuiz = Boolean(
    unitQuiz && (!enforceSequentialLessons || isUnitLessonsCompleted)
  );
  const shouldShowCourseQuiz = Boolean(
    courseQuiz && (!enforceSequentialLessons || completedAllCourseLessons)
  );

  const presentQuizzes = [
    lessonQuiz,
    lessonHomework,
    shouldShowUnitQuiz ? unitQuiz : null,
    shouldShowCourseQuiz ? courseQuiz : null,
  ].filter(Boolean) as AssessmentSummary[];

  const hasAnyQuiz = presentQuizzes.length > 0;

  const currentIdx = allLessons?.findIndex((l) => l.id === lessonId) ?? -1;
  const nextLesson =
    currentIdx !== -1 && allLessons && currentIdx + 1 < allLessons.length
      ? allLessons[currentIdx + 1]
      : null;

  if (!hasAnyQuiz) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-2 text-right shadow-sm">
        <Award className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-xs text-slate-700 font-bold">لا يوجد اختبار أو واجب مرتبط بهذا الدرس مباشرة</p>
        <p className="text-[11px] text-slate-400">
          استمر في متابعة الدروس القادمة لإجراء الاختبارات الشاملة للوحدات والمنهج.
        </p>
      </div>
    );
  }

  // The attempt policy is now per-quiz, so summarise it across the quizzes actually shown.
  const allAllowMultiple =
    presentQuizzes.length > 0 && presentQuizzes.every((q) => q.allowMultipleAttempts);
  const noneAllowMultiple = presentQuizzes.every((q) => !q.allowMultipleAttempts);

  return (
    <div className="space-y-4 text-right animate-in fade-in">
      {/* Sequential Progression Notice (when enforced) */}
      {enforceSequentialLessons && (
        <div className="flex items-center gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 shadow-2xs">
          <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span className="font-bold">
            ترتيب المنهج الإلزامي مفعّل من إعدادات الكورس — يتم فتح اختبار الوحدة بعد إتمام دروسها، والامتحان النهائي بعد إتمام كافة اختبارات الدروس والوحدات.
          </span>
        </div>
      )}

      {/* Attempt-policy notice */}
      {allAllowMultiple ? (
        <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
          <RefreshCcw className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
          <span>يمكنك إعادة المحاولة — تُحتسب أعلى درجة كدرجة رسمية مع الاحتفاظ بسجل كل المحاولات</span>
        </div>
      ) : noneAllowMultiple ? (
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
          <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>يُسمح بمحاولة واحدة فقط لكل اختبار — تأكد من إجاباتك قبل التسليم النهائي</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
          <FileQuestion className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>تختلف سياسة المحاولات بين الاختبارات — راجع الملاحظة أسفل كل اختبار</span>
        </div>
      )}

      {/* 0. LESSON LEVEL HOMEWORK */}
      {lessonHomework && (
        <QuizCard
          quiz={lessonHomework}
          level="lesson"
          courseId={courseId}
          lessonId={lessonId}
          learnRoomUrl={learnRoomUrl}
          onBypassQuiz={onBypassQuiz ? () => onBypassQuiz(lessonId) : undefined}
          nextLesson={nextLesson}
          onSelectNextLesson={nextLesson && onSelectLesson ? () => onSelectLesson(nextLesson.id) : undefined}
        />
      )}

      {/* 1. LESSON LEVEL QUIZ */}
      {lessonQuiz && (
        <QuizCard
          quiz={lessonQuiz}
          level="lesson"
          courseId={courseId}
          lessonId={lessonId}
          learnRoomUrl={learnRoomUrl}
          onBypassQuiz={onBypassQuiz ? () => onBypassQuiz(lessonId) : undefined}
          nextLesson={nextLesson}
          onSelectNextLesson={nextLesson && onSelectLesson ? () => onSelectLesson(nextLesson.id) : undefined}
        />
      )}

      {/* 2. UNIT LEVEL QUIZ */}
      {shouldShowUnitQuiz && unitQuiz && (
        <QuizCard
          quiz={unitQuiz}
          level="unit"
          courseId={courseId}
          lessonId={lessonId}
          learnRoomUrl={learnRoomUrl}
          isLocked={isUnitQuizLocked}
          lockReason={unitQuizLockReason}
          onBypassQuiz={onBypassQuiz ? () => onBypassQuiz(lessonId) : undefined}
        />
      )}

      {/* 3. COURSE LEVEL FINAL QUIZ */}
      {shouldShowCourseQuiz && courseQuiz && (
        <QuizCard
          quiz={courseQuiz}
          level="course"
          courseId={courseId}
          lessonId={lessonId}
          learnRoomUrl={learnRoomUrl}
          isLocked={isCourseQuizLocked}
          lockReason={courseQuizLockReason}
        />
      )}
    </div>
  );
}
