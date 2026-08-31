'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Video,
  Plus,
  BookOpen,
  Users,
  Search,
  Layers,
  Award,
  DollarSign,
  Globe,
  Lock,
  Trash2,
  Edit,
  Eye,
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck
} from 'lucide-react';
import { useTeacherCourses, useDeleteCourse } from '../hooks/useCourses';
import { CourseDetail } from '../types/courses.types';
import { CreateCourseModal } from './CreateCourseModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useRouter } from 'next/navigation';

export function CourseManagementContainer() {
  const router = useRouter();
  const { data: courses = [], isLoading } = useTeacherCourses();
  const deleteMutation = useDeleteCourse();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
          الاشتراكات والطلبات الأونلاين
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
                      onClick={() => setCourseToDelete({ id: c.id, title: c.title })}
                      className="p-2.5 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl transition-colors shadow-sm"
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

function CourseEnrollmentsView() {
  const [filter, setFilter] = useState<'PENDING' | 'ACTIVE'>('PENDING');

  // MOCK DATA: In a real scenario, this would be fetched from API
  const requests = [
    { id: '1', studentName: 'أحمد محمود', courseName: 'الصف الثالث الثانوي - الجبر والهندسة الفراغية', date: '2026-08-31', status: 'PENDING' },
    { id: '2', studentName: 'سارة خالد', courseName: 'الصف الأول الثانوي - تفاضل', date: '2026-08-30', status: 'PENDING' },
    { id: '3', studentName: 'يوسف طارق', courseName: 'الصف الثاني الثانوي - الميكانيكا', date: '2026-08-29', status: 'PENDING' },
  ];
  
  const activeStudents = [
    { id: '4', studentName: 'محمد علي', courseName: 'الصف الثالث الثانوي - الجبر والهندسة الفراغية', date: '2026-08-15', progress: 45 },
    { id: '5', studentName: 'نور ياسر', courseName: 'الصف الأول الثانوي - تفاضل', date: '2026-08-10', progress: 80 },
    { id: '6', studentName: 'مريم أحمد', courseName: 'الصف الأول الثانوي - تفاضل', date: '2026-08-05', progress: 100 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button
          onClick={() => setFilter('PENDING')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
            filter === 'PENDING' ? 'bg-amber-500 text-white border border-amber-600' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          طلبات الاشتراك الجديدة ({requests.length})
        </button>
        <button
          onClick={() => setFilter('ACTIVE')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
            filter === 'ACTIVE' ? 'bg-emerald-600 text-white border border-emerald-700' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          الطلاب المشتركين فعلياً ({activeStudents.length})
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filter === 'PENDING' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">اسم الطالب</th>
                  <th className="px-6 py-4">الكورس المطلوب</th>
                  <th className="px-6 py-4">تاريخ الطلب</th>
                  <th className="px-6 py-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{req.studentName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-primary-600 bg-primary-50 inline-flex px-2 py-1 rounded-md border border-primary-100">
                        {req.courseName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {req.date}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200" title="قبول الاشتراك">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200" title="رفض الطلب">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filter === 'ACTIVE' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">اسم الطالب</th>
                  <th className="px-6 py-4">الكورس المشترك به</th>
                  <th className="px-6 py-4">تاريخ الانضمام</th>
                  <th className="px-6 py-4">نسبة الإنجاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{student.studentName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-700 bg-slate-100 inline-flex px-2 py-1 rounded-md border border-slate-200">
                        {student.courseName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {student.date}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${student.progress === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`} 
                            style={{ width: `${student.progress}%` }} 
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-8">{student.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
