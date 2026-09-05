'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  useStudentCourses,
  useCourseDetails,
  useLessonDetails,
  useUpdateProgress,
  useEnrollInCourse,
  useStudentProfile,
} from '@/features/student-portal/hooks/useStudentPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import {
  BookOpen,
  Video,
  FileText,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Award,
  Clock,
  User,
  Search,
  Sparkles,
  Layers,
  Compass,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  TrendingUp,
  X,
} from 'lucide-react';
import { FeatureRequiresOnlineCard } from '@/components/offline/FeatureRequiresOnlineCard';
import { useOnlineStatus } from '@/lib/offline/use-online-status';
import { useRouter } from 'next/navigation';
import { CourseSubscriptionModal } from '@/features/student-portal/components/CourseSubscriptionModal';
import { CourseCertificateModal } from '@/features/student-portal/components/CourseCertificateModal';
import toast from 'react-hot-toast';

export default function StudentCoursesPage() {
  const isOnline = useOnlineStatus();
  const router = useRouter();
  const { data: profile } = useStudentProfile();
  const { data: courses = [], isLoading, isError } = useStudentCourses();
  const [activeTab, setActiveTab] = useState<'ENROLLED' | 'CATALOG'>('ENROLLED');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCourseForSub, setSelectedCourseForSub] = useState<any | null>(null);
  const [certCourse, setCertCourse] = useState<{ title: string; teacherName?: string } | null>(null);
  const [previewVideoModal, setPreviewVideoModal] = useState<{ title: string; videoUrl: string; teacherName?: string } | null>(null);

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

  // 3. Main Courses View Mode (Tabs: My Enrolled vs Platform Catalog)
  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">الدورات الأونلاين</h1>
          <p className="text-sm text-slate-500 mt-1">شاهد الدروس الرقمية، واستكشف الكورسات المتاحة، وتابع تقدمك أولاً بأول</p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl text-xs font-bold shrink-0 self-start sm:self-center border border-slate-200/60 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ENROLLED')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
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
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
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
              <h3 className="text-lg font-bold text-slate-800">لست مسجلاً في أي دورة تعليمية حتى الآن</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                استكشف الكورسات الرقمية المنشورة على المنصة واشترك في كورسات موادك الدراسية للبدء في مشاهدة الحصص والامتحانات.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('CATALOG')}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-600/20"
              >
                <Compass className="w-4 h-4" />
                <span>استكشاف الدورات المتاحة الآن</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCourses.map((c: any) => (
                  <Card key={c.courseId} className={`border shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group ${
                    c.enrollmentStatus === 'PENDING' ? 'border-amber-300 ring-1 ring-amber-200' : 'border-none shadow-slate-200/50'
                  }`}>
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

                      {/* Play preview video overlay */}
                      {c.previewVideoUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewVideoModal({
                              title: c.title,
                              videoUrl: c.previewVideoUrl,
                              teacherName: c.teacherName,
                            });
                          }}
                          className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 hover:bg-black/45 transition-all group/play cursor-pointer"
                          title="مشاهدة الفيديو التعريفي (البرومو) للكورس"
                        >
                          <div className="w-12 h-12 bg-white/90 group-hover/play:bg-white text-primary-600 rounded-full flex items-center justify-center shadow-lg group-hover/play:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </button>
                      )}

                      <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap z-20">
                        <Badge variant="default" className="bg-white/95 text-slate-800 border-none shadow-xs font-semibold">
                          {c.subject || 'عام'}
                        </Badge>
                        {c.enrollmentStatus === 'PENDING' && (
                          <Badge className="bg-amber-500 text-white border-none text-[11px] font-bold shadow-xs flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>قيد المراجعة</span>
                          </Badge>
                        )}
                        {c.progressPercentage >= 100 && (
                          <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-none text-[11px] font-extrabold shadow-sm flex items-center gap-1 ring-1 ring-white/30">
                            <Award className="w-3.5 h-3.5 text-amber-200" />
                            <span>مكتمل 100% 🎓</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-primary-600 transition-colors leading-tight">
                          {c.title}
                        </h3>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            المعلم: {c.teacherName}
                          </p>
                          {c.previewVideoUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewVideoModal({
                                  title: c.title,
                                  videoUrl: c.previewVideoUrl,
                                  teacherName: c.teacherName,
                                })
                              }
                              className="text-[11px] font-bold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>فيديو تعريفي 🎬</span>
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-1">
                          {c.description || 'لا يوجد وصف تفصيلي متاح لهذه الدورة.'}
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        {/* Progress tracker */}
                        <div className={`p-3 rounded-xl border transition-all ${
                          c.progressPercentage >= 100
                            ? 'bg-gradient-to-b from-emerald-50/90 to-teal-50/50 border-emerald-200'
                            : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className={c.progressPercentage >= 100 ? 'text-emerald-800 font-bold flex items-center gap-1' : 'text-slate-600 flex items-center gap-1'}>
                              {c.progressPercentage >= 100 ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>أتممت الدورة بنجاح 🎉</span>
                                </>
                              ) : (
                                <>
                                  <TrendingUp className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                                  <span>نسبة الإنجاز</span>
                                </>
                              )}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-black ${
                              c.progressPercentage >= 100 ? 'bg-emerald-200 text-emerald-950' : 'bg-primary-100/70 text-primary-800'
                            }`}>
                              {c.progressPercentage || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                c.progressPercentage >= 100
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs'
                                  : 'bg-primary-600'
                              }`}
                              style={{ width: `${Math.min(c.progressPercentage || 0, 100)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                            <span>{c.totalModules} فصول</span>
                            <span>
                              {c.completedLessons != null 
                                ? `${c.completedLessons} من ${c.totalLessons} درس مكتمل` 
                                : `${c.totalLessons} دروس رقمية`}
                            </span>
                          </div>
                        </div>

                        {c.enrollmentStatus === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCourseForSub({
                              id: c.courseId,
                              title: c.title,
                              price: c.price,
                              teacherName: c.teacherName,
                              subject: c.subject,
                              gradeLevel: c.gradeLevel,
                            })}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer mt-2 transition-colors shadow-lg shadow-amber-500/20"
                          >
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            <span>طلبك قيد المراجعة ⏳ (عرض الإيصال)</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <Link
                              href={`/student/courses/${c.courseId}/learn`}
                              className={`flex-1 rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${
                                c.progressPercentage >= 100
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/20'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                              }`}
                            >
                              {c.progressPercentage >= 100 ? (
                                <>
                                  <Award className="w-3.5 h-3.5 text-amber-200" />
                                  <span>مراجعة الدورة 🎓</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>{c.progressPercentage > 0 ? 'استئناف التعلم' : 'دخول غرفة التعلم والمشاهدة'}</span>
                                </>
                              )}
                            </Link>

                            {c.progressPercentage >= 100 && c.isCertificateEligible && (
                              <button
                                type="button"
                                onClick={() => setCertCourse({ title: c.title, teacherName: c.teacherName })}
                                className="px-3 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                                title="تحميل شهادة الإتمام"
                              >
                                <Award className="w-4 h-4 text-amber-600" />
                                <span className="hidden sm:inline">شهادتي</span>
                              </button>
                            )}
                          </div>
                        )}
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
      {previewVideoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewVideoModal(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl border border-slate-200 text-right animate-in zoom-in-95 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{previewVideoModal.title}</h3>
                  <p className="text-xs text-slate-400">
                    الفيديو التعريفي (البرومو الترويجي) • {previewVideoModal.teacherName || 'معلم المادة'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideoModal(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-slate-950">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-800">
                <iframe
                  src={`${previewVideoModal.videoUrl}${previewVideoModal.videoUrl.includes('?') ? '&' : '?'}autoplay=1`}
                  className="w-full h-full border-0"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                معاينة مجانية للمحتوى التمهيدي
              </span>
              <button
                type="button"
                onClick={() => setPreviewVideoModal(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AvailableCoursesCatalogTab({
  studentGradeLevel,
  studentAcademicStage,
  myCourses = [],
  onViewCertificate,
  onWatchPreview,
}: {
  studentGradeLevel?: string;
  studentAcademicStage?: string;
  myCourses?: any[];
  onViewCertificate?: (course: { title: string; teacherName?: string }) => void;
  onWatchPreview?: (course: { title: string; videoUrl: string; teacherName?: string }) => void;
}) {
  const router = useRouter();
  const enrollMutation = useEnrollInCourse();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');

  useEffect(() => {
    async function fetchCatalog() {
      setIsLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.al-awal.online/api/v1';
        let url = `${baseUrl}/courses/catalog?limit=50`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCatalog(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch published catalog:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  const filteredCatalog = catalog.filter((c: any) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.subject && c.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.gradeLevel && c.gradeLevel.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStage =
      selectedStage === 'ALL' ||
      (selectedStage === 'MY_GRADE' && c.gradeLevel === studentGradeLevel) ||
      c.academicStage === selectedStage;

    return matchesSearch && matchesStage;
  });

  const [selectedCourseForSub, setSelectedCourseForSub] = useState<any | null>(null);

  const handleEnroll = (course: any) => {
    setSelectedCourseForSub(course);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث عن دورة أو مادة أو معلم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-right"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedStage('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedStage === 'ALL'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({catalog.length})
          </button>
          {studentGradeLevel && (
            <button
              type="button"
              onClick={() => setSelectedStage('MY_GRADE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedStage === 'MY_GRADE'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              مرحلتي الدراسية
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto">
          <Compass className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-700">لا توجد دورات تطابق البحث</h3>
          <p className="text-slate-400 text-xs mt-1">جرب البحث بكلمات أخرى أو اختر تصفية مختلفة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCatalog.map((c: any, index: number) => {
            const enrollment = myCourses.find((item: any) => item.courseId === c.id || item.id === c.id);
            const isEnrolled = enrollment && (enrollment.enrollmentStatus === 'ACTIVE' || (!enrollment.enrollmentStatus && enrollment.accessStatus === 'ACTIVE'));
            const isPending = enrollment?.enrollmentStatus === 'PENDING';
            const isRejected = enrollment?.enrollmentStatus === 'DROPPED';

            const progress = Number(enrollment?.progressPercentage || 0);
            const totalLessons = Number(enrollment?.totalLessons ?? c.lessonsCount ?? c._count?.lessons ?? 0);
            const completedLessons = Number(
              enrollment?.completedLessons ?? (totalLessons > 0 ? Math.round((progress / 100) * totalLessons) : 0)
            );
            const isCompleted = isEnrolled && (Boolean(enrollment?.isCompleted) || (progress >= 100 && (totalLessons > 0 || completedLessons > 0)));
            const isCertificateEligible = Boolean(enrollment?.isCertificateEligible);

            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all text-right ${
                  isPending ? 'border-amber-300 ring-1 ring-amber-200' : isCompleted ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Banner / Cover */}
                <div className="h-44 w-full bg-slate-100 relative overflow-hidden shrink-0">
                  {c.coverImageUrl ? (
                    <img
                      src={c.coverImageUrl}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${
                        isCompleted
                          ? 'from-emerald-600 via-teal-600 to-teal-700'
                          : index % 3 === 0
                          ? 'from-blue-600 to-indigo-700'
                          : index % 3 === 1
                          ? 'from-indigo-600 to-purple-700'
                          : 'from-emerald-600 to-teal-700'
                      } flex items-center justify-center text-white`}
                    >
                      <BookOpen className="w-10 h-10 opacity-30" />
                    </div>
                  )}

                  {/* Play preview button overlay if preview video exists */}
                  {(c.previewVideoUrl || c.freeVideoUrl) && onWatchPreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onWatchPreview({
                          title: c.title,
                          videoUrl: c.previewVideoUrl || c.freeVideoUrl,
                          teacherName: c.teacher?.user?.fullName || c.teacherName,
                        });
                      }}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 hover:bg-black/45 transition-all group/play cursor-pointer"
                      title="مشاهدة الفيديو التعريفي (البرومو) للكورس"
                    >
                      <div className="w-12 h-12 bg-white/90 group-hover/play:bg-white text-primary-600 rounded-full flex items-center justify-center shadow-lg group-hover/play:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </button>
                  )}

                  <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap z-20">
                    <Badge className="bg-white/95 text-slate-800 border-none text-[11px] font-bold shadow-xs">
                      {c.subject || 'مادة عامة'}
                    </Badge>
                    <Badge className="bg-black/40 text-white border-none text-[11px]">
                      {c.gradeLevel}
                    </Badge>
                    {isPending && (
                      <Badge className="bg-amber-500 text-white border-none text-[11px] font-bold shadow-xs flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3" />
                        <span>قيد المراجعة</span>
                      </Badge>
                    )}
                    {isCompleted ? (
                      <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-none text-[11px] font-extrabold shadow-md flex items-center gap-1 ring-1 ring-white/30">
                        <Award className="w-3.5 h-3.5 text-amber-200" />
                        <span>مكتمل 100% 🎓</span>
                      </Badge>
                    ) : isEnrolled ? (
                      <Badge className="bg-emerald-500 text-white border-none text-[11px] font-bold shadow-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>مشترك بالفعل{progress > 0 ? ` • ${progress}%` : ''}</span>
                      </Badge>
                    ) : null}
                  </div>

                  <div className="absolute top-3 left-3 z-20">
                    <Badge className="bg-white/90 text-slate-800 border-none text-[11px] font-bold shadow-xs">
                      {c.academicTerm === 'FIRST_TERM' ? 'ترم أول' : 'ترم ثاني'}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-lg text-slate-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
                        {c.title}
                      </h4>
                      {Number(c.price) > 0 ? (
                        <span className="font-black text-primary-700 shrink-0 text-sm bg-primary-50 border border-primary-100 px-2.5 py-0.5 rounded-lg">
                          {c.price} ج.م
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700 shrink-0 text-xs bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">
                          مجاني
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-slate-500">
                      المعلم: <strong className="text-slate-800">{c.teacher?.user?.fullName || c.teacherName || 'أ. أحمد غريب'}</strong>
                    </p>

                    <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">
                      {c.description || 'شرح مبسط ومفصل للمنهج مع تدريبات تفاعلية ومذكرات رقمية.'}
                    </p>
                  </div>

                  {/* Progress Box for Enrolled Courses */}
                  {isEnrolled && (
                    <div className={`p-3 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-gradient-to-b from-emerald-50/90 to-teal-50/50 border-emerald-200'
                        : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-1.5">
                          {isCompleted ? (
                            <span className="text-emerald-800 flex items-center gap-1.5 font-extrabold text-xs">
                              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>أتممت هذه الدورة بنجاح 🎉</span>
                            </span>
                          ) : (
                            <span className="text-slate-700 flex items-center gap-1.5 font-semibold text-xs">
                              <TrendingUp className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                              <span>مستوى التقدم في الكورس</span>
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-200 text-emerald-950 font-bold'
                            : 'bg-primary-100/80 text-primary-800'
                        }`}>
                          {progress}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs'
                              : 'bg-gradient-to-r from-primary-600 to-indigo-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                        <span>
                          {totalLessons > 0 ? `${completedLessons} من ${totalLessons} درس مكتمل` : (isCompleted ? 'جميع الدروس مكتملة' : 'في بداية المسار')}
                        </span>
                        {isCompleted && isCertificateEligible && onViewCertificate && (
                          <button
                            type="button"
                            onClick={() => onViewCertificate({
                              title: c.title,
                              teacherName: c.teacher?.user?.fullName || c.teacherName,
                            })}
                            className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            <span>عرض الشهادة</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {(c.previewVideoUrl || c.freeVideoUrl) && onWatchPreview && (
                      <button
                        type="button"
                        onClick={() =>
                          onWatchPreview({
                            title: c.title,
                            videoUrl: c.previewVideoUrl || c.freeVideoUrl,
                            teacherName: c.teacher?.user?.fullName || c.teacherName,
                          })
                        }
                        className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs text-center transition-colors border border-emerald-200/80 shadow-2xs flex items-center justify-center gap-1 cursor-pointer shrink-0"
                        title="مشاهدة الفيديو التعريفي المجاني"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>برومو 🎬</span>
                      </button>
                    )}

                    <Link
                      href={`/student/courses/${c.id}`}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs text-center transition-colors shadow-2xs"
                    >
                      تفاصيل المنهج
                    </Link>

                    {isCompleted ? (
                      <Link
                        href={`/student/courses/${c.id}/learn`}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs text-center transition-all shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-200" />
                        <span>مراجعة الكورس 🎓</span>
                      </Link>
                    ) : isEnrolled ? (
                      <Link
                        href={`/student/courses/${c.id}/learn`}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center transition-colors shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>استئناف التعلم</span>
                      </Link>
                    ) : isPending ? (
                      <button
                        type="button"
                        onClick={() => handleEnroll(c)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        <span>قيد المراجعة ⏳</span>
                      </button>
                    ) : isRejected ? (
                      <button
                        type="button"
                        onClick={() => handleEnroll(c)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>إعادة الاشتراك</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnroll(c)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs text-center transition-colors shadow-xs cursor-pointer"
                      >
                        اشترك الآن
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedCourseForSub && (
        <CourseSubscriptionModal
          isOpen={!!selectedCourseForSub}
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
