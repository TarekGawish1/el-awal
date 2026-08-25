'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  FileText,
  Paperclip,
  Award,
  MessageSquare,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Menu,
  ShieldCheck,
  Video,
  Trophy,
} from 'lucide-react';
import { useCourseDetail, useLessonViewer, useLessonStreamAuth } from '@/features/courses/hooks/useCourses';
import { coursesApi } from '@/features/courses/api/courses.api';
import { useAuth } from '@/features/auth';
import { CourseModule, CourseLesson, LessonViewerData } from '@/features/courses/types/courses.types';
import { LessonQAPanel } from './LessonQAPanel';
import { LessonSummaryTab } from './LessonSummaryTab';
import { LessonResourcesTab } from './LessonResourcesTab';
import { LessonQuizTab } from './LessonQuizTab';
import { CourseSyllabusSidebar } from './CourseSyllabusSidebar';
import { CourseCertificateModal } from './CourseCertificateModal';
import toast from 'react-hot-toast';

interface StudentCourseLearningRoomProps {
  courseId: string;
  initialLessonId?: string;
}

export function StudentCourseLearningRoom({ courseId, initialLessonId }: StudentCourseLearningRoomProps) {
  const { data: course, isLoading: isCourseLoading } = useCourseDetail(courseId);
  const { user } = useAuth();

  // Per-student scope for every browser-persisted progress key. Without this the
  // localStorage keys were shared by courseId only, so a browser used by more than one
  // account (e.g. teacher previewing, then a student) leaked one account's completed
  // lessons into another's — making a brand-new student see phantom progress on first open.
  const progressScopeId = user?.studentProfileId || user?.id || 'anon';

  // Active Selected Lesson ID
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(initialLessonId || null);

  // Active Tab below video: 'summary' | 'qa' | 'resources' | 'quiz'
  const [activeTab, setActiveTab] = useState<'summary' | 'qa' | 'resources' | 'quiz'>('summary');

  // Mobile Syllabus Drawer State
  const [isMobileSyllabusOpen, setIsMobileSyllabusOpen] = useState(false);

  // Iframe ref for Bunny Stream Player.js integration
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Fetch lesson data when selectedLessonId is present
  const { data: lessonViewer, isLoading: isLessonLoading, refetch: refetchLesson } = useLessonViewer(
    selectedLessonId || ''
  );

  // Apply a `?lessonId=` deep link once (and again only if it actually changes), so
  // later navigation — advancing to the next lesson, or a manual sidebar click — is never
  // snapped back to the initial lesson. Falls back to the first lesson when nothing is set.
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

  // Fetch Secure DRM Stream Token
  const {
    data: streamAuth,
    isLoading: isStreamAuthLoading,
    refetch: refetchStreamAuth,
  } = useLessonStreamAuth(selectedLessonId || '');

  // ── Completed-lessons tracking ────────────────────────────────────────────────
  // The server (course.completedLessonIds) is the single source of truth for what THIS
  // student has completed. localStorage is only a per-student offline cache. We never
  // blindly union stale local data over the server, so progress can no longer be inflated
  // by leftover entries from an earlier session or a different account.
  const progressStorageKey = `el_awal_course_progress_${courseId}_${progressScopeId}`;
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  // Lessons completed during THIS session (optimistic — a server refetch may not reflect
  // them yet). Preserved across server reconciliations so an optimistic tick never flickers.
  const sessionCompletedRef = useRef<Set<string>>(new Set());

  const markLessonCompletedLocally = useCallback((lessonId: string) => {
    sessionCompletedRef.current.add(lessonId);
    setCompletedLessonIds((prev) => Array.from(new Set([...prev, lessonId])));
  }, []);

  // Seed from the per-student local cache once (first paint / offline fallback).
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

  // Reconcile with the server whenever course details load/refresh.
  useEffect(() => {
    if (!course) return;
    const serverList: string[] = Array.isArray((course as any).completedLessonIds)
      ? (course as any).completedLessonIds
      : [];
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (isOnline) {
      // Online: the server is authoritative. Keep only server-confirmed completions plus
      // this session's optimistic ones — drop any stale/foreign entries from the cache.
      setCompletedLessonIds(
        Array.from(new Set([...serverList, ...Array.from(sessionCompletedRef.current)])),
      );
    } else {
      // Offline: server data may be a stale cache; union it with whatever we already have.
      setCompletedLessonIds((prev) => Array.from(new Set([...prev, ...serverList])));
    }
  }, [course]);

  // Persist (per-student) whenever it changes — write even when empty so clearing sticks.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(completedLessonIds));
    } catch {}
  }, [completedLessonIds, progressStorageKey]);

  // Find active module and active lesson objects
  const activeModule = course?.modules?.find((m: CourseModule) =>
    m.lessons?.some((l: CourseLesson) => l.id === selectedLessonId)
  );
  const activeLesson = activeModule?.lessons?.find((l: CourseLesson) => l.id === selectedLessonId);

  // Calculate Overall Course Progress for this student
  const allLessons: CourseLesson[] = (course?.modules || []).flatMap((m: CourseModule) => m.lessons || []);
  const totalLessonsCount = allLessons.length;

  // Keep the flat, ordered lesson list in a ref so the stable video-completion callback can
  // resolve "the next lesson" without being re-created on every render.
  const allLessonsRef = useRef<CourseLesson[]>(allLessons);
  useEffect(() => { allLessonsRef.current = allLessons; }, [allLessons]);

  // Reveal (select) the lesson after the given one — without autoplaying it. Bunny embeds
  // never autoplay unless autoplay=true is in the URL, so simply switching the selected
  // lesson loads the next video paused. Resets to the summary tab for a clean landing.
  const advanceToNextLesson = useCallback((currentLessonId: string) => {
    const lessons = allLessonsRef.current;
    const idx = lessons.findIndex((l) => l.id === currentLessonId);
    if (idx === -1) return;
    const next = lessons[idx + 1];
    if (!next) return; // already at the final lesson — nothing to advance to
    setSelectedLessonId(next.id);
    setActiveTab('summary');
  }, []);

  // Sync completed state from lessonViewer
  useEffect(() => {
    if (lessonViewer?.isCompleted && selectedLessonId) {
      markLessonCompletedLocally(selectedLessonId);
    }
  }, [lessonViewer?.isCompleted, selectedLessonId, markLessonCompletedLocally]);

  const isLessonCompleted = selectedLessonId ? completedLessonIds.includes(selectedLessonId) : false;

  // ─── Use refs to always hold the latest values inside stable callbacks ───────
  // This prevents the player.js useEffect from re-running just because these
  // values changed, which was the root cause of the toast spam and player
  // re-registration issues.
  const selectedLessonIdRef = useRef(selectedLessonId);
  const isLessonCompletedRef = useRef(isLessonCompleted);
  const lessonViewerRef = useRef(lessonViewer);
  const activeLessonRef = useRef(activeLesson);
  const setActiveTabRef = useRef(setActiveTab);
  const refetchLessonRef = useRef(refetchLesson);

  // ─── Live playback position — updated from every timeupdate ────────────────
  // Stored in a ref so the stable handleVideoProgressOrEnd callback can update it
  // without needing to be recreated; mirrored into state only for rendering (Q&A panel).
  const currentPlaybackSecondsRef = useRef<number | undefined>(undefined);
  const [currentPlaybackSeconds, setCurrentPlaybackSeconds] = useState<number | undefined>(undefined);

  // Reset live position whenever the student navigates to a different lesson.
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

  // De-dups the "advance to next lesson" jump so a burst of end-of-video events (Bunny fires
  // both a player.js 'ended' and a final timeupdate) only advances once per lesson.
  const advancedLessonRef = useRef<string | null>(null);

  // Persistent, per-course set of lessons whose "video completed" popup has already
  // been shown, so the popup (and the quiz-tab nudge) fires only on the FIRST
  // completion — surviving reloads, tab switches, and re-watches. The in-memory
  // completionTriggeredRef below still de-dups rapid timeupdate events within a session.
  // Scoped per-student (like the progress cache) so one account's "already notified"
  // flags never suppress another account's first-completion toast on a shared browser.
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

  // Reset completion trigger state when changing lessons
  useEffect(() => {
    completionTriggeredRef.current = null;
    advancedLessonRef.current = null;
  }, [selectedLessonId]);

  // Stable completion handler — reads from refs, never needs to be recreated
  const handleVideoProgressOrEnd = useCallback(async (seconds?: number, duration?: number) => {
    const lessonId = selectedLessonIdRef.current;
    if (!lessonId) return;

    // ── Track live playback position ────────────────────────────────────────────
    if (typeof seconds === 'number') {
      currentPlaybackSecondsRef.current = seconds;
      // Throttle state updates to avoid excessive re-renders: only update React state
      // when the value has moved by at least 1 full second from the last reported value.
      setCurrentPlaybackSeconds((prev) =>
        prev === undefined || Math.abs(seconds - prev) >= 1 ? Math.floor(seconds) : prev
      );
    }

    // A genuine end-of-video: a direct 'ended' event (no args) or playback that reached the
    // final second. Distinct from the 80% "most watched" threshold so we advance to the next
    // lesson only when the student actually finished — never yanking them away mid-watch.
    const isHardEnd =
      (seconds === undefined && duration === undefined) ||
      (typeof seconds === 'number' && typeof duration === 'number' && duration > 0 && seconds >= duration - 1);

    // Check if watched most of the video (>= 80% or reached end)
    const isMostWatched =
      isHardEnd ||
      (typeof seconds === 'number' && typeof duration === 'number' && duration > 0 && seconds >= duration * 0.8) ||
      (typeof seconds === 'number' && typeof duration === 'number' && duration > 0 && seconds >= duration - 3);

    const currentLessonViewer = lessonViewerRef.current;
    const currentActiveLesson = activeLessonRef.current;
    const currentIsCompleted = isLessonCompletedRef.current;
    const hasQuiz = Boolean(
      currentLessonViewer?.lessonQuiz ||
      currentActiveLesson?.lessonQuizId
    );

    // ── Record completion (once per lesson; may fire at the 80% mark) ──────────────
    if (isMostWatched && completionTriggeredRef.current !== lessonId) {
      completionTriggeredRef.current = lessonId;

      // First-completion-only gate: if this lesson's popup was already shown (persisted
      // across reloads), or the lesson is already completed on the server, stay fully
      // silent — no toast, no automatic switch to the quiz tab.
      if (!notifiedLessonIdsRef.current.includes(lessonId) && !currentIsCompleted) {
        // Record (and persist) that we've now shown the completion popup for this lesson.
        notifiedLessonIdsRef.current = [...notifiedLessonIdsRef.current, lessonId];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              notifiedStorageKeyRef.current,
              JSON.stringify(notifiedLessonIdsRef.current)
            );
          } catch {}
        }

        if (hasQuiz) {
          setActiveTabRef.current('quiz');
          toast('أحسنت بمشاهدة شرح الدرس! يرجى حل اختبار الدرس لاحتساب إتمامه بنجاح 📝', { icon: '🎓' });
        } else {
          markLessonCompletedLocally(lessonId);
          try {
            await coursesApi.updateLessonProgress(lessonId, {
              isCompleted: true,
              lastPositionSeconds: Math.round(seconds || 0),
            });
            await refetchLessonRef.current();
            toast.success('أحسنت! تمت مشاهدة معظم شرح الدرس وتم رصد إتمامه بنجاح 🎯');
          } catch {
            // Ignore
          }
        }
      }
    }

    // ── Reveal the next lesson once the video genuinely finishes ───────────────────
    // Only for lessons without a gating quiz (quiz lessons keep the student on the quiz
    // tab until they solve it). Loads the next video paused — advanceToNextLesson only
    // re-selects, and Bunny embeds never autoplay.
    if (isHardEnd && !hasQuiz && advancedLessonRef.current !== lessonId) {
      advancedLessonRef.current = lessonId;
      advanceToNextLesson(lessonId);
    }
  }, [markLessonCompletedLocally, advanceToNextLesson]); // stable deps: both are memoized

  // Handshake Player.js event listeners on iframe load
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
  }, []);

  // Official Bunny Stream Player.js SDK instance integration
  // Dependency: only streamAuth?.embedUrl — so one player instance per video URL
  useEffect(() => {
    let playerInstance: any = null;

    const attachPlayerJs = () => {
      if (typeof window === 'undefined' || !iframeRef.current) return;
      const playerjs = (window as any).playerjs;
      if (!playerjs) return;

      try {
        playerInstance = new playerjs.Player(iframeRef.current);
        playerInstance.on('ready', () => {
          initIframePlayer();
          playerInstance.on('ended', () => {
            handleVideoProgressOrEnd();
          });
          playerInstance.on('timeupdate', (data: any) => {
            if (data?.duration > 0 && typeof data?.seconds === 'number') {
              handleVideoProgressOrEnd(data.seconds, data.duration);
            }
          });
        });
        playerInstance.on('ended', () => {
          handleVideoProgressOrEnd();
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
  }, [streamAuth?.embedUrl, initIframePlayer, handleVideoProgressOrEnd]);
  //  ↑ Only re-runs when the embed URL changes (new video), not on every state update

  // Listen for Bunny Stream Player.js / HTML5 postMessage events
  // Dependency: only selectedLessonId — re-registers only when the lesson changes
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let payload = event.data;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {
            if (payload === 'ended' || payload.includes('"event":"ended"')) {
              handleVideoProgressOrEnd();
              return;
            }
          }
        }

        if (!payload) return;

        // Player.js handshake reply
        if (payload.event === 'ready' || (payload.context === 'player.js' && payload.event === 'ready')) {
          initIframePlayer();
        }

        // Direct 'ended' event
        const eventName = payload.event || payload.type || payload.action || payload.status;
        if (
          eventName === 'ended' ||
          eventName === 'player:ended' ||
          eventName === 'finish' ||
          eventName === 'complete' ||
          payload === 'ended'
        ) {
          handleVideoProgressOrEnd();
          return;
        }

        // Player.js event format
        if (payload.context === 'player.js') {
          if (payload.event === 'ended') {
            handleVideoProgressOrEnd();
            return;
          }
          if (payload.event === 'timeupdate' && payload.value) {
            const { seconds, duration } = payload.value;
            if (typeof seconds === 'number' && typeof duration === 'number') {
              handleVideoProgressOrEnd(seconds, duration);
              return;
            }
          }
        }

        // Generic timeupdate calculation
        const seconds = payload.seconds ?? payload.currentTime ?? payload.value?.seconds;
        const duration = payload.duration ?? payload.value?.duration;
        if (typeof seconds === 'number' && typeof duration === 'number' && duration > 0) {
          handleVideoProgressOrEnd(seconds, duration);
        }
      } catch {
        // Ignore
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [selectedLessonId, handleVideoProgressOrEnd, initIframePlayer]);
  //  ↑ Re-registers only when the lesson changes, not on every completion state update

  // ── Course completion detection ─────────────────────────────────────────
  const isCourseCompleted = totalLessonsCount > 0 && completedLessonIds.length >= totalLessonsCount;

  // Certificate modal state
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  // Show a one-time celebration toast when the course becomes fully complete
  const courseCompletedToastShownRef = useRef(false);
  useEffect(() => {
    if (isCourseCompleted && !courseCompletedToastShownRef.current) {
      courseCompletedToastShownRef.current = true;
      toast.success('🎓 تهانينا! أتممت الدورة بالكامل! احصل على شهادتك الآن!', { duration: 5000 });
    }
  }, [isCourseCompleted]);

  // Progress Tracking: Mark Completed
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const handleToggleComplete = async () => {
    if (!selectedLessonId) return;
    const lessonId = selectedLessonId;
    const nextCompleted = !isLessonCompleted;

    // Optimistic UI update
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
      toast.success(nextCompleted ? 'أحسنت! تم إتمام الدرس بنجاح 🎉' : 'تم إلغاء إتمام الدرس');
      // On manual completion, reveal the next lesson immediately (paused — no autoplay).
      if (nextCompleted) {
        advanceToNextLesson(lessonId);
      }
    } catch (err: any) {
      // Revert optimistic update on failure
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

  // Seek the Bunny Stream iframe to a specific timestamp (used by Q&A timestamp click-back)
  const handleSeekToTimestamp = useCallback((seekSeconds: number) => {
    if (iframeRef.current?.contentWindow) {
      try {
        // Player.js seek command
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            context: 'player.js',
            method: 'setCurrentTime',
            value: seekSeconds,
            version: '0.0.11',
          }),
          '*'
        );
      } catch {}
    }
  }, []);

  if (isCourseLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 shadow-sm">
        لم يتم العثور على محتوى الكورس أو ليس لديك صلاحية للوصول إليه.
      </div>
    );
  }

  // Build certificate data from available course & auth info
  const certData = {
    studentName: (user as any)?.fullName || (user as any)?.name || 'الطالب',
    courseTitle: course?.title || '',
    teacherName: (course as any)?.teacher?.user?.fullName || undefined,
    completedDate: new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };

  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Certificate Modal */}
      <CourseCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        data={certData}
      />

      {/* 🎓 Course Completion Celebration Banner */}
      {isCourseCompleted && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 p-1 shadow-lg shadow-amber-200/50">
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Decorative shimmer strip */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>

            <div className="flex items-center gap-4 z-10">
              <div className="p-3 bg-amber-100 rounded-2xl shadow-sm">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>
              <div className="text-right">
                <h3 className="text-lg font-extrabold text-amber-900">🎉 أحسنت! أتممت الدورة بالكامل!</h3>
                <p className="text-sm text-amber-700/80 mt-0.5">
                  لقد أكملت جميع دروس دورة <span className="font-bold">{course.title}</span> بنجاح
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCertificateOpen(true)}
              className="z-10 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-300/50 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
            >
              <Award className="w-5 h-5" />
              احصل على شهادتك
            </button>
          </div>
        </div>
      )}

      {/* Light Header Banner */}
      <div className="flex items-center justify-between bg-white border border-slate-200 px-6 py-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/student/courses"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-primary-50 hover:text-primary-600 text-slate-700 flex items-center justify-center transition-colors shrink-0 border border-slate-200"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-primary-600">{course.title}</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-slate-500">{course.subject}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {activeLesson ? activeLesson.title : 'قاعة المشاهدة والتعلم'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedLessonId && (
            <button
              type="button"
              onClick={handleToggleComplete}
              disabled={isMarkingComplete}
              className={`hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isLessonCompleted
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              <CheckCircle className={`w-4 h-4 ${isLessonCompleted ? 'text-white' : 'text-emerald-600'}`} />
              <span>{isLessonCompleted ? 'مكتمل ومُتقن' : 'تحديد كمكتمل'}</span>
            </button>
          )}

          {/* Toggle Syllabus on Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileSyllabusOpen(true)}
            className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200"
            title="فصول ومنهج الكورس"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Player & Tabs (Left 8 cols) + Syllabus Accordion (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Player & Tab Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Strict 16:9 Aspect Ratio Video Player Card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div
              className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center"
              style={{ aspectRatio: '16 / 9', width: '100%' }}
            >
              {isLessonLoading || isStreamAuthLoading ? (
                <div className="flex flex-col items-center gap-3 text-white">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
                  <span className="text-xs font-mono text-slate-300">جاري فك التشفير وتجهيز البث الآمن...</span>
                </div>
              ) : streamAuth?.videoStatus === 'PROCESSING' ? (
                <div className="flex flex-col items-center gap-3 text-white p-6 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
                  <p className="text-sm font-bold text-amber-300">الفيديو قيد المعالجة السحابية</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    نقوم حالياً بتهيئة الفيديو وتوليد الجودات المتعددة لضمان أفضل تجربة مشاهدة. ستعمل المعاينة تلقائياً فور انتهاء المعالجة.
                  </p>
                  <button
                    type="button"
                    onClick={() => refetchStreamAuth()}
                    className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
                  >
                    تحديث حالة الفيديو
                  </button>
                </div>
              ) : streamAuth?.embedUrl ? (
                <iframe
                  ref={iframeRef}
                  id="bunny-stream-embed"
                  src={streamAuth.embedUrl}
                  loading="lazy"
                  onLoad={initIframePlayer}
                  className="w-full h-full border-0 absolute inset-0 block"
                  style={{ width: '100%', height: '100%', border: 0 }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                />
              ) : lessonViewer?.contentUrl ? (
                <video
                  src={lessonViewer.contentUrl}
                  playsInline
                  controls
                  controlsList="nodownload"
                  onEnded={() => handleVideoProgressOrEnd()}
                  onTimeUpdate={(e) => handleVideoProgressOrEnd(e.currentTarget.currentTime, e.currentTarget.duration)}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-contain block"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400 p-8 text-center">
                  <Video className="w-12 h-12 text-slate-600 stroke-[1.5]" />
                  <p className="text-xs font-bold text-slate-300">لا يوجد فيديو مخصص لهذا الدرس حالياً</p>
                  <p className="text-[11px] text-slate-500">
                    يمكنك تصفح ملخص الدرس أو تحميل المرفقات أو حل الاختبار التفاعلي من التبويبات بالأسفل.
                  </p>
                </div>
              )}

              {/* Dynamic Anti-Piracy Watermark Overlay (Strictly Absolute within Container) */}
              {streamAuth?.watermark && (
                <div
                  className="pointer-events-none absolute inset-0 z-20 w-full h-full overflow-hidden flex items-start justify-end p-4"
                >
                  <span className="select-none opacity-25 text-[11px] font-mono text-white font-bold bg-black/40 px-2 py-1 rounded-md backdrop-blur-xs">
                    {streamAuth.watermark.studentCode} • {streamAuth.watermark.studentPhone}
                  </span>
                </div>
              )}
            </div>

            {/* Lesson Title & Module Subtitle */}
            <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div>
                <span className="text-[11px] font-bold text-primary-600">
                  {activeModule ? activeModule.title : 'الوحدة'}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {activeLesson ? activeLesson.title : 'اختر درساً للبدء'}
                </h2>
              </div>

              {activeLesson?.isPreview && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                  معاينة مجانية متاحة
                </span>
              )}
            </div>
          </div>

          {/* Clean Light Pill Tabs */}
          <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1 overflow-x-auto text-xs shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold transition-all ${
                activeTab === 'summary'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ملخص الدرس</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qa')}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold transition-all ${
                activeTab === 'qa'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>الأسئلة والنقاش (Q&A)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold transition-all ${
                activeTab === 'resources'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>المرفقات والتحميلات</span>
              {lessonViewer?.attachments && lessonViewer.attachments.length > 0 && (
                <span className="bg-primary-50 text-primary-700 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {lessonViewer.attachments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold transition-all ${
                activeTab === 'quiz'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>الاختبارات والتقييم</span>
              {(lessonViewer?.lessonQuiz || lessonViewer?.unitQuiz || course.courseQuiz) && (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="animate-in fade-in">
            {activeTab === 'summary' && (
              <LessonSummaryTab
                summary={lessonViewer?.summary || null}
                lessonTitle={activeLesson?.title || ''}
                description={activeLesson?.description || null}
              />
            )}

            {activeTab === 'qa' && selectedLessonId && (
              <LessonQAPanel
                lessonId={selectedLessonId}
                lessonTitle={activeLesson?.title || ''}
                currentPlaybackSeconds={currentPlaybackSeconds}
                onSeekToTimestamp={handleSeekToTimestamp}
              />
            )}

            {activeTab === 'resources' && (
              <LessonResourcesTab
                attachments={lessonViewer?.attachments || []}
                lessonTitle={activeLesson?.title || ''}
              />
            )}

            {activeTab === 'quiz' && (
              <LessonQuizTab
                courseId={course.id}
                lessonId={selectedLessonId || undefined}
                lessonTitle={activeLesson?.title || ''}
                lessonQuiz={lessonViewer?.lessonQuiz || null}
                unitQuiz={lessonViewer?.unitQuiz || null}
                courseQuiz={course.courseQuiz || null}
              />
            )}
          </div>
        </div>

        {/* Right Column: Syllabus & Modules Accordion on Desktop */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="sticky top-6">
            <CourseSyllabusSidebar
              modules={course.modules || []}
              allLessons={allLessons}
              activeLessonId={selectedLessonId}
              onSelectLesson={(id) => setSelectedLessonId(id)}
              completedLessonIds={completedLessonIds}
              enforceSequentialLessons={course.enforceSequentialLessons ?? false}
            />
          </div>
        </div>
      </div>

      {/* Mobile Syllabus Drawer */}
      {isMobileSyllabusOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden flex justify-end">
          <div className="w-full max-w-sm bg-white border-l border-slate-200 h-full p-4 overflow-y-auto mr-auto flex flex-col justify-between shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900">فصول ومنهج الدورة</span>
              <button
                type="button"
                onClick={() => setIsMobileSyllabusOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 flex-1">
              <CourseSyllabusSidebar
                modules={course.modules || []}
                allLessons={allLessons}
                activeLessonId={selectedLessonId}
                onSelectLesson={(id) => {
                  setSelectedLessonId(id);
                  setIsMobileSyllabusOpen(false);
                }}
                completedLessonIds={completedLessonIds}
                enforceSequentialLessons={course.enforceSequentialLessons ?? false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
