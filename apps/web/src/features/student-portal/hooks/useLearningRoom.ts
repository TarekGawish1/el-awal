'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCourseDetail, useLessonViewer, useLessonStreamAuth } from '@/features/courses/hooks/useCourses';
import { useAuth } from '@/features/auth';
import { CourseModule, CourseLesson } from '@/features/courses/types/courses.types';
import { useLessonSecurity } from './useLessonSecurity';
import { useLessonProgress } from './useLessonProgress';
import { useNextStepInfo, NextStepActionInfo } from './useNextStepInfo';

export type { NextStepActionInfo };

export interface UseLearningRoomProps {
  courseId: string;
  initialLessonId?: string;
}

export function useLearningRoom({ courseId, initialLessonId }: UseLearningRoomProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routeParams = useParams();
  const effectiveCourseId = (courseId || routeParams?.id) as string;
  const { data: course, isLoading: isCourseLoading, refetch: refetchCourse } = useCourseDetail(effectiveCourseId);
  const { user } = useAuth();
  const isTeacherOrAdmin = user?.role === 'TEACHER' || user?.role === 'SECRETARIAT';
  const isPreviewMode = isTeacherOrAdmin && (pathname?.includes('/preview') ?? false);

  const progressScopeId = user?.studentProfileId || user?.id || 'anon';

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(initialLessonId || null);
  const [activeTab, setActiveTab] = useState<'summary' | 'qa' | 'resources' | 'quiz'>('summary');
  const [isMobileSyllabusOpen, setIsMobileSyllabusOpen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const { data: lessonViewer, isLoading: isLessonLoading, refetch: refetchLesson } = useLessonViewer(
    selectedLessonId || ''
  );

  const appliedInitialLessonRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialLessonId && appliedInitialLessonRef.current !== initialLessonId) {
      appliedInitialLessonRef.current = initialLessonId;
      setSelectedLessonId(initialLessonId);
      return;
    }
    if (!selectedLessonId && course?.modules?.length) {
      for (const mod of course.modules) {
        if (mod.lessons && mod.lessons.length > 0) {
          setSelectedLessonId(mod.lessons[0].id);
          break;
        }
      }
    }
  }, [course, initialLessonId, selectedLessonId]);

  const {
    data: streamAuth,
    isLoading: isStreamAuthLoading,
    refetch: refetchStreamAuth,
  } = useLessonStreamAuth(selectedLessonId || '');

  const security = useLessonSecurity();

  const activeModule = course?.modules?.find((m: CourseModule) =>
    m.lessons?.some((l: CourseLesson) => l.id === selectedLessonId)
  );
  const activeLesson = activeModule?.lessons?.find((l: CourseLesson) => l.id === selectedLessonId);

  const allLessons: CourseLesson[] = (course?.modules || []).flatMap(
    (m: CourseModule) => m.lessons || []
  );

  const progress = useLessonProgress({
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
  });

  // Official Bunny Stream Player.js SDK instance integration
  useEffect(() => {
    let playerInstance: any = null;

    const attachPlayerJs = () => {
      if (typeof window === 'undefined' || !iframeRef.current) return;
      const playerjs = (window as any).playerjs;
      if (!playerjs) return;

      try {
        playerInstance = new playerjs.Player(iframeRef.current);
        playerInstance.on('ready', () => {
          progress.initIframePlayer();
          playerInstance.on('ended', () => {
            progress.handleVideoProgressOrEnd();
          });
          playerInstance.on('timeupdate', (data: any) => {
            if (data?.duration > 0 && typeof data?.seconds === 'number') {
              progress.handleVideoProgressOrEnd(data.seconds, data.duration);
            }
          });
        });
        playerInstance.on('ended', () => {
          progress.handleVideoProgressOrEnd();
        });
      } catch {}
    };

    if (typeof window !== 'undefined') {
      if (!(window as any).playerjs) {
        const existingScript = document.querySelector('script[src*="player-0.1.0.min.js"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js';
          script.async = true;
          script.onload = attachPlayerJs;
          document.body.appendChild(script);
        } else {
          existingScript.addEventListener('load', attachPlayerJs);
        }
      } else {
        attachPlayerJs();
      }
    }

    return () => {
      try {
        if (playerInstance?.destroy) playerInstance.destroy();
      } catch {}
    };
  }, [streamAuth?.embedUrl, progress.initIframePlayer, progress.handleVideoProgressOrEnd]);

  // Listen for Bunny Stream Player.js / HTML5 postMessage events
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let payload = event.data;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {
            if (payload === 'ended' || payload.includes('"event":"ended"')) {
              progress.handleVideoProgressOrEnd();
              return;
            }
          }
        }

        if (!payload) return;

        if (payload.event === 'ready' || (payload.context === 'player.js' && payload.event === 'ready')) {
          progress.initIframePlayer();
        }

        const eventName = payload.event || payload.type || payload.action || payload.status;
        if (
          eventName === 'ended' ||
          eventName === 'player:ended' ||
          eventName === 'finish' ||
          eventName === 'complete' ||
          payload === 'ended'
        ) {
          progress.handleVideoProgressOrEnd();
          return;
        }

        if (payload.context === 'player.js') {
          if (payload.event === 'ended') {
            progress.handleVideoProgressOrEnd();
            return;
          }
          if (payload.event === 'timeupdate' && payload.value) {
            const { seconds, duration } = payload.value;
            if (typeof seconds === 'number' && typeof duration === 'number') {
              progress.handleVideoProgressOrEnd(seconds, duration);
              return;
            }
          }
        }

        const seconds = payload.seconds ?? payload.currentTime ?? payload.value?.seconds;
        const duration = payload.duration ?? payload.value?.duration;
        if (typeof seconds === 'number' && typeof duration === 'number' && duration > 0) {
          progress.handleVideoProgressOrEnd(seconds, duration);
        }
      } catch {
        // Ignore
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [selectedLessonId, progress.handleVideoProgressOrEnd, progress.initIframePlayer]);

  // Certificate Modal State
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const courseCompletedToastShownRef = useRef(false);

  useEffect(() => {
    if (progress.isCourseFullyCompleted && !courseCompletedToastShownRef.current) {
      courseCompletedToastShownRef.current = true;
      toast.success('🎓 تهانينا! أتممت الدورة وجميع اختباراتها بنجاح! يمكنك استلام شهادتك الآن!', {
        duration: 6000,
      });
    }
  }, [progress.isCourseFullyCompleted]);

  const handleClaimCertificate = () => {
    if (!progress.isCourseFullyCompleted) {
      if (!progress.areAllLessonsCompleted) {
        toast.error('يجب إكمال جميع دروس الدورة أولاً للحصول على الشهادة 📚🔒');
      } else {
        toast.error(
          `يجب حل واجتياز جميع اختبارات الدورة (${progress.completedQuizzesCount}/${progress.allQuizzes.length}) للحصول على شهادة الإتمام 📝🔒`
        );
        setActiveTab('quiz');
        const tabsElement = document.getElementById('lesson-content-tabs');
        if (tabsElement) tabsElement.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    setIsCertificateOpen(true);
  };

  const handleSeekToTimestamp = useCallback((seekSeconds: number) => {
    videoContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (iframeRef.current?.contentWindow) {
      try {
        const win = iframeRef.current.contentWindow;
        win.postMessage(
          JSON.stringify({
            context: 'player.js',
            method: 'setCurrentTime',
            value: [seekSeconds],
            version: '0.0.11',
          }),
          '*'
        );
        win.postMessage(
          JSON.stringify({
            context: 'player.js',
            method: 'play',
            value: [],
            version: '0.0.11',
          }),
          '*'
        );
      } catch {}
      return;
    }

    if (videoRef.current) {
      try {
        videoRef.current.currentTime = seekSeconds;
        videoRef.current.play().catch(() => {});
      } catch {}
    }
  }, []);

  const handleSelectQuizFromSidebar = useCallback(
    (quizId: string) => {
      setIsMobileSyllabusOpen(false);
      const isTeacher = isPreviewMode || (pathname?.includes('/preview') ?? false);
      const returnUrl = courseId
        ? isTeacher
          ? `/teacher/courses/${courseId}/preview${selectedLessonId ? `?lessonId=${selectedLessonId}` : ''}`
          : `/student/courses/${courseId}/learn${selectedLessonId ? `?lessonId=${selectedLessonId}` : ''}`
        : '/student/courses';

      window.location.href = `/student/assessments?id=${quizId}&courseId=${courseId}&returnUrl=${encodeURIComponent(
        returnUrl
      )}`;
    },
    [courseId, isPreviewMode, pathname, selectedLessonId]
  );

  const nextStepInfo = useNextStepInfo({
    course,
    activeLesson,
    lessonViewer,
    activeModule,
    completedLessonIds: progress.completedLessonIds,
    areAllLessonsCompleted: progress.areAllLessonsCompleted,
  });

  const certData = {
    studentName: (user as any)?.fullName || (user as any)?.name || 'الطالب',
    courseTitle: course?.title || '',
    teacherName:
      (course as any)?.teacher?.user?.fullName ||
      (course as any)?.teacherName ||
      'أ. أحمد غريب',
    subject: course?.subject || 'المنهج الدراسي',
    gradeLevel: course?.gradeLevel || 'الصف الدراسي',
    academicStage: course?.academicStage || 'المرحلة الدراسية',
    score: String(progress.averageExamScore || '100'),
    completedAt: new Date().toISOString(),
  };

  return {
    courseId,
    course,
    isCourseLoading,
    refetchCourse,
    refetchLesson,
    user,
    isTeacherOrAdmin,
    isPreviewMode,
    selectedLessonId,
    setSelectedLessonId,
    activeTab,
    setActiveTab,
    isMobileSyllabusOpen,
    setIsMobileSyllabusOpen,
    lessonViewer,
    isLessonLoading,
    streamAuth,
    isStreamAuthLoading,
    refetchStreamAuth,
    activeModule,
    activeLesson,
    allLessons,
    security,
    progress,
    iframeRef,
    videoRef,
    videoContainerRef,
    isCertificateOpen,
    setIsCertificateOpen,
    handleClaimCertificate,
    handleSeekToTimestamp,
    handleSelectQuizFromSidebar,
    nextStepInfo,
    certData,
    router,
    pathname,
  };
}
