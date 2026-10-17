'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useEnrollInCourse } from '../../hooks/useStudentPortal';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { BookOpen, Monitor, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api/endpoints';
import { OnlineCourseCard } from './OnlineCourseCard';
import { OnlineCoursePromoModal } from './OnlineCoursePromoModal';

const CourseSubscriptionModal = dynamic(
  () => import('../CourseSubscriptionModal').then((mod) => mod.CourseSubscriptionModal),
  { ssr: false }
);

interface OnlineCoursesCatalogProps {
  gradeLevel?: string;
  academicStage?: string;
  enrolledCourses?: any[];
  onViewCertificate?: (course: { title: string; teacherName?: string }) => void;
}

export function OnlineCoursesCatalog({
  gradeLevel,
  academicStage,
  enrolledCourses = [],
  onViewCertificate,
}: OnlineCoursesCatalogProps) {
  const router = useRouter();
  const myCourses = enrolledCourses;
  const enrollMutation = useEnrollInCourse();

  const [courses, setCourses] = useState<any[]>([]);
  const [allPlatformCourses, setAllPlatformCourses] = useState<any[]>([]);
  const [scope, setScope] = useState<'MY_GRADE' | 'ALL' | 'FREE'>('MY_GRADE');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      setIsLoading(true);
      try {
        const baseUrl = API_BASE_URL;

        let url = `${baseUrl}/courses/catalog?limit=12`;
        if (gradeLevel) url += `&gradeLevel=${encodeURIComponent(gradeLevel)}`;
        if (academicStage) url += `&academicStage=${encodeURIComponent(academicStage)}`;

        const [gradeRes, allRes] = await Promise.all([
          fetch(url),
          fetch(`${baseUrl}/courses/catalog?limit=12`),
        ]);

        if (gradeRes.ok) {
          const gradeData = await gradeRes.json();
          setCourses(gradeData.data || []);
        }

        if (allRes.ok) {
          const allData = await allRes.json();
          setAllPlatformCourses(allData.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCourses();
  }, [gradeLevel, academicStage]);

  const freeCourses = allPlatformCourses.filter(
    (c: any) => Number(c.price || 0) === 0 || c.isFree === true,
  );
  const displayedCourses =
    scope === 'FREE'
      ? freeCourses
      : scope === 'MY_GRADE' && courses.length > 0
      ? courses
      : allPlatformCourses;

  const [selectedCourseForSub, setSelectedCourseForSub] = useState<any | null>(null);
  const [previewVideoModal, setPreviewVideoModal] = useState<{
    title: string;
    videoUrl: string;
    teacherName?: string;
  } | null>(null);

  const handleQuickEnroll = async (course: any) => {
    if (Number(course.price || 0) === 0 || course.isFree === true) {
      try {
        await enrollMutation.mutateAsync(course.id);
        router.push(`/student/courses/${course.id}/learn`);
      } catch {
        // Error toast is handled in the mutation's onError
      }
      return;
    }
    setSelectedCourseForSub(course);
  };

  if (isLoading) {
    return (
      <div className="py-6 space-y-4">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (displayedCourses.length === 0) {
    return (
      <Card className="border-slate-100 shadow-sm mb-6">
        <CardContent className="p-8 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">لا يوجد دورات متاحة حالياً</h3>
          <p className="text-slate-500 mt-2">عفواً، لا يوجد دورات أونلاين منشورة على المنصة في الوقت الحالي.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              {scope === 'FREE' ? 'الكورسات المجانية' : 'الدورات الأونلاين المتاحة للاشتراك'}
            </h3>
            <p className="text-xs text-slate-500">
              {scope === 'FREE'
                ? 'يمكنك الانضمام والتعلم مجاناً بدون اشتراك'
                : scope === 'MY_GRADE' && courses.length > 0
                ? `معروض كورسات مخصصة لـ (${gradeLevel || 'مرحلتك الدراسية'})`
                : 'معروض جميع الكورسات الأونلاين المتاحة على المنصة'}
            </p>
          </div>
        </div>

        {/* Scope selector tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setScope('MY_GRADE')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scope === 'MY_GRADE'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            لمرحلتي ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setScope('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              scope === 'ALL'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            جميع الكورسات ({allPlatformCourses.length})
          </button>
          <button
            type="button"
            onClick={() => setScope('FREE')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              scope === 'FREE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            مجانية ({freeCourses.length})
          </button>
        </div>
      </div>

      {courses.length === 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <BookOpen className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-0.5">تنويه للطلاب:</strong>
            <span>لا توجد كورسات مخصصة حصرياً لـ ({gradeLevel || 'مرحلتك'}) حالياً، ولكن تم عرض كافة الكورسات المتاحة على المنصة لتتمكن من استكشافها والاشتراك بها.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedCourses.map((course: any, index: number) => (
          <OnlineCourseCard
            key={course.id}
            course={course}
            index={index}
            myCourses={myCourses}
            onQuickEnroll={handleQuickEnroll}
            onViewCertificate={onViewCertificate}
            onOpenPromo={(promo) => setPreviewVideoModal(promo)}
            isEnrollPending={enrollMutation.isPending}
          />
        ))}
      </div>

      {selectedCourseForSub && (
        <CourseSubscriptionModal
          isOpen={Boolean(selectedCourseForSub)}
          onClose={() => setSelectedCourseForSub(null)}
          course={{
            id: selectedCourseForSub.id,
            title: selectedCourseForSub.title,
            price: selectedCourseForSub.price,
            teacherName: selectedCourseForSub.teacher?.user?.fullName || selectedCourseForSub.teacherName,
            teacherPhone: selectedCourseForSub.teacher?.user?.phone,
            subject: selectedCourseForSub.subject,
            gradeLevel: selectedCourseForSub.gradeLevel,
          }}
        />
      )}

      {/* Course Promo / Preview Video Modal */}
      <OnlineCoursePromoModal
        previewVideoModal={previewVideoModal}
        onClose={() => setPreviewVideoModal(null)}
      />
    </div>
  );
}
