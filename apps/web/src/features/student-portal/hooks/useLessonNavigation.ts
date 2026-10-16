'use client';

import { useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CourseLesson, CourseModule } from '@/features/courses/types/courses.types';

export interface UseLessonNavigationProps {
  course: any;
  allLessons: CourseLesson[];
  setSelectedLessonId: (id: string) => void;
  setActiveTab: (tab: 'summary' | 'qa' | 'resources' | 'quiz') => void;
}

export function useLessonNavigation({
  course,
  allLessons,
  setSelectedLessonId,
  setActiveTab,
}: UseLessonNavigationProps) {
  const allLessonsRef = useRef<CourseLesson[]>(allLessons);
  useEffect(() => {
    allLessonsRef.current = allLessons;
  }, [allLessons]);

  const advanceToNextLesson = useCallback(
    (currentLessonId: string) => {
      const lessons = allLessonsRef.current;
      const idx = lessons.findIndex((l) => l.id === currentLessonId);
      if (idx === -1) return;
      const next = lessons[idx + 1];
      if (!next) return;

      const currentModule = course?.modules?.find((m: CourseModule) =>
        m.lessons?.some((l: CourseLesson) => l.id === currentLessonId)
      );
      const nextModule = course?.modules?.find((m: CourseModule) =>
        m.lessons?.some((l: CourseLesson) => l.id === next.id)
      );

      if (currentModule && nextModule && currentModule.id !== nextModule.id) {
        if (currentModule.unitQuiz && !currentModule.unitQuiz.isOptional) {
          const uq = currentModule.unitQuiz;
          const sub = uq.mySubmission;
          let isSatisfied = false;
          if (sub && (sub.status === 'SUBMITTED' || sub.status === 'GRADED')) {
            const mustPass = Boolean(uq.requirePassingScore);
            if (mustPass) {
              const passScore = uq.passingScore ?? 0;
              const score = sub.scoreObtained ?? 0;
              const passed = sub.isPassed ?? score >= passScore;
              isSatisfied = passed || !uq.allowMultipleAttempts;
            } else {
              isSatisfied = true;
            }
          }
          if (!isSatisfied) {
            setActiveTab('quiz');
            toast(
              `أحسنت بإنهاء دروس الوحدة (${currentModule.title})! يرجى أداء امتحان الوحدة أولاً لفتح دروس الوحدة التالية 🎯📝`,
              { icon: '🔒', duration: 5500 }
            );
            const el =
              document.getElementById(`quiz-card-${uq.id}`) ||
              document.getElementById('lesson-content-tabs');
            el?.scrollIntoView({ behavior: 'smooth' });
            return;
          }
        }
      }

      setSelectedLessonId(next.id);
      setActiveTab('summary');
    },
    [course, setSelectedLessonId, setActiveTab]
  );

  return { advanceToNextLesson };
}
