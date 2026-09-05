'use client';

import React from 'react';
import {
  Layers,
  Video,
  CheckCircle,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Lock,
  Play,
  FileQuestion,
} from 'lucide-react';
import { CourseModule, CourseLesson, AssessmentSummary } from '@/features/courses/types/courses.types';
import toast from 'react-hot-toast';

interface CourseSyllabusSidebarProps {
  modules: CourseModule[];
  allLessons?: CourseLesson[]; // ordered flat list for sequential unlock calculation
  activeLessonId: string | null;
  activeQuizId?: string | null;
  onSelectLesson: (lessonId: string) => void;
  onSelectQuiz?: (quizId: string) => void;
  completedLessonIds?: string[];
  enforceSequentialLessons?: boolean;
  requireExamPassingToUnlock?: boolean;
}

export function CourseSyllabusSidebar({
  modules = [],
  allLessons,
  activeLessonId,
  activeQuizId,
  onSelectLesson,
  onSelectQuiz,
  completedLessonIds = [],
  enforceSequentialLessons = false,
  requireExamPassingToUnlock = false,
}: CourseSyllabusSidebarProps) {
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const totalUnitQuizzes = modules.filter((m) => Boolean(m.unitQuiz)).length;
  const completedCount = completedLessonIds.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  /**
   * Helper to determine if a quiz (lesson quiz or unit quiz) is satisfied.
   * If isOptional is true, it is ALWAYS considered satisfied so it never blocks progression!
   */
  const isQuizSatisfied = React.useCallback(
    (quiz?: AssessmentSummary | null) => {
      if (!quiz) return true;
      if (quiz.isOptional) return true; // Optional exams/quizzes NEVER block student progression
      const submission = quiz.mySubmission;
      if (!submission) return false;
      const mustPass = Boolean(quiz.requirePassingScore);
      if (mustPass) {
        const passScore = quiz.passingScore ?? 0;
        const score = submission.scoreObtained ?? 0;
        return submission.isPassed ?? score >= passScore;
      }
      return submission.status === 'SUBMITTED' || submission.status === 'GRADED';
    },
    []
  );

  /**
   * Helper to determine if all mandatory assessments (quiz, homework) for a lesson are satisfied.
   */
  const areLessonAssessmentsSatisfied = React.useCallback(
    (les?: CourseLesson | null) => {
      if (!les) return true;
      if (les.lessonQuiz && !les.lessonQuiz.isOptional && !isQuizSatisfied(les.lessonQuiz)) {
        return false;
      }
      if (les.lessonHomework && !les.lessonHomework.isOptional && !isQuizSatisfied(les.lessonHomework)) {
        return false;
      }
      if (les.assessments && Array.isArray(les.assessments)) {
        for (const ass of les.assessments) {
          if (!ass.isOptional && !isQuizSatisfied(ass)) {
            return false;
          }
        }
      }
      return true;
    },
    [isQuizSatisfied]
  );

  /**
   * Determine whether a unit quiz is unlocked.
   */
  const isUnitQuizUnlocked = React.useCallback(
    (mod: CourseModule, modIndex: number) => {
      if (!enforceSequentialLessons) return true;

      // 1. All lessons in the current unit must be completed
      const currentLessons = mod.lessons || [];
      const allCurrentCompleted = currentLessons.every((l) => completedLessonIds.includes(l.id));
      if (!allCurrentCompleted) return false;

      // 2. All previous units must have all their lessons completed AND mandatory unit quizzes satisfied
      for (let m = 0; m < modIndex; m++) {
        const prevMod = modules[m];
        const prevLessons = prevMod.lessons || [];
        const allPrevCompleted = prevLessons.every((l) => completedLessonIds.includes(l.id));
        if (!allPrevCompleted) return false;
        if (prevMod.unitQuiz && !prevMod.unitQuiz.isOptional && !isQuizSatisfied(prevMod.unitQuiz)) {
          return false;
        }
      }

      return true;
    },
    [enforceSequentialLessons, completedLessonIds, modules, isQuizSatisfied]
  );

  /**
   * Compute the set of unlocked lesson IDs when sequential enforcement is active.
   * - In module 0, the first lesson is always unlocked; subsequent lessons unlock when the previous is completed & its quiz satisfied.
   * - In module M > 0, lessons are locked until ALL previous modules (0..M-1) have their lessons completed AND mandatory unit quizzes passed/submitted.
   */
  const unlockedLessonIds = React.useMemo<Set<string>>(() => {
    const unlocked = new Set<string>();

    if (!enforceSequentialLessons) {
      // When not enforcing, all lessons are unlocked
      modules.forEach((m) => m.lessons?.forEach((l) => unlocked.add(l.id)));
      return unlocked;
    }

    for (let modIndex = 0; modIndex < modules.length; modIndex++) {
      const mod = modules[modIndex];
      const modLessons = (mod.lessons || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);

      // Check if all previous units are fully completed & their mandatory unit quizzes satisfied
      let canAccessCurrentUnit = true;
      for (let prevIdx = 0; prevIdx < modIndex; prevIdx++) {
        const prevMod = modules[prevIdx];
        const prevLessons = prevMod.lessons || [];
        const allPrevLessonsCompleted = prevLessons.every((l) => completedLessonIds.includes(l.id));
        if (!allPrevLessonsCompleted) {
          canAccessCurrentUnit = false;
          break;
        }
        if (prevMod.unitQuiz && !prevMod.unitQuiz.isOptional && !isQuizSatisfied(prevMod.unitQuiz)) {
          canAccessCurrentUnit = false;
          break;
        }
      }

      if (!canAccessCurrentUnit) {
        // Previous unit requirements not satisfied — keep all lessons in this module locked
        continue;
      }

      // Within this accessible unit, unlock sequentially
      for (let i = 0; i < modLessons.length; i++) {
        const les = modLessons[i];
        if (i === 0) {
          unlocked.add(les.id);
        } else {
          const prevLes = modLessons[i - 1];
          const isPrevCompleted = completedLessonIds.includes(prevLes.id);
          const isPrevAssessmentsDone = areLessonAssessmentsSatisfied(prevLes);
          if (isPrevCompleted && isPrevAssessmentsDone) {
            unlocked.add(les.id);
          }
        }
      }
    }

    return unlocked;
  }, [enforceSequentialLessons, modules, completedLessonIds, isQuizSatisfied, areLessonAssessmentsSatisfied]);

  const handleLessonClick = (lesson: CourseLesson) => {
    if (!unlockedLessonIds.has(lesson.id)) {
      // Find which module this lesson belongs to
      const modIndex = modules.findIndex((m) => m.lessons?.some((l) => l.id === lesson.id));

      if (modIndex > 0) {
        // Check if locked due to previous unit requirements
        for (let m = 0; m < modIndex; m++) {
          const prevMod = modules[m];
          const prevLessons = prevMod.lessons || [];
          const hasUncompleted = prevLessons.some((l) => !completedLessonIds.includes(l.id));
          if (hasUncompleted) {
            toast(`يجب إتمام جميع دروس الوحدة السابقة (${prevMod.title}) أولاً لفتح دروس هذه الوحدة 🔒`, { icon: '⚠️' });
            return;
          }
          if (prevMod.unitQuiz && !prevMod.unitQuiz.isOptional && !isQuizSatisfied(prevMod.unitQuiz)) {
            const mustPassUnit = Boolean(prevMod.unitQuiz.requirePassingScore);
            if (mustPassUnit && prevMod.unitQuiz.mySubmission && !prevMod.unitQuiz.mySubmission.isPassed) {
              toast(
                `يجب اجتياز امتحان الوحدة السابقة (${prevMod.title}) بدرجة النجاح (${prevMod.unitQuiz.passingScore} من ${prevMod.unitQuiz.totalScore}) أولاً 🎯🔒`,
                { icon: '⚠️' }
              );
            } else {
              toast(`يجب أداء وتسليم امتحان الوحدة السابقة (${prevMod.title}) أولاً لفتح دروس هذه الوحدة 📝🔒`, { icon: '⚠️' });
            }
            return;
          }
        }
      }

      // Check if locked due to intra-unit lesson order
      if (modIndex >= 0) {
        const mod = modules[modIndex];
        const modLessons = (mod.lessons || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
        const idx = modLessons.findIndex((l) => l.id === lesson.id);
        const prev = idx > 0 ? modLessons[idx - 1] : null;

        if (prev?.lessonQuiz && !prev.lessonQuiz.isOptional && !isQuizSatisfied(prev.lessonQuiz)) {
          const mustPassQuiz = Boolean(prev.lessonQuiz.requirePassingScore);
          if (mustPassQuiz && prev.lessonQuiz.mySubmission && !prev.lessonQuiz.mySubmission.isPassed) {
            toast(
              `يجب اجتياز اختبار الدرس السابق (${prev.title}) بدرجة النجاح (${prev.lessonQuiz.passingScore} من ${prev.lessonQuiz.totalScore}) لفتح هذا الدرس 🎯🔒`,
              { icon: '⚠️' }
            );
          } else {
            toast(`يجب حل وتسليم اختبار الدرس السابق (${prev.title}) أولاً لفتح هذا الدرس 📝🔒`, { icon: '⚠️' });
          }
          return;
        }

        if (prev?.lessonHomework && !prev.lessonHomework.isOptional && !isQuizSatisfied(prev.lessonHomework)) {
          const mustPassHw = Boolean(prev.lessonHomework.requirePassingScore);
          if (mustPassHw && prev.lessonHomework.mySubmission && !prev.lessonHomework.mySubmission.isPassed) {
            toast(
              `يجب اجتياز واجب الدرس السابق (${prev.title}) بدرجة النجاح (${prev.lessonHomework.passingScore} من ${prev.lessonHomework.totalScore}) لفتح هذا الدرس 🎯🔒`,
              { icon: '⚠️' }
            );
          } else {
            toast(`يجب حل وتسليم واجب الدرس السابق (${prev.title}) أولاً لفتح هذا الدرس 📝🔒`, { icon: '⚠️' });
          }
          return;
        }
      }

      toast('يجب إتمام الدرس السابق أولاً قبل الانتقال لهذا الدرس 🔒', { icon: '⚠️' });
      return;
    }
    onSelectLesson(lesson.id);
  };

  const handleUnitQuizClick = (mod: CourseModule, modIndex: number) => {
    if (!mod.unitQuiz) return;
    const isUnlocked = isUnitQuizUnlocked(mod, modIndex);
    if (!isUnlocked) {
      const currentLessons = mod.lessons || [];
      const completedInUnit = currentLessons.filter((l) => completedLessonIds.includes(l.id)).length;
      if (completedInUnit < currentLessons.length) {
        toast(
          `يجب إتمام جميع دروس الوحدة (${completedInUnit} من ${currentLessons.length}) أولاً لفتح امتحان الوحدة 🔒`,
          { icon: '⚠️' }
        );
        return;
      }
      toast('امتحان الوحدة مقفل حتى إنهاء متطلبات الوحدات السابقة 🔒', { icon: '⚠️' });
      return;
    }

    if (onSelectQuiz) {
      onSelectQuiz(mod.unitQuiz.id);
    } else {
      toast('يرجى التوجه لتبويب الاختبارات لبدء الامتحان 📝');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full text-right shadow-sm">
      {/* Header with Progress Bar */}
      <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">محتوى ومنهج الدورة</span>
          <span className="text-xs font-bold text-primary-600 font-mono">{progressPercent}% مكتمل</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary-600 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{totalLessons} دروس مصورة {totalUnitQuizzes > 0 ? `• ${totalUnitQuizzes} امتحانات وحدات` : ''}</span>
          <span>{completedCount} من {totalLessons} مكتملة</span>
        </div>

        {/* Sequential enforcement badge */}
        {enforceSequentialLessons && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <Lock className="w-3 h-3 shrink-0" />
            <span className="font-bold">المنهج مرتب بالتسلسل — أكمل كل درس وامتحان وحدة للانتقال للتالي</span>
          </div>
        )}
      </div>

      {/* Syllabus Units Accordion List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
        {modules.map((mod: CourseModule, modIndex: number) => {
          return (
            <div key={mod.id} className="p-3.5 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-primary-600">
                  الوحدة {modIndex + 1}: {mod.title}
                </span>
                <span className="text-[10px] text-slate-400">
                  {mod.lessons?.length || 0} دروس {mod.unitQuiz ? '• 📝 امتحان وحدة' : ''}
                </span>
              </div>

              {/* Lessons in Unit */}
              <div className="space-y-1">
                {mod.lessons?.map((les: CourseLesson) => {
                  const isActive = les.id === activeLessonId;
                  const isCompleted = completedLessonIds.includes(les.id);
                  const isLocked = !unlockedLessonIds.has(les.id);

                  return (
                    <button
                      key={les.id}
                      type="button"
                      onClick={() => handleLessonClick(les)}
                      title={isLocked ? 'أكمل المتطلبات السابقة للوصول لهذا الدرس' : les.title}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all text-right ${
                        isActive
                          ? 'bg-primary-50 text-primary-900 font-bold border-r-4 border-primary-600 shadow-sm'
                          : isLocked
                          ? 'opacity-60 cursor-not-allowed bg-slate-50 text-slate-400'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-600'
                              : isLocked
                              ? 'bg-slate-200 text-slate-400'
                              : isActive
                              ? 'bg-primary-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : isLocked ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                        </div>

                        <div className="truncate">
                          <p className="truncate text-xs">{les.title}</p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            {les.videoDurationSeconds ? (
                              <span>{Math.floor(les.videoDurationSeconds / 60)} دقيقة</span>
                            ) : null}
                            {les.isPreview && (
                              <span className="text-emerald-600 font-bold">• مجاني</span>
                            )}
                            {isLocked && (
                              <span className="text-amber-500 font-bold">• مقفل</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {les.lessonQuiz && !isLocked && (
                        <span
                          title={les.lessonQuiz.isOptional ? 'اختبار اختياري' : 'اختبار إجباري'}
                          className="flex items-center gap-1"
                        >
                          <Award
                            className={`w-3.5 h-3.5 shrink-0 ${
                              les.lessonQuiz.isOptional ? 'text-blue-500' : 'text-amber-500'
                            }`}
                          />
                          {les.lessonQuiz.isOptional && (
                            <span className="text-[9px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded font-bold">
                              اختياري
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Unit Exam Card if present */}
              {mod.unitQuiz && (() => {
                const quiz = mod.unitQuiz;
                const isUnitUnlocked = isUnitQuizUnlocked(mod, modIndex);
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
                      key={`unit-quiz-${mod.id}`}
                      type="button"
                      onClick={() => handleUnitQuizClick(mod, modIndex)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all text-right border ${
                        isQuizActive
                          ? 'bg-amber-50 text-amber-950 font-bold border-amber-300 shadow-sm'
                          : isUnitCompleted
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-50'
                          : !isUnitUnlocked
                          ? 'opacity-65 bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-50/50 border-amber-200 text-slate-800 hover:bg-amber-50 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                            isUnitCompleted
                              ? 'bg-emerald-500 text-white'
                              : !isUnitUnlocked
                              ? 'bg-slate-200 text-slate-400'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {isUnitCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : !isUnitUnlocked ? (
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
                            {!isUnitUnlocked && (
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
                        ) : !isUnitUnlocked ? (
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
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
