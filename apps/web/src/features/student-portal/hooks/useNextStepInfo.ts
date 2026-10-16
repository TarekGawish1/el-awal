'use client';

import { useMemo } from 'react';
import { CourseLesson } from '@/features/courses/types/courses.types';

export interface NextStepActionInfo {
  type: 'lesson_quiz' | 'unit_quiz' | 'course_quiz';
  title: string;
  isOptional: boolean;
  totalScore?: number;
  quizId: string;
  badge: string;
  actionText: string;
  isReady?: boolean;
}

export interface UseNextStepInfoProps {
  course: any;
  activeLesson: any;
  lessonViewer: any;
  activeModule: any;
  completedLessonIds: string[];
  areAllLessonsCompleted: boolean;
}

export function useNextStepInfo({
  course,
  activeLesson,
  lessonViewer,
  activeModule,
  completedLessonIds,
  areAllLessonsCompleted,
}: UseNextStepInfoProps): NextStepActionInfo | null {
  return useMemo(() => {
    if (!course || !activeLesson) return null;

    if (lessonViewer?.lessonQuiz) {
      const q = lessonViewer.lessonQuiz;
      const isSubmitted = Boolean(
        q.mySubmission && (q.mySubmission.status === 'SUBMITTED' || q.mySubmission.status === 'GRADED')
      );
      const isPassed =
        q.mySubmission?.isPassed ?? ((q.mySubmission?.scoreObtained ?? 0) >= (q.passingScore ?? 0));
      const mustPass =
        q.requirePassingScore !== undefined
          ? Boolean(q.requirePassingScore)
          : Boolean(course.requireExamPassingToUnlock);
      const isDone = isSubmitted && (!mustPass || isPassed);

      if (!isDone) {
        return {
          type: 'lesson_quiz',
          title: `اختبار الدرس: ${q.title}`,
          isOptional: Boolean(q.isOptional),
          totalScore: q.totalScore,
          quizId: q.id,
          badge: q.isOptional
            ? 'اختياري لتثبيت الفهم'
            : mustPass
            ? 'إجباري (يشترط النجاح للمتابعة)'
            : 'إجباري للانتقال للدرس التالي',
          actionText: 'بدء اختبار الدرس الآن 📝',
        };
      }
    }

    if (lessonViewer?.lessonHomework) {
      const hw = lessonViewer.lessonHomework;
      const isSubmitted = Boolean(
        hw.mySubmission && (hw.mySubmission.status === 'SUBMITTED' || hw.mySubmission.status === 'GRADED')
      );
      const isPassed =
        hw.mySubmission?.isPassed ?? ((hw.mySubmission?.scoreObtained ?? 0) >= (hw.passingScore ?? 0));
      const mustPass =
        hw.requirePassingScore !== undefined
          ? Boolean(hw.requirePassingScore)
          : Boolean(course.requireExamPassingToUnlock);
      const isDone = isSubmitted && (!mustPass || isPassed);

      if (!isDone) {
        return {
          type: 'lesson_quiz',
          title: `واجب الدرس: ${hw.title}`,
          isOptional: Boolean(hw.isOptional),
          totalScore: hw.totalScore,
          quizId: hw.id,
          badge: hw.isOptional
            ? 'واجب اختياري للتطبيق'
            : mustPass
            ? 'إجباري (يشترط النجاح للمتابعة)'
            : 'إجباري للانتقال للدرس التالي',
          actionText: 'بدء حل الواجب الآن 📝',
        };
      }
    }

    if (activeModule?.unitQuiz) {
      const uq = lessonViewer?.unitQuiz || activeModule.unitQuiz;
      const isSubmitted = Boolean(
        uq.mySubmission && (uq.mySubmission.status === 'SUBMITTED' || uq.mySubmission.status === 'GRADED')
      );
      const isPassed =
        uq.mySubmission?.isPassed ?? ((uq.mySubmission?.scoreObtained ?? 0) >= (uq.passingScore ?? 0));
      const mustPass =
        uq.requirePassingScore !== undefined
          ? Boolean(uq.requirePassingScore)
          : Boolean(course.requireExamPassingToUnlock);
      const isDone = isSubmitted && (!mustPass || isPassed);

      if (!isDone) {
        const modLessons: CourseLesson[] = activeModule.lessons || [];
        const allLessonsDoneInModule = modLessons.every((l) =>
          completedLessonIds.includes(l.id)
        );

        return {
          type: 'unit_quiz',
          title: `امتحان الوحدة: ${uq.title} (${activeModule.title})`,
          isOptional: Boolean(uq.isOptional),
          totalScore: uq.totalScore,
          quizId: uq.id,
          badge: uq.isOptional
            ? 'امتحان اختياري شامل'
            : mustPass
            ? 'مطلوب النجاح لاجتياز الوحدة'
            : 'مطلوب لاجتياز الوحدة وفتح الوحدة التالية',
          actionText: allLessonsDoneInModule
            ? 'بدء امتحان الوحدة الآن 🎯'
            : 'امتحان الوحدة بانتظارك بعد إتمام الدروس 📝',
          isReady: allLessonsDoneInModule,
        };
      }
    }

    if (course.courseQuiz && areAllLessonsCompleted) {
      const cq = lessonViewer?.courseQuiz || course.courseQuiz;
      const isSubmitted = Boolean(
        cq.mySubmission && (cq.mySubmission.status === 'SUBMITTED' || cq.mySubmission.status === 'GRADED')
      );
      const isPassed =
        cq.mySubmission?.isPassed ?? ((cq.mySubmission?.scoreObtained ?? 0) >= (cq.passingScore ?? 0));
      const mustPass =
        cq.requirePassingScore !== undefined
          ? Boolean(cq.requirePassingScore)
          : Boolean(course.requireExamPassingToUnlock);
      const isDone = isSubmitted && (!mustPass || isPassed);

      if (!isDone) {
        return {
          type: 'course_quiz',
          title: `الامتحان الشامل والنهائي للدورة: ${cq.title}`,
          isOptional: Boolean(cq.isOptional),
          totalScore: cq.totalScore,
          quizId: cq.id,
          badge: 'مطلوب للحصول على شهادة التخرج والتقدير',
          actionText: 'بدء الامتحان النهائي الشامل 🏆',
          isReady: true,
        };
      }
    }

    return null;
  }, [
    course,
    activeLesson,
    lessonViewer,
    activeModule,
    completedLessonIds,
    areAllLessonsCompleted,
  ]);
}
