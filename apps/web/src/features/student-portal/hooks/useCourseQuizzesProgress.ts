'use client';

import { useMemo } from 'react';
import { CourseModule, CourseLesson } from '@/features/courses/types/courses.types';

export interface UseCourseQuizzesProgressProps {
  course: any;
  lessonViewer: any;
  selectedLessonId: string | null;
  activeModule: any;
  isPreviewMode: boolean;
}

export function useCourseQuizzesProgress({
  course,
  lessonViewer,
  selectedLessonId,
  activeModule,
  isPreviewMode,
}: UseCourseQuizzesProgressProps) {
  return useMemo(() => {
    if (!course) {
      return { allQuizzes: [], completedQuizzesCount: 0, areAllQuizzesCompleted: true, averageExamScore: 100 };
    }

    const quizzes: { id: string; title: string; quiz: any; type: 'lesson' | 'unit' | 'course' }[] = [];

    (course.modules || []).forEach((mod: CourseModule) => {
      (mod.lessons || []).forEach((les: CourseLesson) => {
        if (les.lessonQuiz) {
          const quizObj =
            les.id === selectedLessonId && lessonViewer?.lessonQuiz
              ? lessonViewer.lessonQuiz
              : les.lessonQuiz;
          quizzes.push({ id: quizObj.id, title: quizObj.title, quiz: quizObj, type: 'lesson' });
        }
        if (les.lessonHomework) {
          const hwObj =
            les.id === selectedLessonId && lessonViewer?.lessonHomework
              ? lessonViewer.lessonHomework
              : les.lessonHomework;
          quizzes.push({ id: hwObj.id, title: hwObj.title, quiz: hwObj, type: 'lesson' });
        }
        if (les.assessments && Array.isArray(les.assessments)) {
          les.assessments.forEach((ass: any) => {
            if (ass?.id) {
              quizzes.push({ id: ass.id, title: ass.title, quiz: ass, type: 'lesson' });
            }
          });
        }
      });
    });

    (course.modules || []).forEach((mod: CourseModule) => {
      if (mod.unitQuiz) {
        const quizObj =
          mod.id === activeModule?.id && lessonViewer?.unitQuiz
            ? lessonViewer.unitQuiz
            : mod.unitQuiz;
        quizzes.push({ id: quizObj.id, title: quizObj.title, quiz: quizObj, type: 'unit' });
      }
    });

    if (course.courseQuiz) {
      const quizObj = lessonViewer?.courseQuiz || course.courseQuiz;
      quizzes.push({ id: quizObj.id, title: quizObj.title, quiz: quizObj, type: 'course' });
    }

    const uniqueQuizzes = Array.from(new Map(quizzes.map((q) => [q.id, q])).values());

    if (uniqueQuizzes.length === 0) {
      return { allQuizzes: [], completedQuizzesCount: 0, areAllQuizzesCompleted: true, averageExamScore: 100 };
    }

    let totalScoreObtained = 0;
    let totalMaxScore = 0;

    const completed = uniqueQuizzes.filter((item) => {
      const q = item.quiz;
      let sub = q.mySubmission;

      if (isPreviewMode && !sub && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(`el_awal_preview_quiz_${q.id}`);
          if (raw) {
            const p = JSON.parse(raw);
            sub = {
              status: p.status || 'GRADED',
              scoreObtained: p.score ?? p.scoreObtained,
              attemptNumber: 1,
              isPassed: p.isPassed ?? true,
            };
          }
        } catch {}
      }

      if (!sub) return false;
      const isSubmitted = sub.status === 'SUBMITTED' || sub.status === 'GRADED';
      if (!isSubmitted) return false;

      if (sub.scoreObtained != null && q.totalScore) {
        totalScoreObtained += Number(sub.scoreObtained);
        totalMaxScore += Number(q.totalScore);
      }

      const mustPass =
        q.requirePassingScore !== undefined
          ? Boolean(q.requirePassingScore)
          : Boolean(course.requireExamPassingToUnlock);
      if (mustPass) {
        const passScore = q.passingScore ?? 0;
        const score = sub.scoreObtained ?? 0;
        const passed = sub.isPassed ?? score >= passScore;
        return passed;
      }

      return true;
    });

    const averageExamScore =
      totalMaxScore > 0 ? Math.round((totalScoreObtained / totalMaxScore) * 100) : 100;

    return {
      allQuizzes: uniqueQuizzes,
      completedQuizzesCount: completed.length,
      areAllQuizzesCompleted: completed.length === uniqueQuizzes.length,
      averageExamScore,
    };
  }, [course, lessonViewer, selectedLessonId, activeModule?.id, isPreviewMode]);
}
