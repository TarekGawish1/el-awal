'use client';

import React from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Sparkles,
  XCircle,
  Star,
  ArrowLeft,
  CheckCircle2,
  RefreshCcw,
  Lock,
} from 'lucide-react';
import { ScoreRing } from './ScoreRing';
import { CourseLesson, AssessmentSummary } from '@/features/courses/types/courses.types';

interface QuizGradedResultBannerProps {
  quiz: AssessmentSummary;
  scoreObtained: number;
  totalScore: number;
  passingScore: number | null;
  hasThreshold: boolean;
  passed: boolean;
  percentage: number;
  href: string;
  retakeHref: string;
  allowMultipleAttempts: boolean;
  nextLesson?: CourseLesson | null;
  onSelectNextLesson?: () => void;
}

export function QuizGradedResultBanner({
  quiz,
  scoreObtained,
  totalScore,
  passingScore,
  hasThreshold,
  passed,
  percentage,
  href,
  retakeHref,
  allowMultipleAttempts,
  nextLesson,
  onSelectNextLesson,
}: QuizGradedResultBannerProps) {
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
                  {hasThreshold ? 'مبروك! لقد اجتزت الاختبار بنجاح' : 'تم تصحيح اختبارك'}
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
                درجة{hasThreshold ? ` (فوق درجة النجاح: ${passingScore} درجة)` : ' (نتيجة ممتازة)'}
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
              <GraduationCap className="w-4 h-4 text-primary-600 shrink-0" />
              <span>
                درجتك في الاختبار: {scoreObtained} / {totalScore} ({percentage}%)
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{quiz.title}</p>
          </div>
          <span
            className={`self-start sm:self-auto px-3 py-1 rounded-md text-[11px] font-bold border ${
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
