'use client';

import React, { useState, useEffect } from 'react';
import {
  useStudentCourses,
  useStudentProfile,
} from '@/features/student-portal/hooks/useStudentPortal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import {
  BookOpen,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import dynamic from 'next/dynamic';
import { EnrolledCourseCard } from './EnrolledCourseCard';
import { AvailableCoursesCatalogTab } from './AvailableCoursesCatalogTab';
import { CourseDetailsView } from './CourseDetailsView';
import { LessonViewer } from './LessonViewer';

const CourseSubscriptionModal = dynamic(
  () => import('@/features/student-portal/components/CourseSubscriptionModal').then((mod) => mod.CourseSubscriptionModal),
  { ssr: false }
);

const CourseCertificateModal = dynamic(
  () => import('@/features/student-portal/components/CourseCertificateModal').then((mod) => mod.CourseCertificateModal),
  { ssr: false }
);

const PreviewPromoVideoModal = dynamic(
  () => import('./PreviewPromoVideoModal').then((mod) => mod.PreviewPromoVideoModal),
  { ssr: false }
);


export function StudentCoursesCatalogView() {
  const isOnline = useOnlineStatus();
  const { data: profile } = useStudentProfile();
  const { data: courses = [], isLoading, isError } = useStudentCourses();
  const [activeTab, setActiveTab] = useState<'ENROLLED' | 'CATALOG'>('ENROLLED');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCourseForSub, setSelectedCourseForSub] = useState<any | null>(null);
  const [certCourse, setCertCourse] = useState<{ title: string; teacherName?: string } | null>(null);
  const [previewVideoModal, setPreviewVideoModal] = useState<{
    title: string;
    videoUrl: string;
    teacherName?: string;
  } | null>(null);

  // Set default tab to CATALOG if student has no enrolled courses
  useEffect(() => {
    if (!isLoading && courses.length === 0) {
      setActiveTab('CATALOG');
    }
  }, [isLoading, courses.length]);

  if (!isOnline) {
    return (
      <FeatureRequiresOnlineCard
        featureName="الدورات الأونلاين"
        description="مشاهدة الدورات والدروس الرقمية وتحميل الملخصات تتطلب اتصالاً نشطاً بالخادم."
        backHref="/student/dashboard"
      />
    );
  }

  const PAGE_SIZE = 6;
  const totalPages = Math.ceil(courses.length / PAGE_SIZE);
  const paginatedCourses = courses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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

  // 3. Main Courses View Mode (Tabs: My Enrolled vs Platform Catalog)
  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            الدورات الأونلاين
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            شاهد الدروس الرقمية، واستكشف الكورسات المتاحة، وتابع تقدمك أولاً بأول
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl text-xs font-bold shrink-0 self-start sm:self-center border border-slate-200/60 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ENROLLED')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'ENROLLED'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>دوراتي المسجلة ({courses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CATALOG')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'CATALOG'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>استكشاف الكورسات المتاحة</span>
          </button>
        </div>
      </div>

      {activeTab === 'ENROLLED' && (
        <>
          {courses?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                لست مسجلاً في أي دورة تعليمية حتى الآن
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                استكشف الكورسات الرقمية المنشورة على المنصة واشترك في كورسات
                موادك الدراسية للبدء في مشاهدة الحصص والامتحانات.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('CATALOG')}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-600/20 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>استكشاف الدورات المتاحة الآن</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCourses.map((c: any) => (
                  <EnrolledCourseCard
                    key={c.courseId}
                    course={c}
                    onWatchPreview={(data) => setPreviewVideoModal(data)}
                    onOpenPendingSubscription={(courseData) =>
                      setSelectedCourseForSub(courseData)
                    }
                    onOpenCertificate={(data) => setCertCourse(data)}
                  />
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
        </>
      )}

      {activeTab === 'CATALOG' && (
        <AvailableCoursesCatalogTab
          studentGradeLevel={profile?.gradeLevel}
          studentAcademicStage={profile?.academicStage}
          myCourses={courses}
          onViewCertificate={(c) => setCertCourse(c)}
          onWatchPreview={(c) => setPreviewVideoModal(c)}
        />
      )}

      {certCourse && (
        <CourseCertificateModal
          isOpen={!!certCourse}
          onClose={() => setCertCourse(null)}
          data={{
            studentName: profile?.user?.fullName || 'طالب',
            courseTitle: certCourse.title,
            teacherName: certCourse.teacherName,
            completedAt: new Date().toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          }}
        />
      )}

      {selectedCourseForSub && (
        <CourseSubscriptionModal
          isOpen={!!selectedCourseForSub}
          onClose={() => setSelectedCourseForSub(null)}
          course={{
            id: selectedCourseForSub.id,
            title: selectedCourseForSub.title,
            price: selectedCourseForSub.price,
            teacherName: selectedCourseForSub.teacherName,
            subject: selectedCourseForSub.subject,
            gradeLevel: selectedCourseForSub.gradeLevel,
          }}
        />
      )}

      {/* Free Preview Promo Video Modal */}
      <PreviewPromoVideoModal
        modalData={previewVideoModal}
        onClose={() => setPreviewVideoModal(null)}
      />
    </div>
  );
}
