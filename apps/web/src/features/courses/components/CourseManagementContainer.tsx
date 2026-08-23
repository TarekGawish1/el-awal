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
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { useTeacherCourses, useDeleteCourse } from '../hooks/useCourses';
import { CourseDetail } from '../types/courses.types';
import { CreateCourseModal } from './CreateCourseModal';
import { useRouter } from 'next/navigation';

export function CourseManagementContainer() {
  const router = useRouter();
  const { data: courses = [], isLoading } = useTeacherCourses();
  const deleteMutation = useDeleteCourse();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
              <Video className="w-5 h-5" />
            </div>
            <span>الكورسات والدورات التدريبية أونلاين</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة المناهج المصورة، الفصول والوحدات، ملخصات الشرح والاختبارات التفاعلية
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-600/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء كورس جديد</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">إجمالي الكورسات</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{totalCourses}</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">الكورسات المنشورة</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{publishedCourses}</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">إجمالي الدروس المصورة</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">{totalLessons}</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">الاشتراكات والطلاب</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">{totalEnrollments}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl flex flex-col sm:flex-row gap-3 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الكورس أو المادة الدراسية..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
        </div>

        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="w-full sm:w-48 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
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
          className="w-full sm:w-40 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">جميع الحالات</option>
          <option value="PUBLISHED">منشور أونلاين</option>
          <option value="DRAFT">مسودة</option>
        </select>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-3 shadow-sm">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد كورسات مطابقة للبحث</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
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
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-700/60 transition-all flex flex-col group shadow-sm hover:shadow-md"
              >
                {/* Course Cover Image Banner */}
                <div className="relative aspect-video bg-slate-100 dark:bg-slate-950 overflow-hidden">
                  {c.coverImageUrl ? (
                    <img
                      src={c.coverImageUrl}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 dark:from-blue-950/40 dark:to-slate-950 text-blue-600 dark:text-blue-400 p-4 text-center">
                      <Video className="w-12 h-12 stroke-[1.5] mb-2 opacity-80" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-300">{c.subject}</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 shadow-sm">
                    {isPublished ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-emerald-700 dark:text-emerald-400">منشور</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-amber-700 dark:text-amber-400">مسودة</span>
                      </>
                    )}
                  </div>

                  {/* Price Tag */}
                  <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white flex items-center gap-1 shadow-sm font-mono">
                    {Number(c.price) > 0 ? (
                      <>
                        <span className="text-emerald-600 dark:text-emerald-400">{c.price}</span>
                        <span className="text-[10px] text-slate-500">ج.م</span>
                      </>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-sans">مجاني</span>
                    )}
                  </div>
                </div>

                {/* Course Details Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">{c.subject}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{c.gradeLevel}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {c.title}
                    </h3>
                    {c.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {c.description}
                      </p>
                    )}
                  </div>

                  {/* Metrics Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{modulesCount} وحدات</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
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
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>تعديل وبناء المنهج والاشتراكات</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذا الكورس وجميع دروسه؟')) {
                          deleteMutation.mutate(c.id);
                        }
                      }}
                      className="p-2.5 text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors"
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

      {/* Create Course Modal */}
      {isCreateModalOpen && (
        <CreateCourseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newId) => router.push(`/teacher/courses/${newId}`)}
        />
      )}
    </div>
  );
}
