'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Search,
  Layers,
  Video,
  Users,
  Eye,
  Trash2,
  Edit,
  Award,
  DollarSign,
  Globe,
  Lock,
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Settings2,
  ExternalLink,
  Phone,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Loader2,
  Copy,
  UserMinus,
  Filter,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTeacherCourses, useDeleteCourse } from '../hooks/useCourses';
import { coursesApi } from '../api/courses.api';
import { API_BASE_URL } from '@/lib/api/endpoints';
import { CourseDetail } from '../types/courses.types';
import { CreateCourseModal } from './CreateCourseModal';
import { EditCourseModal } from './EditCourseModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function CourseManagementContainer() {
  const router = useRouter();
  const { data: courses = [], isLoading } = useTeacherCourses();
  const deleteMutation = useDeleteCourse();

  // Real-time subscriptions polling
  const { data: subsData } = useQuery({
    queryKey: ['teacher-subscriptions'],
    queryFn: coursesApi.getTeacherSubscriptions,
    refetchInterval: 5000,
  });
  const pendingCount = subsData?.counts?.pending ?? 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<CourseDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'COURSES' | 'ENROLLMENTS'>('COURSES');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Custom Delete Modal State
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string } | null>(null);

  const filteredCourses = useMemo(() => {
    return courses.filter((c: CourseDetail) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = selectedGrade === 'ALL' || c.gradeLevel === selectedGrade;
      const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [courses, searchTerm, selectedGrade, selectedStatus]);

  // Overall Stats
  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c: CourseDetail) => c.status === 'PUBLISHED').length;
  const totalEnrollments = courses.reduce((acc: number, c: CourseDetail) => acc + (c._count?.enrollments || 0), 0);
  const totalLessons = courses.reduce((acc: number, c: CourseDetail) => acc + (c.totalLessons || 0), 0);

  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <Video className="w-5 h-5" />
            </div>
            <span>الكورسات والدورات التدريبية أونلاين</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة المناهج المصورة، الفصول والوحدات، ملخصات الشرح والاختبارات التفاعلية
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء كورس جديد</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500">إجمالي الكورسات</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalCourses}</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500">الكورسات المنشورة</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{publishedCourses}</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500">إجمالي الدروس المصورة</p>
          <p className="text-2xl font-bold text-primary-600 mt-1 font-mono">{totalLessons}</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500">الاشتراكات والطلاب</p>
          <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">{totalEnrollments}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('COURSES')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'COURSES'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          المناهج والكورسات
        </button>
        <button
          onClick={() => setActiveTab('ENROLLMENTS')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'ENROLLMENTS'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الاشتراكات والطلبات الأونلاين</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'COURSES' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Search & Filters */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row gap-3 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الكورس أو المادة الدراسية..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </div>

        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm cursor-pointer"
        >
          <option value="ALL">جميع المراحل والصفوف</option>
          <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
          <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
          <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
          <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
          <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
          <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full sm:w-40 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm cursor-pointer"
        >
          <option value="ALL">جميع الحالات</option>
          <option value="PUBLISHED">منشور أونلاين</option>
          <option value="DRAFT">مسودة</option>
        </select>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لا توجد كورسات مطابقة للبحث</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            قم بإنشاء كورس جديد لإضافة شروحات الفيديو والملخصات والاختبارات التفاعلية لطلابك.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c: CourseDetail) => {
            const isPublished = c.status === 'PUBLISHED';
            const modulesCount = c.modules?.length || 0;
            const lessonsCount = c.totalLessons || 0;

            return (
              <div
                key={c.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-primary-300 hover:shadow-md transition-all flex flex-col group shadow-sm"
              >
                {/* Course Cover Image Banner */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  {c.coverImageUrl ? (
                    <img
                      src={c.coverImageUrl}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100 text-primary-600 p-4 text-center">
                      <Video className="w-12 h-12 stroke-[1.5] mb-2 opacity-80" />
                      <span className="text-xs font-bold text-slate-800">{c.subject}</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md bg-white/95 border border-slate-200 shadow-sm">
                    {isPublished ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-700">منشور</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-amber-700">مسودة</span>
                      </>
                    )}
                  </div>

                  {/* Price Tag */}
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md bg-white/95 border border-slate-200 text-slate-900 flex items-center gap-1 shadow-sm font-mono">
                    {Number(c.price) > 0 ? (
                      <>
                        <span className="text-emerald-600">{c.price}</span>
                        <span className="text-[10px] text-slate-500">ج.م</span>
                      </>
                    ) : (
                      <span className="text-emerald-600 font-sans">مجاني</span>
                    )}
                  </div>
                </div>

                {/* Course Details Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-primary-600">{c.subject}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-500">{c.gradeLevel}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {c.title}
                    </h3>
                    {c.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {c.description}
                      </p>
                    )}
                  </div>

                  {/* Metrics Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary-600" />
                      <span>{modulesCount} وحدات</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-primary-600" />
                      <span>{lessonsCount} دروس</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      <span>{c._count?.enrollments || 0} طالب</span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 flex items-center gap-2">
                    <Link
                      href={`/teacher/courses/${c.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>تعديل وبناء المنهج والاشتراكات</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setCourseToEdit(c)}
                      className="p-2.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 bg-white border border-slate-200 rounded-xl transition-colors shadow-sm"
                      title="تعديل بيانات وإعدادات الكورس"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setCourseToDelete({ id: c.id, title: c.title })}
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-200 rounded-xl transition-colors shadow-sm"
                      title="حذف الكورس"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}

      {activeTab === 'ENROLLMENTS' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <CourseEnrollmentsView />
        </div>
      )}

      {/* Create Course Modal */}
      {isCreateModalOpen && (
        <CreateCourseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newId) => router.push(`/teacher/courses/${newId}`)}
        />
      )}

      {/* Edit Course Modal */}
      {courseToEdit && (
        <EditCourseModal
          isOpen={Boolean(courseToEdit)}
          course={courseToEdit}
          onClose={() => setCourseToEdit(null)}
        />
      )}

      {/* Custom Confirmation Popup Modal (No JS Confirm) */}
      <ConfirmModal
        isOpen={Boolean(courseToDelete)}
        title="تأكيد حذف الكورس"
        message={`هل أنت متأكد من حذف كورس "${courseToDelete?.title}" نهائياً وجميع الفصول والدروس التابعة له؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف الكورس نهائياً"
        cancelText="إلغاء وتراجع"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (courseToDelete) {
            deleteMutation.mutate(courseToDelete.id);
            setCourseToDelete(null);
          }
        }}
        onClose={() => setCourseToDelete(null)}
      />
    </div>
  );
}

function resolveReceiptUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const cleanBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${cleanBase}${url.startsWith('/') ? '' : '/'}${url}`;
}

function CourseEnrollmentsView() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'PENDING' | 'ACTIVE'>('PENDING');

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<{
    url: string;
    studentName: string;
    courseName: string;
    amount: number;
    phone: string;
    enrollmentId: string;
    isActive?: boolean;
  } | null>(null);

  // Reject Modal State
  const [rejectTarget, setRejectTarget] = useState<{
    enrollmentId: string;
    studentName: string;
    courseName: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Cancel Active Subscription Modal State
  const [cancelModalTarget, setCancelModalTarget] = useState<{
    enrollmentId: string;
    studentName: string;
    courseName: string;
  } | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Real-time polling every 5 seconds
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['teacher-subscriptions'],
    queryFn: coursesApi.getTeacherSubscriptions,
    refetchInterval: 5000,
  });

  const [courseFilter, setCourseFilter] = useState('ALL');
  const [studentSearch, setStudentSearch] = useState('');

  const pendingRequests = data?.pendingRequests ?? [];
  const activeStudents = data?.activeStudents ?? [];

  // Distinct courses for filter dropdown
  const distinctCourses = useMemo(() => {
    const map = new Map<string, string>();
    pendingRequests.forEach((r) => map.set(r.courseId, r.courseName));
    activeStudents.forEach((s) => map.set(s.courseId, s.courseName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [pendingRequests, activeStudents]);

  const filteredPending = useMemo(() => {
    return pendingRequests.filter((r) => {
      const matchesCourse = courseFilter === 'ALL' || r.courseId === courseFilter;
      const matchesSearch =
        !studentSearch ||
        r.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        r.studentCode.toLowerCase().includes(studentSearch.toLowerCase()) ||
        r.studentPhone.includes(studentSearch) ||
        r.senderPhone.includes(studentSearch);
      return matchesCourse && matchesSearch;
    });
  }, [pendingRequests, courseFilter, studentSearch]);

  const filteredActive = useMemo(() => {
    return activeStudents.filter((s) => {
      const matchesCourse = courseFilter === 'ALL' || s.courseId === courseFilter;
      const matchesSearch =
        !studentSearch ||
        s.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentPhone.includes(studentSearch) ||
        (s.senderPhone && s.senderPhone.includes(studentSearch));
      return matchesCourse && matchesSearch;
    });
  }, [activeStudents, courseFilter, studentSearch]);

  const approveMutation = useMutation({
    mutationFn: (enrollmentId: string) => coursesApi.approveEnrollment(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      toast.success('تمت الموافقة وتفعيل اشتراك الطالب بنجاح! 🎉');
      setSelectedReceipt(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر قبول الطلب');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      coursesApi.rejectEnrollment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      toast.success('تم رفض طلب الاشتراك.');
      setRejectTarget(null);
      setRejectionReason('');
      setSelectedReceipt(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر رفض الطلب');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      coursesApi.cancelEnrollment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] });
      toast.success('تم إلغاء اشتراك الطالب وتعليق وصوله للكورس بنجاح.');
      setCancelModalTarget(null);
      setCancellationReason('');
      setSelectedReceipt(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر إلغاء الاشتراك');
    },
  });

  return (
    <div className="space-y-6">
      {/* Sub-tabs and realtime indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFilter('PENDING')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              filter === 'PENDING'
                ? 'bg-amber-500 text-white border border-amber-600'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>طلبات الاشتراك الجديدة</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                filter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {pendingRequests.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('ACTIVE')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
              filter === 'ACTIVE'
                ? 'bg-emerald-600 text-white border border-emerald-700'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>الطلاب المشتركون فعلياً</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                filter === 'ACTIVE' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {activeStudents.length}
            </span>
          </button>
        </div>

        {/* Live sync pulse */}
        <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-600 font-medium"
            title="تحديث البيانات الآن"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-primary-600' : ''}`} />
            <span>تحديث مباشر</span>
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            مباشر (Realtime)
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="بحث باسم الطالب، كود الطالب، أو رقم هاتف المحفظة..."
            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 rounded-xl px-4 py-2.5 pr-10 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          {studentSearch && (
            <button
              type="button"
              onClick={() => setStudentSearch('')}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter by Course Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Filter className="w-4 h-4 text-primary-600" />
            <span>فلترة حسب الكورس:</span>
          </div>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none cursor-pointer min-w-[180px]"
          >
            <option value="ALL">
              جميع الكورسات ({distinctCourses.length})
            </option>
            {distinctCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <p className="text-sm font-medium">جاري تحميل طلبات الاشتراك والبيانات...</p>
          </div>
        ) : filter === 'PENDING' ? (
          filteredPending.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <CheckCircle className="w-10 h-10 text-emerald-500/80 mb-1" />
              <p className="text-sm font-bold text-slate-700">
                {pendingRequests.length === 0
                  ? 'لا توجد طلبات اشتراك معلقة حالياً 🎉'
                  : 'لا توجد طلبات مطابقة لخيارات الفلترة أو البحث'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                {pendingRequests.length === 0
                  ? 'عند قيام أي طالب برفع إيصال التحويل والاشتراك في أي كورس من كورساتك، سيظهر طلبه هنا فوراً في الوقت الفعلي مع صورة الإيصال.'
                  : 'جرب اختيار كورس آخر أو مسح كلمة البحث لمعاينة جميع الطلبات المعلقة.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">اسم الطالب وبياناته</th>
                    <th className="px-6 py-4">الكورس المطلوب</th>
                    <th className="px-6 py-4">بيانات التحويل</th>
                    <th className="px-6 py-4">إيصال السداد</th>
                    <th className="px-6 py-4">تاريخ الطلب</th>
                    <th className="px-6 py-4 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPending.map((req) => (
                    <tr key={req.enrollmentId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{req.studentName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {req.studentCode && (
                            <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                              {req.studentCode}
                            </span>
                          )}
                          {req.studentPhone && (
                            <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {req.studentPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-primary-700 bg-primary-50 inline-flex px-2.5 py-1 rounded-lg border border-primary-100">
                          {req.courseName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-1 font-semibold">
                          سعر الكورس: {req.coursePrice} ج.م
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 inline-flex px-2.5 py-1 rounded-lg border border-emerald-200/60 font-mono">
                          {req.transferAmount} ج.م
                        </div>
                        <div className="text-xs text-slate-600 font-mono mt-1 flex items-center gap-1">
                          <span className="text-[11px] text-slate-400 font-sans">محول من:</span>
                          <span className="font-bold">{req.senderPhone}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {req.receiptImageUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedReceipt({
                                url: resolveReceiptUrl(req.receiptImageUrl),
                                studentName: req.studentName,
                                courseName: req.courseName,
                                amount: req.transferAmount,
                                phone: req.senderPhone,
                                enrollmentId: req.enrollmentId,
                              })
                            }
                            className="group flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                          >
                            <img
                              src={resolveReceiptUrl(req.receiptImageUrl)}
                              alt="إيصال"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs group-hover:scale-105 transition-transform"
                            />
                            <div className="text-right">
                              <span className="block text-xs font-bold text-primary-600 group-hover:underline">
                                معاينة الإيصال
                              </span>
                              <span className="block text-[10px] text-slate-400 font-medium">
                                انقر للتكبير 🔍
                              </span>
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">لم يرفق إيصال</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {req.date}
                      </td>

                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => approveMutation.mutate(req.enrollmentId)}
                            disabled={approveMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                            title="قبول الاشتراك وتفعيل الكورس للطالب"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>قبول</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRejectTarget({
                                enrollmentId: req.enrollmentId,
                                studentName: req.studentName,
                                courseName: req.courseName,
                              })
                            }
                            disabled={rejectMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                            title="رفض الطلب"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>رفض</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredActive.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Users className="w-10 h-10 text-slate-300 mb-1" />
            <p className="text-sm font-bold text-slate-700">
              {activeStudents.length === 0
                ? 'لا يوجد طلاب مفعل اشتراكهم بعد'
                : 'لا يوجد طلاب مطابقون لخيارات الفلترة أو البحث'}
            </p>
            <p className="text-xs text-slate-400">
              عند قبول أي طلب اشتراك سيظهر الطالب هنا في قائمة المشتركين الفعليين.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">اسم وبيانات الطالب</th>
                  <th className="px-6 py-4">الكورس المشترك به</th>
                  <th className="px-6 py-4">بيانات السداد</th>
                  <th className="px-6 py-4">إيصال السداد</th>
                  <th className="px-6 py-4">تاريخ التفعيل والانضمام</th>
                  <th className="px-6 py-4">حالة الوصول</th>
                  <th className="px-6 py-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActive.map((student) => {
                  const receiptUrl = student.receiptImageUrl
                    ? resolveReceiptUrl(student.receiptImageUrl)
                    : null;

                  return (
                    <tr key={student.enrollmentId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm">{student.studentName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {student.studentCode && (
                            <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                              {student.studentCode}
                            </span>
                          )}
                          {student.studentPhone && (
                            <span className="text-xs text-slate-500 font-mono">
                              {student.studentPhone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-700 bg-slate-100 inline-flex px-2.5 py-1 rounded-md border border-slate-200">
                          {student.courseName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-800 font-mono">
                          {student.transferAmount || student.coursePrice} ج.م
                        </div>
                        {student.senderPhone && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{student.senderPhone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {receiptUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedReceipt({
                                url: receiptUrl,
                                studentName: student.studentName,
                                courseName: student.courseName,
                                amount: student.transferAmount || student.coursePrice,
                                phone: student.senderPhone || student.studentPhone,
                                enrollmentId: student.enrollmentId,
                                isActive: true,
                              })
                            }
                            className="group flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-primary-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                            title="انقر لمعاينة إيصال الدفع"
                          >
                            <img
                              src={receiptUrl}
                              alt="إيصال"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 group-hover:scale-105 transition-transform"
                            />
                            <div className="text-right">
                              <span className="block text-xs font-bold text-primary-600 group-hover:underline">
                                معاينة الإيصال
                              </span>
                              <span className="block text-[10px] text-slate-400 font-medium">
                                انقر للتكبير 🔍
                              </span>
                            </div>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-medium inline-block">
                            يدوي / بدون إيصال
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {student.date}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>نشط ومفعل</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <button
                          type="button"
                          onClick={() =>
                            setCancelModalTarget({
                              enrollmentId: student.enrollmentId,
                              studentName: student.studentName,
                              courseName: student.courseName,
                            })
                          }
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                          title="إلغاء اشتراك الطالب وتعليق وصوله للكورس"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>إلغاء الاشتراك</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Image Viewer Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            dir="rtl"
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>إيصال تحويل: {selectedReceipt.studentName}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {selectedReceipt.courseName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Details Meta Chips */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="text-slate-500 font-normal">المبلغ المحول:</span>
                <span className="text-emerald-600 font-mono">{selectedReceipt.amount} ج.م</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="text-slate-500 font-normal">رقم المحفظة المحول منها:</span>
                <span className="font-mono text-primary-600">{selectedReceipt.phone}</span>
              </div>
              <a
                href={selectedReceipt.url}
                target="_blank"
                rel="noreferrer"
                className="mr-auto text-primary-600 hover:underline flex items-center gap-1 font-bold text-xs"
              >
                <span>فتح الصورة بجودة كاملة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Image Preview Container */}
            <div className="p-6 overflow-y-auto flex items-center justify-center bg-slate-950/5 min-h-[300px]">
              <img
                src={selectedReceipt.url}
                alt="صورة إيصال التحويل"
                className="max-h-[55vh] w-auto max-w-full rounded-2xl shadow-lg border border-slate-200 object-contain"
              />
            </div>

            {/* Actions Bar */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
              {selectedReceipt.isActive ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = {
                        enrollmentId: selectedReceipt.enrollmentId,
                        studentName: selectedReceipt.studentName,
                        courseName: selectedReceipt.courseName,
                      };
                      setSelectedReceipt(null);
                      setCancelModalTarget(target);
                    }}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>إلغاء اشتراك هذا الطالب</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(selectedReceipt.enrollmentId)}
                    disabled={approveMutation.isPending}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>تأكيد الإيصال وقبول الاشتراك</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = {
                        enrollmentId: selectedReceipt.enrollmentId,
                        studentName: selectedReceipt.studentName,
                        courseName: selectedReceipt.courseName,
                      };
                      setSelectedReceipt(null);
                      setRejectTarget(target);
                    }}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    رفض الطلب
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            dir="rtl"
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">رفض طلب اشتراك الطالب</h4>
                <p className="text-xs text-slate-500 line-clamp-1">{rejectTarget.studentName} - {rejectTarget.courseName}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سبب الرفض (سيتم إرساله كإشعار للطالب):
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: لم يتم استلام المبلغ على محفظة فودافون كاش، يرجى التأكد من الرقم والتحويل مجدداً."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectTarget.enrollmentId,
                    reason: rejectionReason.trim(),
                  })
                }
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {rejectMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد الرفض</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Active Subscription Modal */}
      {cancelModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            dir="rtl"
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <UserMinus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">إلغاء اشتراك الطالب في الكورس</h4>
                <p className="text-xs text-slate-500 line-clamp-1">{cancelModalTarget.studentName} - {cancelModalTarget.courseName}</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800 leading-relaxed">
              تنبيه: سيؤدي إلغاء الاشتراك إلى إيقاف وصول الطالب لدروس وفيديوهات الكورس فوراً وإرسال إشعار له بسبب الإلغاء.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                سبب إلغاء الاشتراك (اختياري - سيظهر للطالب في الإشعار):
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="مثال: تم استرداد المبلغ، أو انتهاء فترة الاشتراك المتفق عليها."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancelModalTarget(null);
                  setCancellationReason('');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate({
                    id: cancelModalTarget.enrollmentId,
                    reason: cancellationReason.trim(),
                  })
                }
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {cancelMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد إلغاء الاشتراك</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
