'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Video,
  Play,
  PlayCircle,
  Lock,
  CheckCircle2,
  Clock,
  User,
  Layers,
  ArrowRight,
  ShieldCheck,
  Award,
  Sparkles,
  HelpCircle,
  FileText,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useStudentCourses } from '@/features/student-portal/hooks/useStudentPortal';
import { useEnrollInCourse } from '@/features/student-portal/hooks/useStudentPortal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { CourseSubscriptionModal } from '@/features/student-portal/components/CourseSubscriptionModal';
import toast from 'react-hot-toast';

interface StudentCoursePageProps {
  params: {
    id: string;
  };
}

export default function StudentCourseDetailsPage({ params }: StudentCoursePageProps) {
  const router = useRouter();
  const courseId = params.id;
  const { data: myCourses = [], isLoading: isMyCoursesLoading } = useStudentCourses();
  const enrollMutation = useEnrollInCourse();

  const [course, setCourse] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePreviewLesson, setActivePreviewLesson] = useState<any | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // Check enrollment and subscription status
  const enrollment = myCourses.find((c: any) => c.courseId === courseId || c.id === courseId);
  const isEnrolled = enrollment && (enrollment.enrollmentStatus === 'ACTIVE' || (!enrollment.enrollmentStatus && enrollment.accessStatus === 'ACTIVE'));
  const isPending = enrollment?.enrollmentStatus === 'PENDING';
  const isDropped = enrollment?.enrollmentStatus === 'DROPPED';

  useEffect(() => {
    async function fetchCourseDetails() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.al-awal.online/api/v1';
        const res = await fetch(`${baseUrl}/courses/${courseId}/public`);
        if (res.ok) {
          const data = await res.json();
          const courseData = data.data || data;
          setCourse(courseData);

          // Find first preview lesson if available
          const allLessons = (courseData.modules || []).flatMap((m: any) => m.lessons || []);
          const firstPreview = allLessons.find((l: any) => l.isPreview && l.freeVideoUrl);
          if (firstPreview) {
            setActivePreviewLesson(firstPreview);
          }
        } else {
          toast.error('تعذر تحميل بيانات الكورس المطلوب');
        }
      } catch (err) {
        console.error('Failed to load course details:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  const handleEnroll = () => {
    if (isEnrolled) {
      router.push(`/student/courses/${courseId}/learn`);
      return;
    }
    setIsSubscriptionModalOpen(true);
  };

  if (isLoading || isMyCoursesLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 py-8 animate-in fade-in">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <BookOpen className="w-16 h-16 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">الكورس غير متاح حالياً</h2>
        <p className="text-slate-500 text-sm">قد يكون الكورس قيد التجهيز أو تم تغيير الرابط الخاص به.</p>
        <Link
          href="/student/courses"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لقائمة الدورات</span>
        </Link>
      </div>
    );
  }

  const allModules = course.modules || [];
  const totalLessonsCount = allModules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 animate-in fade-in text-right">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-primary-950 to-primary-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />

        <div className="flex items-center gap-2 text-xs text-primary-200 mb-3 flex-wrap">
          <Link href="/student/courses" className="hover:text-white transition-colors">
            الدورات الأونلاين
          </Link>
          <span>/</span>
          <span>{course.subject}</span>
          <span>/</span>
          <span className="text-white font-bold">{course.title}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary-500/30 text-primary-200 border-none px-3 py-1 font-bold">
                {course.subject}
              </Badge>
              <Badge className="bg-white/10 text-white border-none px-3 py-1">
                {course.gradeLevel}
              </Badge>
              {course.academicStage && (
                <Badge className="bg-indigo-500/30 text-indigo-200 border-none px-3 py-1">
                  {course.academicStage}
                </Badge>
              )}
              <Badge className="bg-emerald-500/20 text-emerald-300 border-none px-3 py-1">
                {course.academicTerm === 'FIRST_TERM' ? 'الترم الأول' : 'الترم الثاني'}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{course.title}</h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {course.description || 'شرح تفصيلي ومبسط لمنهج المادة مع تدريبات تفاعلية ومذكرات قابلة للتحميل.'}
            </p>

            <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-300 pt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-primary-400" />
                <span>المعلم: <strong className="text-white">{course.teacher?.user?.fullName || course.teacherName || 'أ. طارق عبد الله'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary-400" />
                <span>{allModules.length} فصول تعليمية</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-primary-400" />
                <span>{totalLessonsCount} درس رقمي</span>
              </div>
            </div>
          </div>

          {/* Price & Action Box */}
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15 text-center min-w-[240px] flex flex-col justify-center space-y-4 shrink-0">
            <div>
              <span className="text-xs text-slate-300 block mb-1">سعر الاشتراك</span>
              {Number(course.price) > 0 ? (
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl font-black text-white">{course.price}</span>
                  <span className="text-sm font-bold text-primary-300">ج.م</span>
                </div>
              ) : (
                <span className="text-2xl font-black text-emerald-400">مجاني بالكامل</span>
              )}
            </div>

            {isEnrolled ? (
              <Link
                href={`/student/courses/${courseId}/learn`}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>أنت مشترك بالفعل • دخول الكورس</span>
              </Link>
            ) : isPending ? (
              <button
                type="button"
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Clock className="w-4 h-4 animate-pulse" />
                <span>طلبك قيد المراجعة ⏳ (عرض تفاصيل الإيصال)</span>
              </button>
            ) : isDropped ? (
              <button
                type="button"
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة الاشتراك في الكورس</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrollMutation.isPending}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-primary-500 hover:bg-primary-600 text-white transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
              >
                {enrollMutation.isPending ? (
                  <span>جاري تفعيل الاشتراك...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>اشترك الآن في هذا الكورس</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Main Column: Syllabus & Video Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Free Preview Player */}
          {activePreviewLesson && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <span className="text-xs sm:text-sm font-bold truncate">معاينة مجانية: {activePreviewLesson.title}</span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-none text-xs">درس تجريبي مجاني</Badge>
              </div>
              <div className="aspect-video w-full bg-black relative">
                <iframe
                  src={activePreviewLesson.freeVideoUrl}
                  loading="lazy"
                  className="w-full h-full border-0"
                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Curriculum / Syllabus Modules */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-600" />
                <span>محتوى ومنهج الكورس ({allModules.length} وحدات)</span>
              </h2>
              <span className="text-xs text-slate-500 font-semibold">{totalLessonsCount} درس</span>
            </div>

            <div className="space-y-4">
              {allModules.map((module: any, mIdx: number) => (
                <div key={module.id || mIdx} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  <div className="p-4 bg-slate-100/70 flex items-center justify-between font-bold text-slate-800 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-mono">
                        {mIdx + 1}
                      </span>
                      <span>{module.title}</span>
                    </div>
                    <span className="text-xs text-slate-500 font-normal">{module.lessons?.length || 0} دروس</span>
                  </div>

                  <div className="divide-y divide-slate-100 bg-white">
                    {(module.lessons || []).map((lesson: any, lIdx: number) => {
                      const isPreview = lesson.isPreview && lesson.freeVideoUrl;
                      const isActive = activePreviewLesson?.id === lesson.id;

                      return (
                        <div
                          key={lesson.id || lIdx}
                          className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                            isActive ? 'bg-primary-50/70 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isPreview ? (
                              <button
                                type="button"
                                onClick={() => setActivePreviewLesson(lesson)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isActive
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                }`}
                                title="مشاهدة الفيديو المجاني"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                            ) : (
                              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-400">
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <span className="truncate text-slate-700">{lesson.title}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isPreview ? (
                              <button
                                type="button"
                                onClick={() => setActivePreviewLesson(lesson)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-colors"
                              >
                                {isActive ? 'قيد المشاهدة' : 'معاينة مجانية'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">مغلق للمشتركين</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Course Features & Highlights */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              مميزات الاشتراك في الكورس
            </h3>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>مشاهدة شروحات الفيديو بجودة عالية وسيرفرات فائقة السرعة بدون تقطيع.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>تحميل مذكرات الشرح وملخصات PDF لكل درس دراسي.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>اختبارات إلكترونية تفاعلية وتقييم فوري للدرجات وتصحيح الإجابات.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>لوحة مناقشة وأسئلة لكل ثانية في الفيديو مع المدرس والمساعدين.</span>
              </li>
              {course.hasCertificate && (
                <li className="flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="font-bold text-slate-800">شهادة إتمام معتمدة تصدر فور إكمال جميع دروس واختبارات الكورس.</span>
                </li>
              )}
            </ul>

            <div className="pt-4 border-t border-slate-100">
              {isEnrolled ? (
                <Link
                  href={`/student/courses/${courseId}/learn`}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>دخول غرفة المشاهدة والتعلم</span>
                </Link>
              ) : isPending ? (
                <button
                  type="button"
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>طلبك قيد المراجعة ⏳</span>
                </button>
              ) : isDropped ? (
                <button
                  type="button"
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة الاشتراك في الكورس</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrollMutation.isPending}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  اشترك الآن في الكورس
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {course && isSubscriptionModalOpen && (
        <CourseSubscriptionModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
          course={{
            id: course.id,
            title: course.title,
            price: course.price,
            teacherName: course.teacher?.user?.fullName || course.teacherName,
            teacherPhone: course.teacher?.user?.phone,
            subject: course.subject,
            gradeLevel: course.gradeLevel,
          }}
          onSuccess={() => {
            setIsSubscriptionModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
