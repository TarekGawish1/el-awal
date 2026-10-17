'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CourseModule, CourseLesson, AssessmentSummary } from '@/features/courses/types/courses.types';
import toast from 'react-hot-toast';

interface UseCourseSyllabusProgressionProps {
  modules: CourseModule[];
  completedLessonIds?: string[];
  enforceSequentialLessons?: boolean;
  courseQuiz?: AssessmentSummary | null;
  onSelectLesson: (lessonId: string) => void;
  onSelectQuiz?: (quizId: string) => void;
}

export function useCourseSyllabusProgression({
  modules = [],
  completedLessonIds = [],
  enforceSequentialLessons = false,
  courseQuiz,
  onSelectLesson,
  onSelectQuiz,
}: UseCourseSyllabusProgressionProps) {
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const totalUnitQuizzes = modules.filter((m) => Boolean(m.unitQuiz)).length;
  const completedCount = completedLessonIds.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(modules.slice(0, 1).map((module) => module.id))
  );

  useEffect(() => {
    setExpandedModules((previous) => {
      const availableModuleIds = new Set(modules.map((module) => module.id));
      const next = new Set([...previous].filter((id) => availableModuleIds.has(id)));
      if (next.size === 0 && modules[0]) next.add(modules[0].id);
      return next;
    });
  }, [modules]);

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules((previous) => {
      const next = new Set(previous);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  /**
   * Helper to determine if a quiz (lesson quiz or unit quiz) is satisfied.
   * If isOptional is true, it is ALWAYS considered satisfied so it never blocks progression!
   */
  const isQuizSatisfied = useCallback(
    (quiz?: AssessmentSummary | null) => {
      if (!quiz) return true;
      if (quiz.isOptional) return true;
      const submission = quiz.mySubmission;
      if (!submission) return false;
      const mustPass = Boolean(quiz.requirePassingScore);
      if (mustPass) {
        const passScore = quiz.passingScore ?? 0;
        const score = submission.scoreObtained ?? 0;
        const isPassed = submission.isPassed ?? score >= passScore;
        if (isPassed) return true;
        if (!quiz.allowMultipleAttempts) return true;
        return false;
      }
      return submission.status === 'SUBMITTED' || submission.status === 'GRADED';
    },
    []
  );

  /**
   * Helper to determine if all mandatory assessments (quiz, homework) for a lesson are satisfied.
   */
  const areLessonAssessmentsSatisfied = useCallback(
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
  const isUnitQuizUnlocked = useCallback(
    (mod: CourseModule, modIndex: number) => {
      if (!enforceSequentialLessons) return true;

      const currentLessons = mod.lessons || [];
      const allCurrentCompleted = currentLessons.every((l) => completedLessonIds.includes(l.id));
      if (!allCurrentCompleted) return false;

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
   */
  const unlockedLessonIds = useMemo<Set<string>>(() => {
    const unlocked = new Set<string>();

    if (!enforceSequentialLessons) {
      modules.forEach((m) => m.lessons?.forEach((l) => unlocked.add(l.id)));
      return unlocked;
    }

    for (let modIndex = 0; modIndex < modules.length; modIndex++) {
      const mod = modules[modIndex];
      const modLessons = (mod.lessons || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);

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
        continue;
      }

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
      const modIndex = modules.findIndex((m) => m.lessons?.some((l) => l.id === lesson.id));

      if (modIndex > 0) {
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

  const isCourseQuizUnlocked = useMemo(() => {
    if (!enforceSequentialLessons) return true;
    const allLessonsDone = totalLessons > 0 ? completedCount >= totalLessons : true;
    if (!allLessonsDone) return false;
    for (let m = 0; m < modules.length; m++) {
      const mod = modules[m];
      if (mod.unitQuiz && !mod.unitQuiz.isOptional && !isQuizSatisfied(mod.unitQuiz)) {
        return false;
      }
    }
    return true;
  }, [enforceSequentialLessons, totalLessons, completedCount, modules, isQuizSatisfied]);

  const handleCourseQuizClick = () => {
    if (!courseQuiz) return;
    if (!isCourseQuizUnlocked) {
      if (completedCount < totalLessons) {
        toast(
          `يجب إتمام جميع دروس المنهج (${completedCount} من ${totalLessons}) أولاً لفتح الامتحان النهائي 🔒`,
          { icon: '⚠️' }
        );
        return;
      }
      toast('الامتحان النهائي مقفل حتى إنهاء اختبارات جميع الوحدات 🔒', { icon: '⚠️' });
      return;
    }
    if (onSelectQuiz) {
      onSelectQuiz(courseQuiz.id);
    }
  };

  return {
    totalLessons,
    totalUnitQuizzes,
    completedCount,
    progressPercent,
    expandedModules,
    toggleModuleExpanded,
    unlockedLessonIds,
    handleLessonClick,
    handleUnitQuizClick,
    isUnitQuizUnlocked,
    isCourseQuizUnlocked,
    handleCourseQuizClick,
  };
}
