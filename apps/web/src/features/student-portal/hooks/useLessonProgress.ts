'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { coursesApi } from '@/features/courses/api/courses.api';
import { CourseLesson } from '@/features/courses/types/courses.types';
import { useCourseQuizzesProgress } from './useCourseQuizzesProgress';
import { usePostVideoPrompt, PostVideoPromptState } from './usePostVideoPrompt';
import { useLessonNavigation } from './useLessonNavigation';
import { validateLessonCompletionRequirements } from '../utils/lessonCompletionValidator';

export type { PostVideoPromptState };

export interface UseLessonProgressProps {
  courseId: string;
  course: any;
  selectedLessonId: string | null;
  setSelectedLessonId: (id: string) => void;
  lessonViewer: any;
  activeLesson: any;
  activeModule: any;
  allLessons: CourseLesson[];
  progressScopeId: string;
  refetchLesson: () => Promise<any>;
  refetchCourse: () => Promise<any>;
  setActiveTab: (tab: 'summary' | 'qa' | 'resources' | 'quiz') => void;
  isPreviewMode: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export function useLessonProgress({
  courseId,
  course,
  selectedLessonId,
  setSelectedLessonId,
  lessonViewer,
  activeLesson,
  activeModule,
  allLessons,
  progressScopeId,
  refetchLesson,
  refetchCourse,
  setActiveTab,
  isPreviewMode,
  iframeRef,
}: UseLessonProgressProps) {
  const progressStorageKey = `el_awal_course_progress_${courseId}_${progressScopeId}`;
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const sessionCompletedRef = useRef<Set<string>>(new Set());

  const markLessonCompletedLocally = useCallback((lessonId: string) => {
    sessionCompletedRef.current.add(lessonId);
    setCompletedLessonIds((prev) => Array.from(new Set([...prev, lessonId])));
  }, []);

  // Seed from the per-student local cache once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(progressStorageKey);
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length) {
        setCompletedLessonIds((prev) => Array.from(new Set([...prev, ...parsed])));
      }
    } catch {}
  }, [progressStorageKey]);

  // Reconcile with the server whenever course details load/refresh
  useEffect(() => {
    if (!course) return;
    const serverList: string[] = Array.isArray(course.completedLessonIds)
      ? course.completedLessonIds
      : [];
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (isOnline) {
      setCompletedLessonIds(serverList);
      sessionCompletedRef.current = new Set(serverList);
      try {
        localStorage.setItem(progressStorageKey, JSON.stringify(serverList));
      } catch {}
    } else {
      setCompletedLessonIds((prev) => Array.from(new Set([...prev, ...serverList])));
    }
  }, [course, progressStorageKey]);

  // Persist (per-student) whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(completedLessonIds));
    } catch {}
  }, [completedLessonIds, progressStorageKey]);

  const { advanceToNextLesson } = useLessonNavigation({
    course,
    allLessons,
    setSelectedLessonId,
    setActiveTab,
  });

  // Sync completed state from lessonViewer
  useEffect(() => {
    if (lessonViewer?.isCompleted && selectedLessonId) {
      markLessonCompletedLocally(selectedLessonId);
    }
  }, [lessonViewer?.isCompleted, selectedLessonId, markLessonCompletedLocally]);

  const isLessonCompleted = selectedLessonId
    ? completedLessonIds.includes(selectedLessonId)
    : false;

  // Stable references for player callbacks
  const selectedLessonIdRef = useRef(selectedLessonId);
  const isLessonCompletedRef = useRef(isLessonCompleted);
  const lessonViewerRef = useRef(lessonViewer);
  const activeLessonRef = useRef(activeLesson);
  const refetchLessonRef = useRef(refetchLesson);

  const currentPlaybackSecondsRef = useRef<number | undefined>(undefined);
  const [currentPlaybackSeconds, setCurrentPlaybackSeconds] = useState<number | undefined>(undefined);

  useEffect(() => {
    currentPlaybackSecondsRef.current = undefined;
    setCurrentPlaybackSeconds(undefined);
  }, [selectedLessonId]);

  useEffect(() => { selectedLessonIdRef.current = selectedLessonId; }, [selectedLessonId]);
  useEffect(() => { isLessonCompletedRef.current = isLessonCompleted; }, [isLessonCompleted]);
  useEffect(() => { lessonViewerRef.current = lessonViewer; }, [lessonViewer]);
  useEffect(() => { activeLessonRef.current = activeLesson; }, [activeLesson]);
  useEffect(() => { refetchLessonRef.current = refetchLesson; }, [refetchLesson]);

  const completionTriggeredRef = useRef<string | null>(null);
  const advancedLessonRef = useRef<string | null>(null);

  const notifiedLessonIdsRef = useRef<string[]>([]);
  const notifiedStorageKeyRef = useRef(`el_awal_video_notified_${courseId}_${progressScopeId}`);

  useEffect(() => {
    notifiedStorageKeyRef.current = `el_awal_video_notified_${courseId}_${progressScopeId}`;
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(notifiedStorageKeyRef.current);
      const parsed = saved ? JSON.parse(saved) : null;
      notifiedLessonIdsRef.current = Array.isArray(parsed) ? parsed : [];
    } catch {
      notifiedLessonIdsRef.current = [];
    }
  }, [courseId, progressScopeId]);

  const { postVideoPrompt, setPostVideoPrompt, triggerPostVideoPrompt } = usePostVideoPrompt(selectedLessonId);

  useEffect(() => {
    completionTriggeredRef.current = null;
    advancedLessonRef.current = null;
  }, [selectedLessonId]);

  const handleVideoProgressOrEnd = useCallback(
    async (seconds?: number, duration?: number) => {
      const lessonId = selectedLessonIdRef.current;
      if (!lessonId) return;

      if (typeof seconds === 'number') {
        currentPlaybackSecondsRef.current = seconds;
        setCurrentPlaybackSeconds((prev) =>
          prev === undefined || Math.abs(seconds - prev) >= 1 ? Math.floor(seconds) : prev
        );
      }

      const isHardEnd =
        (seconds === undefined && duration === undefined) ||
        (typeof seconds === 'number' && typeof duration === 'number' && duration > 0 && seconds >= duration - 1);

      const isMostWatched =
        isHardEnd ||
        (typeof seconds === 'number' && typeof duration === 'number' && duration > 0 && seconds >= duration * 0.8) ||
        (typeof seconds === 'number' && typeof duration === 'number' && duration > 0 && seconds >= duration - 3);

      const currentLessonViewer = lessonViewerRef.current;
      const currentActiveLesson = activeLessonRef.current;
      const currentIsCompleted = isLessonCompletedRef.current;
      const currentQuiz = currentLessonViewer?.lessonQuiz;
      const currentHomework = currentLessonViewer?.lessonHomework;
      const targetAssessment = currentQuiz || currentHomework;
      const isHw = Boolean(!currentQuiz && currentHomework);

      const sub = targetAssessment?.mySubmission;
      const isAssessmentDone = Boolean(
        sub &&
          (sub.status === 'SUBMITTED' || sub.status === 'GRADED') &&
          (!targetAssessment?.requirePassingScore || sub.isPassed)
      );
      const hasUncompletedAssessment = Boolean(targetAssessment && !isAssessmentDone);
      const isMandatoryQuiz = Boolean(
        hasUncompletedAssessment &&
          (currentQuiz ? !currentQuiz.isOptional : currentHomework ? !currentHomework.isOptional : false)
      );

      if (isMostWatched && completionTriggeredRef.current !== lessonId) {
        completionTriggeredRef.current = lessonId;

        if (!notifiedLessonIdsRef.current.includes(lessonId) && !currentIsCompleted) {
          notifiedLessonIdsRef.current = [...notifiedLessonIdsRef.current, lessonId];
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(
                notifiedStorageKeyRef.current,
                JSON.stringify(notifiedLessonIdsRef.current)
              );
            } catch {}
          }
        }

        coursesApi
          .updateLessonProgress(lessonId, {
            isCompleted: !isMandatoryQuiz,
            lastPositionSeconds: Math.round(seconds || 0),
          })
          .then(() => {
            refetchLessonRef.current();
          })
          .catch(() => {});

        if (!isMandatoryQuiz && !currentIsCompleted) {
          markLessonCompletedLocally(lessonId);
        }

        if (hasUncompletedAssessment && targetAssessment) {
          triggerPostVideoPrompt(
            lessonId,
            currentActiveLesson?.title || '',
            targetAssessment,
            isHw
          );
        } else if (!currentIsCompleted) {
          toast.success('أحسنت! تمت مشاهدة شرح الدرس وتم رصد إتمامه بنجاح 🎯');
        }
      }

      if (isHardEnd && !isMandatoryQuiz && !hasUncompletedAssessment && advancedLessonRef.current !== lessonId) {
        advancedLessonRef.current = lessonId;
        advanceToNextLesson(lessonId);
      }
    },
    [markLessonCompletedLocally, advanceToNextLesson, triggerPostVideoPrompt]
  );

  const initIframePlayer = useCallback(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      const target = iframeRef.current.contentWindow;
      const sendRegister = (event: string) => {
        target.postMessage(
          JSON.stringify({
            context: 'player.js',
            method: 'addEventListener',
            value: event,
            version: '0.0.11',
          }),
          '*'
        );
      };
      sendRegister('ended');
      sendRegister('timeupdate');
      sendRegister('ready');
    } catch {}
  }, [iframeRef]);

  // Overall course completion checks via dedicated sub-hook
  const totalLessonsCount = allLessons.length;
  const areAllLessonsCompleted = totalLessonsCount > 0 && completedLessonIds.length >= totalLessonsCount;

  const { allQuizzes, completedQuizzesCount, areAllQuizzesCompleted, averageExamScore } = useCourseQuizzesProgress({
    course,
    lessonViewer,
    selectedLessonId,
    activeModule,
    isPreviewMode,
  });

  const isCourseFullyCompleted = areAllLessonsCompleted && areAllQuizzesCompleted;

  // Toggle complete manually
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const handleToggleComplete = async () => {
    if (!selectedLessonId) return;
    const lessonId = selectedLessonId;
    const nextCompleted = !isLessonCompleted;

    if (nextCompleted) {
      const validation = validateLessonCompletionRequirements(lessonViewer);
      if (!validation.allowed) {
        if (validation.errorMessage) toast.error(validation.errorMessage);
        if (validation.focusTab) setActiveTab(validation.focusTab);
        return;
      }
    }

    if (nextCompleted) {
      markLessonCompletedLocally(lessonId);
    } else {
      setCompletedLessonIds((prev) => prev.filter((id) => id !== lessonId));
    }

    try {
      setIsMarkingComplete(true);
      await coursesApi.updateLessonProgress(lessonId, {
        isCompleted: nextCompleted,
        lastPositionSeconds: lessonViewer?.lastPositionSeconds || 0,
      });
      await refetchLesson();
      await refetchCourse();
      toast.success(nextCompleted ? 'أحسنت! تم إتمام الدرس بنجاح 🎉' : 'تم إلغاء إتمام الدرس');
      if (nextCompleted) {
        advanceToNextLesson(lessonId);
      }
    } catch (err: any) {
      setCompletedLessonIds((prev) =>
        isLessonCompleted
          ? Array.from(new Set([...prev, lessonId]))
          : prev.filter((id) => id !== lessonId)
      );
      toast.error(err?.message || 'تعذر تحديث حالة إتمام الدرس');
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const handleBypassQuiz = useCallback(
    async (targetLessonId?: string) => {
      const id = targetLessonId || selectedLessonId;
      if (!id) return;
      markLessonCompletedLocally(id);
      try {
        await coursesApi.updateLessonProgress(id, {
          isCompleted: true,
          lastPositionSeconds: 0,
        });
        await refetchLesson();
        toast.success('تم تخطي الاختبار الاختياري بنجاح والتقدم ⏭️');
        advanceToNextLesson(id);
      } catch {
        toast.error('تعذر تسجيل التخطي');
      }
    },
    [selectedLessonId, markLessonCompletedLocally, refetchLesson, advanceToNextLesson]
  );

  return {
    completedLessonIds,
    setCompletedLessonIds,
    sessionCompletedRef,
    progressStorageKey,
    notifiedStorageKeyRef,
    isLessonCompleted,
    isMarkingComplete,
    currentPlaybackSeconds,
    postVideoPrompt,
    setPostVideoPrompt,
    allQuizzes,
    completedQuizzesCount,
    areAllQuizzesCompleted,
    averageExamScore,
    areAllLessonsCompleted,
    isCourseFullyCompleted,
    handleToggleComplete,
    handleBypassQuiz,
    advanceToNextLesson,
    handleVideoProgressOrEnd,
    initIframePlayer,
  };
}
