'use client';

import React, { useRef, useEffect } from 'react';
import {
  useLessonDetails,
  useCourseDetails,
  useUpdateProgress,
} from '@/features/student-portal/hooks/useStudentPortal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Video,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface LessonViewerProps {
  courseId: string;
  lessonId: string;
  onClose: () => void;
  onSelectLesson: (id: string) => void;
}

export function LessonViewer({
  courseId,
  lessonId,
  onClose,
  onSelectLesson,
}: LessonViewerProps) {
  const {
    data: lesson,
    isLoading: isLessonLoading,
    isError: isLessonError,
    refetch: refetchLesson,
  } = useLessonDetails(lessonId);
  const { data: course, isLoading: isCourseLoading } = useCourseDetails(courseId);
  const { mutate: updateProgress } = useUpdateProgress();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<any>(null);

  // Sync state reference to prevent closures issues in listeners
  const playbackStateRef = useRef({
    lastPositionSeconds: 0,
    isCompleted: false,
  });

  useEffect(() => {
    if (lesson) {
      playbackStateRef.current = {
        lastPositionSeconds: lesson.lastPositionSeconds || 0,
        isCompleted: lesson.isCompleted || false,
      };

      // Seek video to last saved position once loaded
      if (videoRef.current && lesson.lastPositionSeconds > 0) {
        videoRef.current.currentTime = lesson.lastPositionSeconds;
      }
    }
  }, [lesson]);

  // Real-time heartbeat to sync video position every 10 seconds
  const startHeartbeat = () => {
    if (progressIntervalRef.current) return;
    progressIntervalRef.current = setInterval(() => {
      sendHeartbeat(false);
    }, 10000);
  };

  const stopHeartbeat = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const sendHeartbeat = (isCompletedOverride = false) => {
    if (!videoRef.current) return;

    const currentTime = Math.floor(videoRef.current.currentTime);
    const duration = videoRef.current.duration;

    // Auto-mark completed if video is finished or beyond 92% progress
    const isCompleted =
      isCompletedOverride ||
      playbackStateRef.current.isCompleted ||
      (duration > 0 && currentTime / duration > 0.92);

    playbackStateRef.current = {
      lastPositionSeconds: currentTime,
      isCompleted,
    };

    updateProgress({
      lessonId,
      payload: {
        lastPositionSeconds: currentTime,
        isCompleted,
      },
    });
  };

  // Clean heartbeats on component changes
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [lessonId]);

  const handleVideoPlay = () => {
    startHeartbeat();
  };

  const handleVideoPause = () => {
    stopHeartbeat();
    sendHeartbeat(false);
  };

  const handleVideoEnded = () => {
    stopHeartbeat();
    sendHeartbeat(true);
    toast.success('مبروك! أكملت مشاهدة هذا الدرس بنجاح.');
  };

  const handleDocumentDownload = () => {
    if (!lesson?.documentDownloadUrl) return;

    // Open signed download URL in new window
    window.open(lesson.documentDownloadUrl, '_blank');

    // Instantly update progress to completed for documents
    updateProgress(
      {
        lessonId,
        payload: {
          lastPositionSeconds: 0,
          isCompleted: true,
        },
      },
      {
        onSuccess: () => {
          refetchLesson();
          toast.success('تم تحميل الملف وتأكيد إكمال الدرس!');
        },
      }
    );
  };

  if (isLessonLoading || isCourseLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[450px] w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-[500px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isLessonError || !lesson) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onClose} size="sm">
          رجوع للمنهج
        </Button>
        <Alert variant="error">
          فشل في تحميل محتوى الدرس. قد يتطلب هذا الدرس اشتراكاً نشطاً في المنهج
          الدراسي للوصول إليه.
        </Alert>
      </div>
    );
  }

  const isVideo = lesson.lessonType === 'VIDEO';

  // Flat lessons list for outline navigation
  const flatLessons = course?.modules?.flatMap((m: any) => m.lessons) || [];
  const currentIdx = flatLessons.findIndex((l: any) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? flatLessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Player and Information view */}
      <div className="lg:col-span-3 space-y-6">
        {/* Back navigation */}
        <button
          onClick={onClose}
          className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 ml-1" />
          الرجوع للمنهج الدراسي
        </button>

        {/* Media screen box */}
        <div className="bg-slate-950 rounded-2xl overflow-hidden aspect-video max-h-[70vh] relative flex items-center justify-center shadow-lg border border-slate-900">
          {isVideo ? (
            lesson.videoPlayerUrl ? (
              <video
                ref={videoRef}
                src={lesson.videoPlayerUrl}
                playsInline
                controls
                onContextMenu={(e) => e.preventDefault()}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onEnded={handleVideoEnded}
                className="w-full h-full object-contain max-h-full max-w-full"
                controlsList="nodownload"
              />
            ) : (
              <div className="text-center text-slate-400 p-8 space-y-3">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
                <p className="font-bold text-slate-200">
                  فشل تحميل رابط تشغيل المحاضرة
                </p>
                <p className="text-xs text-slate-500">
                  حدث خطأ في توقيع الرابط المشفر للفيديو، يرجى إعادة تحميل الصفحة.
                </p>
              </div>
            )
          ) : (
            /* Document Download Viewer Screen */
            <div className="text-center text-slate-200 p-8 flex flex-col items-center justify-center space-y-5">
              <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center border border-blue-500/20">
                <FileText className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold">{lesson.title}</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  هذا الدرس عبارة عن ملف ملخص أو مذكرة دراسية بصيغة PDF.
                </p>
              </div>

              <Button
                onClick={handleDocumentDownload}
                className="rounded-xl px-8 py-5 text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                تحميل الملخص والمذكرة
              </Button>
            </div>
          )}
        </div>

        {/* Detailed details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-150 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={isVideo ? 'error' : 'default'}
                  className={
                    isVideo
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-blue-50 text-blue-700'
                  }
                >
                  {isVideo ? 'محاضرة مرئية' : 'مذكرة / ملف'}
                </Badge>
                {lesson.isCompleted && (
                  <Badge
                    variant="success"
                    className="gap-1 bg-emerald-50 text-emerald-800 border-none font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> مكتمل
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-2">
                {lesson.title}
              </h2>
            </div>

            {/* Navigation shortcuts inside video */}
            <div className="flex gap-2">
              {prevLesson && (
                <button
                  onClick={() => onSelectLesson(prevLesson.id)}
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="الدرس السابق"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {nextLesson && (
                <button
                  onClick={() => onSelectLesson(nextLesson.id)}
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer font-bold flex items-center gap-1.5"
                  title="الدرس التالي"
                >
                  <span>التالي</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-slate-800">
              وصف ومحتويات الدرس:
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">
              {lesson.description || 'لا يوجد وصف مضاف لهذا الدرس المنهجي.'}
            </p>
          </div>
        </div>
      </div>

      {/* Playlist outline sidebar */}
      <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl shadow-2xs overflow-hidden h-[600px] flex flex-col">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            فهرس الدروس والمنهج
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {course?.modules?.map((mod: any, mIdx: number) => (
            <div key={mod.id}>
              {/* Module Header */}
              <div className="p-3 bg-slate-50/50 text-xs font-bold text-slate-600 border-b border-slate-100">
                الفصل {mIdx + 1}: {mod.title}
              </div>

              {/* Module Lessons */}
              <div className="divide-y divide-slate-50">
                {mod.lessons?.map((les: any) => {
                  const isActive = les.id === lessonId;
                  const isLesVideo = les.lessonType === 'VIDEO';
                  return (
                    <button
                      key={les.id}
                      onClick={() => onSelectLesson(les.id)}
                      className={`w-full p-3.5 flex items-start gap-2.5 text-right transition-colors hover:bg-slate-50/60 cursor-pointer ${
                        isActive
                          ? 'bg-primary-50/50 border-r-4 border-primary-600 font-bold'
                          : ''
                      }`}
                    >
                      <div
                        className={`mt-0.5 shrink-0 ${
                          isLesVideo ? 'text-rose-500' : 'text-blue-500'
                        }`}
                      >
                        {isLesVideo ? (
                          <Video className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-xs block truncate ${
                            isActive ? 'text-primary-800' : 'text-slate-700'
                          }`}
                        >
                          {les.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
