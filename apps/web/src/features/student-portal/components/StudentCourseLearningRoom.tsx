'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Video,
  FileText,
  Paperclip,
  Award,
  MessageSquare,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useCourseDetail, useLessonViewer } from '@/features/courses/hooks/useCourses';
import { coursesApi } from '@/features/courses/api/courses.api';
import { useAuth } from '@/features/auth';
import { AntiPiracyWatermark } from './AntiPiracyWatermark';
import { LessonQAPanel } from './LessonQAPanel';
import { LessonSummaryTab } from './LessonSummaryTab';
import { LessonResourcesTab } from './LessonResourcesTab';
import { LessonQuizTab } from './LessonQuizTab';
import { CourseSyllabusSidebar } from './CourseSyllabusSidebar';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import toast from 'react-hot-toast';

interface StudentCourseLearningRoomProps {
  courseId: string;
  initialLessonId?: string;
}

type ActiveTab = 'summary' | 'attachments' | 'qa' | 'quiz';

export function StudentCourseLearningRoom({
  courseId,
  initialLessonId,
}: StudentCourseLearningRoomProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();

  const { data: course, isLoading: isCourseLoading } = useCourseDetail(courseId);

  // Active Lesson Resolution
  const [activeLessonId, setActiveLessonId] = useState<string>(initialLessonId || '');

  useEffect(() => {
    if (!activeLessonId && course?.modules && course.modules.length > 0) {
      const firstModule = course.modules[0];
      if (firstModule.lessons && firstModule.lessons.length > 0) {
        setActiveLessonId(firstModule.lessons[0].id);
      }
    }
  }, [course, activeLessonId]);

  const { data: lessonData, isLoading: isLessonLoading, refetch: refetchLesson } =
    useLessonViewer(activeLessonId);

  // Tab & Player State
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [currentPlaybackSeconds, setCurrentPlaybackSeconds] = useState(0);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);

  // Video Ref for HTML5 / Native Player
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Track progress heartbeat
  useEffect(() => {
    if (!activeLessonId || !isOnline) return;

    const interval = setInterval(() => {
      if (currentPlaybackSeconds > 5) {
        coursesApi.updateLessonProgress(activeLessonId, {
          lastPositionSeconds: Math.floor(currentPlaybackSeconds),
        });
      }
    }, 15000); // Heartbeat every 15s

    return () => clearInterval(interval);
  }, [activeLessonId, currentPlaybackSeconds, isOnline]);

  const handleSeekToTimestamp = (seconds: number) => {
    setCurrentPlaybackSeconds(seconds);
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    } else {
      toast.success(`تم الانتقال للثانية ${seconds}`);
    }
  };

  const handleMarkCompleted = async () => {
    if (!activeLessonId) return;
    try {
      await coursesApi.updateLessonProgress(activeLessonId, {
        lastPositionSeconds: Math.floor(currentPlaybackSeconds) || 100,
        isCompleted: true,
      });
      if (!completedLessonIds.includes(activeLessonId)) {
        setCompletedLessonIds([...completedLessonIds, activeLessonId]);
      }
      toast.success('تم تحديد الدرس كمكتمل بنجاح!');
    } catch {
      // Ignore
    }
  };

  if (!isOnline) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <FeatureRequiresOnlineCard
          featureName="مشاهدة الفيديوهات وبث الكورسات"
          backHref="/student/courses"
        />
      </div>
    );
  }

  if (isCourseLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400">
        لم يتم العثور على الكورس المطلوب.
      </div>
    );
  }

  const isBunnyVideo =
    lessonData?.videoPlayerUrl?.includes('bunny') ||
    lessonData?.videoPlayerUrl?.includes('mediadelivery.net') ||
    lessonData?.videoPlayerUrl?.includes('iframe');

  return (
    <div className="space-y-6 text-right max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumbs & Header */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-6 py-4 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/student/courses"
            className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-indigo-400">{course.title}</span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-slate-400">{course.subject}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {lessonData?.title || 'جاري تحميل الدرس...'}
            </h1>
          </div>
        </div>

        {/* Sidebar Toggle for Mobile & Complete Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkCompleted}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-emerald-500/30"
          >
            <CheckCircle className="w-4 h-4" />
            <span>تحديد كمكتمل</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
            className="lg:hidden w-10 h-10 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Layout: Video Player + Panes & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left/Center Main Column: Video Player & Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* 16:9 Responsive Video Container with Anti-Piracy Watermark */}
          <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center group">
            {/* Dynamic Anti-Piracy Watermark Overlay */}
            <AntiPiracyWatermark
              studentName={user?.fullName || 'طالب مسجل'}
              studentPhone={user?.phone || ''}
              studentCode={user?.id?.slice(0, 8) || ''}
            />

            {isLessonLoading ? (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
            ) : lessonData?.videoPlayerUrl ? (
              isBunnyVideo ? (
                <iframe
                  src={
                    lessonData.videoPlayerUrl.includes('?')
                      ? `${lessonData.videoPlayerUrl}&autoplay=true&preload=true`
                      : `${lessonData.videoPlayerUrl}?autoplay=true&preload=true`
                  }
                  loading="lazy"
                  className="w-full h-full border-0 absolute inset-0"
                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                  allowFullScreen
                  title={lessonData.title}
                />
              ) : (
                <video
                  ref={videoRef}
                  src={lessonData.videoPlayerUrl}
                  controls
                  autoPlay
                  onTimeUpdate={(e) => setCurrentPlaybackSeconds((e.target as HTMLVideoElement).currentTime)}
                  className="w-full h-full object-contain"
                >
                  متصفحك لا يدعم تشغيل هذا الفيديو.
                </video>
              )
            ) : (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Video className="w-12 h-12 stroke-[1.5] mx-auto text-slate-700" />
                <p className="text-xs font-bold text-slate-400">لا يوجد فيديو متوفر لهذا الدرس حالياً</p>
                <p className="text-[11px] text-slate-600">يمكنك مراجعة ملخص الدرس أو أوراق الـ PDF المرفقة أسفل الشاشة.</p>
              </div>
            )}
          </div>

          {/* Navigation Tabs Below Video */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-1.5 flex items-center gap-1 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-bold transition-all ${
                activeTab === 'summary'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ملخص الدرس والملاحظات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-bold transition-all ${
                activeTab === 'attachments'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>المرفقات والتحميلات</span>
              {lessonData?.attachments && lessonData.attachments.length > 0 && (
                <span className="bg-white/20 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                  {lessonData.attachments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qa')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-bold transition-all ${
                activeTab === 'qa'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>الأسئلة والنقاشات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl font-bold transition-all ${
                activeTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>اختبار الدرس</span>
              {lessonData?.lessonQuiz && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* Active Tab Content Area */}
          <div className="space-y-4">
            {activeTab === 'summary' && (
              <LessonSummaryTab
                summary={lessonData?.summary}
                description={lessonData?.description}
                lessonTitle={lessonData?.title || ''}
              />
            )}

            {activeTab === 'attachments' && (
              <LessonResourcesTab
                attachments={lessonData?.attachments}
                lessonTitle={lessonData?.title || ''}
              />
            )}

            {activeTab === 'qa' && (
              <LessonQAPanel
                lessonId={activeLessonId}
                currentPlaybackSeconds={currentPlaybackSeconds}
                onSeekToTimestamp={handleSeekToTimestamp}
              />
            )}

            {activeTab === 'quiz' && (
              <LessonQuizTab
                lessonQuiz={lessonData?.lessonQuiz}
                unitQuiz={lessonData?.unitQuiz}
                courseQuiz={lessonData?.courseQuiz}
                lessonTitle={lessonData?.title || ''}
              />
            )}
          </div>
        </div>

        {/* Right Column: Course Syllabus Drawer */}
        <div className="hidden lg:block lg:sticky lg:top-6 h-[calc(100vh-120px)]">
          <CourseSyllabusSidebar
            course={course}
            activeLessonId={activeLessonId}
            onSelectLesson={(id) => {
              setActiveLessonId(id);
              setCurrentPlaybackSeconds(0);
            }}
            onSelectQuiz={(quizId) => router.push(`/student/assessments/${quizId}`)}
            completedLessonIds={completedLessonIds}
          />
        </div>
      </div>

      {/* Mobile Syllabus Modal Drawer */}
      {isSidebarOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full p-4 overflow-y-auto mr-auto flex flex-col justify-between">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white">فصول ومنهج الدورة</span>
              <button
                type="button"
                onClick={() => setIsSidebarOpenMobile(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 my-3 overflow-y-auto">
              <CourseSyllabusSidebar
                course={course}
                activeLessonId={activeLessonId}
                onSelectLesson={(id) => {
                  setActiveLessonId(id);
                  setCurrentPlaybackSeconds(0);
                  setIsSidebarOpenMobile(false);
                }}
                onSelectQuiz={(quizId) => {
                  router.push(`/student/assessments/${quizId}`);
                  setIsSidebarOpenMobile(false);
                }}
                completedLessonIds={completedLessonIds}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
