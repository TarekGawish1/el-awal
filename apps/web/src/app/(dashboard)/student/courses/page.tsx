'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  useStudentCourses, 
  useCourseDetails, 
  useLessonDetails, 
  useUpdateProgress 
} from '@/features/student-portal/hooks/useStudentPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { 
  BookOpen, Video, FileText, ChevronLeft, ChevronRight, Play, 
  CheckCircle2, AlertTriangle, ArrowRight, Download, Award, Clock, User
} from 'lucide-react';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import toast from 'react-hot-toast';

export default function StudentCoursesPage() {
  const isOnline = useOnlineStatus();
  const { data: courses = [], isLoading, isError } = useStudentCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName="الدورات والمحاضرات التعليمية"
        description="مشاهدة الدورات والدروس الرقمية وتحميل الملخصات تتطلب اتصالاً نشطاً بالخادم."
        backHref="/student/dashboard"
      />
    );
  }

  const PAGE_SIZE = 6;
  const totalPages = Math.ceil(courses.length / PAGE_SIZE);
  const paginatedCourses = courses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="error">
        <AlertTriangle className="w-5 h-5 ml-2" />
        <p>حدث خطأ أثناء تحميل دوراتك التعليمية. يرجى المحاولة لاحقاً.</p>
      </Alert>
    );
  }

  // 1. Lesson Viewer Mode
  if (selectedCourseId && selectedLessonId) {
    return (
      <LessonViewer 
        courseId={selectedCourseId} 
        lessonId={selectedLessonId} 
        onClose={() => setSelectedLessonId(null)} 
        onSelectLesson={(id) => setSelectedLessonId(id)}
      />
    );
  }

  // 2. Course Syllabus Details Mode
  if (selectedCourseId) {
    return (
      <CourseDetailsView 
        courseId={selectedCourseId} 
        onBack={() => setSelectedCourseId(null)} 
        onStartLesson={(lessonId) => setSelectedLessonId(lessonId)}
      />
    );
  }

  // 3. Courses Enrolled List Mode
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">الدورات والمحاضرات الرقمية</h1>
        <p className="text-sm text-slate-500 mt-1">شاهد الدروس الرقمية، وحمل الملخصات، وتابع تقدمك الأكاديمي أولاً بأول</p>
      </div>

      {courses?.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200/60 flex flex-col items-center">
          <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">لست مسجلاً في أي دورة تعليمية حالياً.</p>
          <p className="text-xs text-slate-400 mt-1">عند اشتراكك في إحدى الدورات الرقمية للمركز، ستظهر هنا تلقائياً.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCourses.map((c: any) => (
              <Card key={c.courseId} className="border-none shadow-sm shadow-slate-200/50 hover:shadow-md transition-all flex flex-col overflow-hidden group">
                {/* Course cover image or placeholder */}
                <div className="h-44 w-full bg-slate-100 relative overflow-hidden shrink-0">
                  {c.coverImageUrl ? (
                    <img 
                      src={c.coverImageUrl} 
                      alt={c.title} 
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-primary-600 to-primary-700 flex items-center justify-center text-white">
                      <BookOpen className="w-12 h-12 opacity-40" />
                    </div>
                  )}
                  <Badge variant="default" className="absolute top-3 right-3 bg-white/95 text-slate-800 border-none shadow-xs font-semibold">
                    {c.subject || 'عام'}
                  </Badge>
                </div>

                <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-primary-600 transition-colors leading-tight">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      المعلم: {c.teacherName}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-1">
                      {c.description || 'لا يوجد وصف تفصيلي متاح لهذه الدورة.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    {/* Progress tracker */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500">نسبة الإنجاز</span>
                        <span className="text-primary-600">{c.progressPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-primary-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${c.progressPercentage || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>{c.totalModules} فصول</span>
                      <span>{c.totalLessons} دروس رقمية</span>
                    </div>

                    <Link
                      href={`/student/courses/${c.courseId}/learn`}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer mt-2 transition-colors shadow-lg shadow-indigo-600/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{c.progressPercentage > 0 ? 'استئناف التعلم' : 'دخول غرفة التعلم والمشاهدة'}</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={courses.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="دورة"
            />
          )}
        </div>
      )}
    </div>
  );
}

function CourseDetailsView({ courseId, onBack, onStartLesson }: { courseId: string; onBack: () => void; onStartLesson: (id: string) => void }) {
  const { data: course, isLoading, isError } = useCourseDetails(courseId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack} size="sm">رجوع</Button>
        <Alert variant="error">فشل في تحميل تفاصيل المنهج الدراسي.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header back button */}
      <button onClick={onBack} className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer">
        <ChevronLeft className="w-5 h-5 ml-1" />
        الرجوع لجميع دوراتي
      </button>

      {/* Course card banner */}
      <Card className="border-none shadow-sm shadow-slate-200/50 bg-gradient-to-br from-white to-slate-50/20 overflow-hidden relative">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <BookOpen className="w-16 h-16 opacity-75" />
          </div>

          <div className="space-y-2 text-center md:text-right flex-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Badge variant="default" className="bg-primary-50 text-primary-700 border-none font-semibold">
                {course.subject}
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-white/50 text-slate-600">
                الصف: {course.gradeLevel}
              </Badge>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">{course.title}</h2>
            <p className="text-sm text-slate-500 max-w-2xl">{course.description || 'لا يوجد وصف تفصيلي للمنهج مضاف حالياً.'}</p>
            <p className="text-xs text-slate-400 font-semibold pt-1">المعلم المحاضر: {course.teacher?.user?.fullName}</p>
          </div>
        </CardContent>
      </Card>

      {/* Curriculum outline */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          المحتوى الدراسي للمنهج ({course.modules?.length || 0} فصول)
        </h3>

        {course.modules?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/60">
            <p className="text-slate-500 font-medium">لم يتم نشر أي فصول أو دروس لهذا المنهج بعد.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {course.modules.map((mod: any, mIdx: number) => (
              <div key={mod.id} className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
                {/* Module title header */}
                <div className="bg-slate-50/75 p-5 border-b border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm shrink-0">
                    {mIdx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-md leading-tight">{mod.title}</h4>
                    {mod.description && (
                      <p className="text-xs text-slate-400 mt-1 leading-normal">{mod.description}</p>
                    )}
                  </div>
                </div>

                {/* Lessons list inside module */}
                <div className="divide-y divide-slate-100">
                  {mod.lessons?.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">لا توجد دروس مضافة لهذا الفصل حتى الآن.</div>
                  ) : (
                    mod.lessons.map((lesson: any) => {
                      const isVideo = lesson.lessonType === 'VIDEO';
                      return (
                        <div 
                          key={lesson.id} 
                          onClick={() => onStartLesson(lesson.id)}
                          className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${isVideo ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                              {isVideo ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>
                            <div>
                              <h5 className="font-semibold text-sm text-slate-700 group-hover:text-primary-600 transition-colors">
                                {lesson.title}
                              </h5>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span>{isVideo ? 'فيديو محاضرة' : 'ملف / ملخص دراسي'}</span>
                                {lesson.videoDurationSeconds > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{Math.round(lesson.videoDurationSeconds / 60)} دقيقة</span>
                                  </>
                                )}
                                {lesson.isPreview && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-none font-bold py-0 text-[9px]">عرض مجاني</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-[-4px] transition-all" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LessonViewer({ courseId, lessonId, onClose, onSelectLesson }: { courseId: string; lessonId: string; onClose: () => void; onSelectLesson: (id: string) => void }) {
  const { data: lesson, isLoading: isLessonLoading, isError: isLessonError, refetch: refetchLesson } = useLessonDetails(lessonId);
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
    const isCompleted = isCompletedOverride || 
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
    updateProgress({
      lessonId,
      payload: {
        lastPositionSeconds: 0,
        isCompleted: true,
      },
    }, {
      onSuccess: () => {
        refetchLesson();
        toast.success('تم تحميل الملف وتأكيد إكمال الدرس!');
      }
    });
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
        <Button variant="outline" onClick={onClose} size="sm">رجوع للمنهج</Button>
        <Alert variant="error">
          فشل في تحميل محتوى الدرس. قد يتطلب هذا الدرس اشتراكاً نشطاً في المنهج الدراسي للوصول إليه.
        </Alert>
      </div>
    );
  }

  const isVideo = lesson.lessonType === 'VIDEO';

  // Flat lessons list for outline navigation
  const flatLessons = course?.modules?.flatMap((m: any) => m.lessons) || [];
  const currentIdx = flatLessons.findIndex((l: any) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? flatLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Player and Information view */}
      <div className="lg:col-span-3 space-y-6">
        {/* Back navigation */}
        <button onClick={onClose} className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer">
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
                <p className="font-bold text-slate-200">فشل تحميل رابط تشغيل المحاضرة</p>
                <p className="text-xs text-slate-500">حدث خطأ في توقيع الرابط المشفر للفيديو، يرجى إعادة تحميل الصفحة.</p>
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
                <Badge variant={isVideo ? 'error' : 'default'} className={isVideo ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}>
                  {isVideo ? 'محاضرة مرئية' : 'مذكرة / ملف'}
                </Badge>
                {lesson.isCompleted && (
                  <Badge variant="success" className="gap-1 bg-emerald-50 text-emerald-800 border-none font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> مكتمل
                  </Badge>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-2">{lesson.title}</h2>
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
            <h4 className="text-sm font-bold text-slate-800">وصف ومحتويات الدرس:</h4>
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
                        isActive ? 'bg-primary-50/50 border-r-4 border-primary-600 font-bold' : ''
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 ${isLesVideo ? 'text-rose-500' : 'text-blue-500'}`}>
                        {isLesVideo ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs block truncate ${isActive ? 'text-primary-800' : 'text-slate-700'}`}>
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
