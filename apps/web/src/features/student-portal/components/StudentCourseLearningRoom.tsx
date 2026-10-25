'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { LessonQAPanel } from './LessonQAPanel';
import { LessonSummaryTab } from './LessonSummaryTab';
import { LessonResourcesTab } from './LessonResourcesTab';
import { LessonQuizTab } from './LessonQuizTab';
import { CourseSyllabusSidebar } from './CourseSyllabusSidebar';
import { useLearningRoom } from '../hooks/useLearningRoom';
import { Skeleton } from '@/components/ui/Skeleton';

const CourseCertificateModal = dynamic(
  () => import('./CourseCertificateModal').then((mod) => mod.CourseCertificateModal),
  { ssr: false }
);

import { LearningRoomHeader } from './learning-room/LearningRoomHeader';
import { LearningRoomVideoPlayer } from './learning-room/LearningRoomVideoPlayer';
import { LearningRoomBanners } from './learning-room/LearningRoomBanners';
import { LearningRoomTabsNav } from './learning-room/LearningRoomTabsNav';

export interface StudentCourseLearningRoomProps {
  courseId: string;
  initialLessonId?: string;
}

export function StudentCourseLearningRoom({
  courseId,
  initialLessonId,
}: StudentCourseLearningRoomProps) {
  const room = useLearningRoom({ courseId, initialLessonId });
  const [isSyllabusCollapsed, setIsSyllabusCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem('el_awal_syllabus_collapsed') === 'true') {
        setIsSyllabusCollapsed(true);
      }
    } catch {}
  }, []);

  const handleToggleSyllabus = () => {
    setIsSyllabusCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('el_awal_syllabus_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  if (room.isCourseLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="h-8 w-3/4 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
          <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4 h-fit">
            <Skeleton className="h-6 w-36 rounded mb-4" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!room.course) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 shadow-sm">
        لم يتم العثور على محتوى الكورس أو ليس لديك صلاحية للوصول إليه.
      </div>
    );
  }

  const handleNextStepAction = (info: any) => {
    if (info.type === 'unit_quiz' || info.type === 'course_quiz') {
      const isTeacher = room.isPreviewMode || (room.pathname?.includes('/preview') ?? false);
      const returnUrl = room.courseId
        ? isTeacher
          ? `/teacher/courses/${room.courseId}/preview${
              room.selectedLessonId ? `?lessonId=${room.selectedLessonId}` : ''
            }`
          : `/student/courses/${room.courseId}/learn${
              room.selectedLessonId ? `?lessonId=${room.selectedLessonId}` : ''
            }`
        : '/student/courses';
      window.location.href = `/student/assessments?id=${info.quizId}&courseId=${room.course?.id || room.courseId}&returnUrl=${encodeURIComponent(
        returnUrl
      )}`;
      return;
    }
    room.setActiveTab('quiz');
    setTimeout(() => {
      const el =
        document.getElementById(`quiz-card-${info.quizId}`) ||
        document.getElementById('lesson-content-tabs');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleResetPreview = () => {
    try {
      localStorage.removeItem(room.progress.progressStorageKey);
      localStorage.removeItem(room.progress.notifiedStorageKeyRef.current);
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('el_awal_preview_quiz_')) localStorage.removeItem(k);
      });
      room.progress.sessionCompletedRef.current.clear();
      room.progress.setCompletedLessonIds([]);
    } catch {}
  };

  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Certificate Modal */}
      {room.isCertificateOpen && room.progress.isCourseFullyCompleted && (
        <CourseCertificateModal
          isOpen={room.isCertificateOpen && room.progress.isCourseFullyCompleted}
          onClose={() => room.setIsCertificateOpen(false)}
          data={room.certData}
        />
      )}


      {/* Banners & Prompt Modals */}
      <LearningRoomBanners
        isCourseFullyCompleted={room.progress.isCourseFullyCompleted}
        areAllLessonsCompleted={room.progress.areAllLessonsCompleted}
        areAllQuizzesCompleted={room.progress.areAllQuizzesCompleted}
        hasCertificate={room.course.hasCertificate}
        courseTitle={room.course.title}
        completedQuizzesCount={room.progress.completedQuizzesCount}
        totalQuizzesCount={room.progress.allQuizzes.length}
        requireExamPassingToUnlock={room.course.requireExamPassingToUnlock}
        onClaimCertificate={room.handleClaimCertificate}
        onGoToQuizzes={() => {
          room.setActiveTab('quiz');
          const tabsElement = document.getElementById('lesson-content-tabs');
          if (tabsElement) tabsElement.scrollIntoView({ behavior: 'smooth' });
        }}
        nextStepInfo={room.nextStepInfo}
        onNextStepAction={handleNextStepAction}
        postVideoPrompt={room.progress.postVideoPrompt}
        onStartAssessmentFromPrompt={(quizId, lessonId) => {
          room.progress.setPostVideoPrompt(null);
          const returnUrl = encodeURIComponent(
            `/student/courses/${courseId}/learn?lessonId=${lessonId}`
          );
          room.router.push(
            `/student/assessments?id=${quizId}&courseId=${courseId}&lessonId=${lessonId}&returnUrl=${returnUrl}`
          );
        }}
        onShowInTabFromPrompt={() => {
          room.progress.setPostVideoPrompt(null);
          room.setActiveTab('quiz');
        }}
        onDismissPrompt={() => room.progress.setPostVideoPrompt(null)}
      />

      {/* Light Header Banner */}
      <LearningRoomHeader
        courseId={courseId}
        courseTitle={room.course.title}
        subject={room.course.subject}
        isTeacherOrAdmin={room.isTeacherOrAdmin}
        enforceSequentialLessons={room.course.enforceSequentialLessons}
        onResetPreview={handleResetPreview}
        activeLessonTitle={room.activeLesson?.title}
        selectedLessonId={room.selectedLessonId}
        isLessonCompleted={room.progress.isLessonCompleted}
        isMarkingComplete={room.progress.isMarkingComplete}
        onToggleComplete={room.progress.handleToggleComplete}
        onOpenMobileSyllabus={() => room.setIsMobileSyllabusOpen(true)}
        isDesktopSyllabusCollapsed={isSyllabusCollapsed}
        onToggleDesktopSyllabus={handleToggleSyllabus}
      />

      {/* Main Grid: Player & Tabs (Left 8 or 12 cols) + Syllabus Accordion (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Player & Tab Content */}
        <div
          className={`${
            isSyllabusCollapsed ? 'lg:col-span-12' : 'lg:col-span-8'
          } space-y-6 transition-all duration-300`}
        >
          <LearningRoomVideoPlayer
            videoContainerRef={room.videoContainerRef}
            iframeRef={room.iframeRef}
            videoRef={room.videoRef}
            isLessonLoading={room.isLessonLoading}
            isStreamAuthLoading={room.isStreamAuthLoading}
            streamAuth={room.streamAuth}
            lessonViewer={room.lessonViewer}
            activeModuleTitle={room.activeModule?.title}
            activeLessonTitle={room.activeLesson?.title}
            activeLessonPreview={room.activeLesson?.isPreview}
            isLessonCompleted={room.progress.isLessonCompleted}
            isMarkingComplete={room.progress.isMarkingComplete}
            onToggleComplete={room.progress.handleToggleComplete}
            onRefetchStreamAuth={room.refetchStreamAuth}
            onInitIframePlayer={room.progress.initIframePlayer}
            onVideoProgressOrEnd={room.progress.handleVideoProgressOrEnd}
            isObscured={room.security.isObscured}
            setIsObscured={room.security.setIsObscured}
            watermarkPos={room.security.watermarkPos}
          />

          {/* Clean Light Pill Tabs */}
          <LearningRoomTabsNav
            activeTab={room.activeTab}
            setActiveTab={room.setActiveTab}
            attachmentsCount={room.lessonViewer?.attachments?.length || 0}
            hasAssessment={Boolean(
              room.lessonViewer?.lessonQuiz || room.lessonViewer?.lessonHomework
            )}
          />

          {/* Tab Contents */}
          <div className="animate-in fade-in">
            {room.activeTab === 'summary' && (
              <LessonSummaryTab
                summary={room.lessonViewer?.summary || null}
                lessonTitle={room.activeLesson?.title || ''}
                description={room.activeLesson?.description || null}
              />
            )}

            {room.activeTab === 'qa' && room.selectedLessonId && (
              <LessonQAPanel
                lessonId={room.selectedLessonId}
                lessonTitle={room.activeLesson?.title || ''}
                currentPlaybackSeconds={room.progress.currentPlaybackSeconds}
                onSeekToTimestamp={room.handleSeekToTimestamp}
              />
            )}

            {room.activeTab === 'resources' && (
              <LessonResourcesTab
                attachments={room.lessonViewer?.attachments || []}
                lessonTitle={room.activeLesson?.title || ''}
              />
            )}

            {room.activeTab === 'quiz' && (
              <LessonQuizTab
                courseId={room.course.id}
                lessonId={room.selectedLessonId || undefined}
                lessonTitle={room.activeLesson?.title || ''}
                lessonQuiz={room.lessonViewer?.lessonQuiz || null}
                lessonHomework={room.lessonViewer?.lessonHomework || null}
                enforceSequentialLessons={room.course.enforceSequentialLessons ?? false}
                completedLessonIds={room.progress.completedLessonIds}
                activeModule={room.activeModule || null}
                allModules={room.course.modules || []}
                allLessons={room.allLessons}
                isPreviewMode={room.isPreviewMode}
                onBypassQuiz={room.progress.handleBypassQuiz}
                onSelectLesson={(id) => {
                  room.setSelectedLessonId(id);
                  room.setActiveTab('summary');
                }}
              />
            )}
          </div>

          {/* Mobile Course Syllabus Section: Placed below tabs for seamless scroll-through on mobile */}
          <div className="block lg:hidden mt-8 pt-6 border-t border-slate-200">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-600 inline-block" />
                <span>فصول ومنهج الدورة</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                {room.progress.completedLessonIds.length} من {room.allLessons.length} مكتمل
              </span>
            </div>
            <CourseSyllabusSidebar
              modules={room.course?.modules || []}
              allLessons={room.allLessons}
              activeLessonId={room.selectedLessonId}
              onSelectLesson={(id) => {
                room.setSelectedLessonId(id);
                room.videoContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              onSelectQuiz={room.handleSelectQuizFromSidebar}
              completedLessonIds={room.progress.completedLessonIds}
              enforceSequentialLessons={room.course?.enforceSequentialLessons ?? false}
              requireExamPassingToUnlock={room.course?.requireExamPassingToUnlock ?? false}
              courseQuiz={room.course?.courseQuiz || null}
            />
          </div>
        </div>

        {/* Right Column: Syllabus & Modules Accordion on Desktop */}
        {!isSyllabusCollapsed && (
          <div className="hidden lg:block lg:col-span-4 transition-all duration-300">
            <div className="sticky top-6">
            <CourseSyllabusSidebar
              modules={room.course?.modules || []}
              allLessons={room.allLessons}
              activeLessonId={room.selectedLessonId}
              onSelectLesson={(id) => room.setSelectedLessonId(id)}
              onSelectQuiz={room.handleSelectQuizFromSidebar}
              completedLessonIds={room.progress.completedLessonIds}
              enforceSequentialLessons={room.course?.enforceSequentialLessons ?? false}
              requireExamPassingToUnlock={room.course?.requireExamPassingToUnlock ?? false}
              courseQuiz={room.course?.courseQuiz || null}
            />
          </div>
        </div>
        )}
      </div>

      {/* Mobile Syllabus Drawer */}
      {room.isMobileSyllabusOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden flex justify-end">
          <div className="w-full max-w-sm bg-white border-l border-slate-200 h-full p-4 overflow-y-auto mr-auto flex flex-col justify-between shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900">فصول ومنهج الدورة</span>
              <button
                type="button"
                onClick={() => room.setIsMobileSyllabusOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 flex-1">
              <CourseSyllabusSidebar
                modules={room.course?.modules || []}
                allLessons={room.allLessons}
                activeLessonId={room.selectedLessonId}
                onSelectLesson={(id) => {
                  room.setSelectedLessonId(id);
                  room.setIsMobileSyllabusOpen(false);
                }}
                onSelectQuiz={room.handleSelectQuizFromSidebar}
                completedLessonIds={room.progress.completedLessonIds}
                enforceSequentialLessons={room.course?.enforceSequentialLessons ?? false}
                requireExamPassingToUnlock={room.course?.requireExamPassingToUnlock ?? false}
                courseQuiz={room.course?.courseQuiz || null}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
