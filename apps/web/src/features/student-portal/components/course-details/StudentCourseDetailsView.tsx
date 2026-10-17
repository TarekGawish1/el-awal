'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useStudentCourses, useEnrollInCourse } from '@/features/student-portal/hooks/useStudentPortal';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '@/lib/api/endpoints';
import { CourseHeaderBanner } from './CourseHeaderBanner';
import { CourseCurriculumList } from './CourseCurriculumList';
import { CourseFeaturesSidebar } from './CourseFeaturesSidebar';

const CourseSubscriptionModal = dynamic(
  () => import('@/features/student-portal/components/CourseSubscriptionModal').then((mod) => mod.CourseSubscriptionModal),
  { ssr: false }
);

interface StudentCourseDetailsViewProps {
  courseId: string;
}

export function StudentCourseDetailsView({ courseId }: StudentCourseDetailsViewProps) {
  const router = useRouter();
  const { data: myCourses = [], isLoading: isMyCoursesLoading } = useStudentCourses();
  const enrollMutation = useEnrollInCourse();

  const [course, setCourse] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePreviewLesson, setActivePreviewLesson] = useState<any | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Check enrollment and subscription status
  const enrollment = myCourses.find((c: any) => c.courseId === courseId || c.id === courseId);
  const isEnrolled = enrollment && (enrollment.enrollmentStatus === 'ACTIVE' || (!enrollment.enrollmentStatus && enrollment.accessStatus === 'ACTIVE'));
  const isPending = enrollment?.enrollmentStatus === 'PENDING';
  const isDropped = enrollment?.enrollmentStatus === 'DROPPED';
  const progress = Number(enrollment?.progressPercentage || 0);
  const completedLessons = Number(enrollment?.completedLessons || 0);
  const isCompleted = isEnrolled && (Boolean(enrollment?.isCompleted) || progress >= 100);

  useEffect(() => {
    async function fetchCourseDetails() {
      try {
        const baseUrl = API_BASE_URL;
        const res = await fetch(`${baseUrl}/courses/${courseId}/public`);
        if (res.ok) {
          const data = await res.json();
          const courseData = data.data || data;
          setCourse(courseData);
          setExpandedModules(new Set((courseData.modules || []).slice(0, 1).map((module: any) => module.id)));

          // Find course preview video or first preview lesson if available
          if (courseData.previewVideoUrl) {
            setActivePreviewLesson({
              id: 'course-preview-intro',
              title: 'فيديو تعريفي بالكورس 🎬',
              freeVideoUrl: courseData.previewVideoUrl,
              isCourseIntro: true,
            });
          } else {
            const allLessons = (courseData.modules || []).flatMap((m: any) => m.lessons || []);
            const firstPreview = allLessons.find((l: any) => l.isPreview && l.freeVideoUrl);
            if (firstPreview) {
              setActivePreviewLesson(firstPreview);
            }
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

  const handleEnroll = async () => {
    if (isEnrolled) {
      router.push(`/student/courses/${courseId}/learn`);
      return;
    }
    // Free course: bypass payment modal, enroll directly and navigate to learn page
    if (course && (Number(course.price || 0) === 0 || course.isFree)) {
      try {
        await enrollMutation.mutateAsync(courseId);
        router.push(`/student/courses/${courseId}/learn`);
      } catch {
        // Error toast handled by mutation's onError
      }
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
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors cursor-pointer"
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
      <CourseHeaderBanner
        course={course}
        courseId={courseId}
        isEnrolled={Boolean(isEnrolled)}
        isCompleted={Boolean(isCompleted)}
        isPending={Boolean(isPending)}
        isDropped={Boolean(isDropped)}
        progress={progress}
        completedLessons={completedLessons}
        totalLessonsCount={totalLessonsCount}
        allModules={allModules}
        onEnroll={handleEnroll}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        isEnrolling={enrollMutation.isPending}
      />

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CourseCurriculumList
            course={course}
            allModules={allModules}
            totalLessonsCount={totalLessonsCount}
            activePreviewLesson={activePreviewLesson}
            setActivePreviewLesson={setActivePreviewLesson}
            expandedModules={expandedModules}
            setExpandedModules={setExpandedModules}
          />
        </div>

        <CourseFeaturesSidebar
          course={course}
          courseId={courseId}
          isEnrolled={Boolean(isEnrolled)}
          isPending={Boolean(isPending)}
          isDropped={Boolean(isDropped)}
          onEnroll={handleEnroll}
          onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
          isEnrolling={enrollMutation.isPending}
        />
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
