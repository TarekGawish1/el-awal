'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Award,
  Lock,
  RefreshCcw,
  FileQuestion,
} from 'lucide-react';
import { AssessmentSummary, CourseModule, CourseLesson } from '@/features/courses/types/courses.types';
import { QuizCard } from './quiz-tab/QuizCard';

export interface LessonQuizTabProps {
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
    if (uq?.isOptional) return false;
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
