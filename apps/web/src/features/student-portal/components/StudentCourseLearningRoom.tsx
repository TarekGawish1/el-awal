'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useCourseDetail, useLessonViewer, useLessonStreamAuth } from '@/features/courses/hooks/useCourses';
import { coursesApi } from '@/features/courses/api/courses.api';
import { CourseModule, CourseLesson, LessonViewerData } from '@/features/courses/types/courses.types';
import { LessonQAPanel } from './LessonQAPanel';
import { LessonSummaryTab } from './LessonSummaryTab';
import { LessonResourcesTab } from './LessonResourcesTab';
import { LessonQuizTab } from './LessonQuizTab';
import { CourseSyllabusSidebar } from './CourseSyllabusSidebar';
import toast from 'react-hot-toast';

interface StudentCourseLearningRoomProps {
  courseId: string;
  initialLessonId?: string;
}

export function StudentCourseLearningRoom({ courseId, initialLessonId }: StudentCourseLearningRoomProps) {
  const { data: course, isLoading: isCourseLoading } = useCourseDetail(courseId);

  // Active Selected Lesson ID
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(initialLessonId || null);

  // Active Tab below video: 'summary' | 'qa' | 'resources' | 'quiz'
  const [activeTab, setActiveTab] = useState<'summary' | 'qa' | 'resources' | 'quiz'>('summary');

  // Mobile Syllabus Drawer State
  const [isMobileSyllabusOpen, setIsMobileSyllabusOpen] = useState(false);

  // Fetch lesson data when selectedLessonId is present
  const { data: lessonViewer, isLoading: isLessonLoading, refetch: refetchLesson } = useLessonViewer(
    selectedLessonId || ''
  );

  // Auto-select first available lesson on initial course load if not provided
  useEffect(() => {
    if (initialLessonId) {
      setSelectedLessonId(initialLessonId);
    } else if (course && course.modules && course.modules.length > 0 && !selectedLessonId) {
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

  // Progress Tracking: Mark Completed
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const handleToggleComplete = async () => {
    if (!selectedLessonId) return;
    try {
      setIsMarkingComplete(true);
      const isCurrentlyCompleted = lessonViewer?.isCompleted || false;
      await coursesApi.updateLessonProgress(selectedLessonId, {
        isCompleted: !isCurrentlyCompleted,
        lastPositionSeconds: lessonViewer?.lastPositionSeconds || 0,
      });
      refetchLesson();
      toast.success(isCurrentlyCompleted ? 'تم إلغاء إتمام الدرس' : 'أحسنت! تم إتمام الدرس بنجاح 🎉');
    } catch {
      toast.error('تعذر تحديث حالة إتمام الدرس');
    } finally {
      setIsMarkingComplete(false);
    }
  };

  // Find active module and active lesson objects
  const activeModule = course?.modules?.find((m: CourseModule) =>
    m.lessons?.some((l: CourseLesson) => l.id === selectedLessonId)
  );
  const activeLesson = activeModule?.lessons?.find((l: CourseLesson) => l.id === selectedLessonId);

  // Calculate Overall Course Progress for this student
  const allLessons: CourseLesson[] = (course?.modules || []).flatMap((m: CourseModule) => m.lessons || []);
  const totalLessonsCount = allLessons.length;

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

  return (
    <div className="space-y-6 text-right animate-in fade-in">
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
              {activeLesson ? activeLesson.title : 'قاعة المحتوى التفاعلي والشروحات'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedLessonId && (
            <button
              type="button"
              onClick={handleToggleComplete}
              disabled={isMarkingComplete}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-medium transition-all border border-emerald-200 shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{lessonViewer?.isCompleted ? 'مكتمل ومُتقن' : 'تحديد كمكتمل'}</span>
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
            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
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
                  src={streamAuth.embedUrl}
                  loading="lazy"
                  className="w-full h-full border-0 absolute inset-0"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                />
              ) : lessonViewer?.contentUrl ? (
                <video
                  src={lessonViewer.contentUrl}
                  controls
                  controlsList="nodownload"
                  className="w-full h-full object-contain"
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

              {/* Dynamic Anti-Piracy Watermark Overlay */}
              {streamAuth?.watermark && (
                <div
                  className="absolute pointer-events-none select-none opacity-20 text-[10px] font-mono text-white/80 font-bold z-20 transition-all duration-1000 top-4 right-4"
                >
                  {streamAuth.watermark.studentCode} • {streamAuth.watermark.studentPhone}
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
                lessonQuiz={lessonViewer?.lessonQuiz || null}
                unitQuiz={lessonViewer?.unitQuiz || null}
                courseQuiz={course.courseQuiz || null}
              />
            )}
          </div>
        </div>

        {/* Right Column: Syllabus & Modules Accordion on Desktop */}
        <div className="hidden lg:block lg:col-span-4">
          <CourseSyllabusSidebar
            modules={course.modules || []}
            activeLessonId={selectedLessonId}
            onSelectLesson={(id) => setSelectedLessonId(id)}
          />
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
                activeLessonId={selectedLessonId}
                onSelectLesson={(id) => {
                  setSelectedLessonId(id);
                  setIsMobileSyllabusOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
