'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Plus,
  Video,
  FileText,
  Paperclip,
  Award,
  Users,
  Eye,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Layers,
  Globe,
  Lock,
  GraduationCap,
} from 'lucide-react';
import {
  useCourseDetail,
  useUpdateCourse,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useDeleteLesson,
} from '../hooks/useCourses';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
import { CourseModule, CourseLesson } from '../types/courses.types';
import { LessonEditorModal } from './LessonEditorModal';
import { CourseGroupAccessModal } from './CourseGroupAccessModal';
import { CourseEnrollmentsTab } from './CourseEnrollmentsTab';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';

interface CourseBuilderViewProps {
  courseId: string;
}

export function CourseBuilderView({ courseId }: CourseBuilderViewProps) {
  const { data: course, isLoading } = useCourseDetail(courseId);
  const updateCourseMutation = useUpdateCourse(courseId);
  const createModuleMutation = useCreateModule(courseId);
  const updateModuleMutation = useUpdateModule(courseId);
  const deleteModuleMutation = useDeleteModule(courseId);
  const deleteLessonMutation = useDeleteLesson(courseId);

  const { data: assessmentsData } = useAssessments();
  const assessments = assessmentsData?.data || [];

  // Top Tab State: 'curriculum' | 'enrollments'
  const [activeTopTab, setActiveTopTab] = useState<'curriculum' | 'enrollments'>('curriculum');

  // Modals & Active State
  const [isGroupAccessModalOpen, setIsGroupAccessModalOpen] = useState(false);
  const [lessonModalState, setLessonModalState] = useState<{
    isOpen: boolean;
    moduleId: string;
    lesson: CourseLesson | null;
  }>({
    isOpen: false,
    moduleId: '',
    lesson: null,
  });

  // Custom Delete Modals State (No JS Confirm)
  const [moduleToDelete, setModuleToDelete] = useState<{ id: string; title: string } | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<{ id: string; title: string } | null>(null);

  // Inline New Module State
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDescription, setNewModuleDescription] = useState('');
  const [newModuleQuizId, setNewModuleQuizId] = useState('');

  // Accordion collapsed module state
  const [expandedModuleIds, setExpandedModuleIds] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500 shadow-sm">
        لم يتم العثور على الكورس المطلوب.
      </div>
    );
  }

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModuleIds((prev) => ({
      ...prev,
      [moduleId]: prev[moduleId] !== undefined ? !prev[moduleId] : false,
    }));
  };

  const handleTogglePublish = async () => {
    const nextStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    await updateCourseMutation.mutateAsync({ status: nextStatus });
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) {
      toast.error('يرجى إدخال اسم الوحدة');
      return;
    }

    await createModuleMutation.mutateAsync({
      title: newModuleTitle.trim(),
      description: newModuleDescription.trim() || undefined,
      unitQuizId: newModuleQuizId || undefined,
    });

    setNewModuleTitle('');
    setNewModuleDescription('');
    setNewModuleQuizId('');
    setIsCreatingModule(false);
  };

  const handleUpdateUnitQuiz = async (moduleId: string, unitQuizId: string) => {
    await updateModuleMutation.mutateAsync({
      moduleId,
      data: { unitQuizId: unitQuizId || null },
    });
  };

  const handleUpdateCourseQuiz = async (courseQuizId: string) => {
    await updateCourseMutation.mutateAsync({
      courseQuizId: courseQuizId || null,
    });
  };

  const modules = course.modules || [];
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-right animate-in fade-in">
      {/* Top Breadcrumb & Controls Card (Light Header Banner) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-3xl shadow-sm bg-gradient-to-l from-blue-50/50 via-white to-white dark:from-slate-800/40 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/courses"
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 border border-slate-200 dark:border-slate-700"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40">
                {course.subject}
              </span>
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {course.gradeLevel}
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${
                  course.status === 'PUBLISHED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {course.status === 'PUBLISHED' ? 'منشور أونلاين' : 'مسودة قيد التجهيز'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">{course.title}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsGroupAccessModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>صلاحيات المجموعات ({course.groupAccess?.length || 0})</span>
          </button>

          <Link
            href={`/student/courses/${course.id}/learn`}
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>معاينة قاعة المشاهدة</span>
          </Link>

          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={updateCourseMutation.isPending}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              course.status === 'PUBLISHED'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
            }`}
          >
            {course.status === 'PUBLISHED' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            <span>{course.status === 'PUBLISHED' ? 'تحويل لمسودة' : 'نشر الكورس الآن'}</span>
          </button>
        </div>
      </div>

      {/* Top View Selector Tabs (Curriculum vs Enrollments) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-1.5 flex items-center gap-1.5 shadow-sm text-xs">
        <button
          type="button"
          onClick={() => setActiveTopTab('curriculum')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold transition-all ${
            activeTopTab === 'curriculum'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>منهج وفصول الكورس ({modules.length} فصول • {totalLessons} دروس)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTopTab('enrollments')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold transition-all ${
            activeTopTab === 'enrollments'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>الطلاب والمشتركون في الكورس</span>
        </button>
      </div>

      {/* TAB 1: CURRICULUM & LESSONS */}
      {activeTopTab === 'curriculum' && (
        <div className="space-y-6">
          {/* Assessment Banner: Course Final Exam */}
          <div className="bg-white dark:bg-slate-900 bg-gradient-to-l from-blue-50/70 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 border border-blue-200/80 dark:border-blue-800/40 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/40 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    الامتحان الشامل للكورس
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {course.courseQuiz ? course.courseQuiz.title : 'لم يتم تعيين امتحان نهائي للكورس بعد'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {course.courseQuiz
                    ? `إجمالي الدرجات: ${course.courseQuiz.totalScore} درجة • تقييم ختامي للمنهج`
                    : 'يمكنك ربط امتحان شامل يقيمه الطالب بعد إنهاء جميع فصول ودروس الكورس.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={course.courseQuizId || ''}
                onChange={(e) => handleUpdateCourseQuiz(e.target.value)}
                className="w-full sm:w-64 bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                <option value="">-- بدون امتحان شامل --</option>
                {assessments.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.type === 'EXAM' ? 'امتحان' : 'واجب'} - {a.totalScore} درجة)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modules Control Bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>فصول ووحدات المنهج ({modules.length})</span>
            </h2>

            {!isCreatingModule && (
              <button
                type="button"
                onClick={() => setIsCreatingModule(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة وحدة جديدة</span>
              </button>
            )}
          </div>

          {/* Inline Create Module Form */}
          {isCreatingModule && (
            <form
              onSubmit={handleCreateModule}
              className="p-5 bg-white dark:bg-slate-900 border border-blue-200/90 dark:border-blue-800/60 rounded-3xl space-y-4 shadow-sm animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>إنشاء وحدة تعليمية جديدة</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingModule(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  إلغاء
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    اسم الوحدة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder="مثال: الوحدة الأولى - النحو وقواعد الإعراب"
                    className="w-full bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    ربط امتحان شامل للوحدة (اختياري)
                  </label>
                  <select
                    value={newModuleQuizId}
                    onChange={(e) => setNewModuleQuizId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    <option value="">-- بدون امتحان شامل للوحدة --</option>
                    {assessments.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.type === 'EXAM' ? 'امتحان' : 'واجب'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  وصف وملاحظات الوحدة (اختياري)
                </label>
                <input
                  type="text"
                  value={newModuleDescription}
                  onChange={(e) => setNewModuleDescription(e.target.value)}
                  placeholder="وصف مختصر لمحتويات الوحدة..."
                  className="w-full bg-slate-50 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingModule(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createModuleMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30 disabled:opacity-50"
                >
                  {createModuleMutation.isPending ? 'جاري الحفظ...' : 'حفظ الوحدة'}
                </button>
              </div>
            </form>
          )}

          {/* Modules List Accordion */}
          <div className="space-y-4">
            {modules.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl space-y-3 shadow-sm">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد فصول أو وحدات مضافة بعد</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  ابدأ بإنشاء الوحدة الأولى لإضافة دروس الفيديو وملخصات الشرح والامتحانات.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreatingModule(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة الوحدة الأولى الآن</span>
                </button>
              </div>
            ) : (
              modules.map((mod: CourseModule, modIndex: number) => {
                const isCollapsed = expandedModuleIds[mod.id] === false;
                const lessonsCount = mod.lessons?.length || 0;

                return (
                  <div
                    key={mod.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all"
                  >
                    {/* Module Accordion Header */}
                    <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => toggleModuleExpanded(mod.id)}
                      >
                        <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100 dark:border-blue-800/40">
                          {modIndex + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{mod.title}</h3>
                            <span className="text-[11px] text-slate-500 font-normal">
                              ({lessonsCount} دروس)
                            </span>
                          </div>
                          {mod.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{mod.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Unit Controls (Unit Quiz + Add Lesson + Delete) */}
                      <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                        {/* Unit Exam Selector Dropdown */}
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-xs">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <select
                            value={mod.unitQuizId || ''}
                            onChange={(e) => handleUpdateUnitQuiz(mod.id, e.target.value)}
                            className="bg-transparent text-[11px] text-slate-700 dark:text-slate-300 font-bold focus:outline-none max-w-[140px]"
                            title="ربط امتحان للوحدة"
                          >
                            <option value="">-- بدون امتحان للوحدة --</option>
                            {assessments.map((a: any) => (
                              <option key={a.id} value={a.id}>
                                {a.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setLessonModalState({
                              isOpen: true,
                              moduleId: mod.id,
                              lesson: null,
                            })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة درس</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModuleToDelete({ id: mod.id, title: mod.title })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="حذف الوحدة بالكامل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Lessons List in Module */}
                    {!isCollapsed && (
                      <div className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
                        {(!mod.lessons || mod.lessons.length === 0) ? (
                          <p className="text-xs text-slate-400 text-center py-5">
                            لا توجد دروس في هذه الوحدة بعد. انقر على "+ إضافة درس" للبدء.
                          </p>
                        ) : (
                          mod.lessons.map((les: CourseLesson, lesIndex: number) => {
                            const hasVideo = Boolean(les.bunnyVideoId || les.contentUrl);
                            const hasSummary = Boolean(les.summary);
                            const hasAttachments = Boolean(les.attachments && les.attachments.length > 0);
                            const hasQuiz = Boolean(les.lessonQuiz);

                            return (
                              <div
                                key={les.id}
                                className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                                    {modIndex + 1}.{lesIndex + 1}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                        {les.title}
                                      </h4>
                                      {les.isPreview && (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                          معاينة مجانية
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                                      {les.videoDurationSeconds ? (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {Math.floor(les.videoDurationSeconds / 60)} دقيقة
                                        </span>
                                      ) : null}
                                      {hasVideo && (
                                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                          <Video className="w-3 h-3" /> فيديو الشرح
                                        </span>
                                      )}
                                      {hasSummary && (
                                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                          <FileText className="w-3 h-3" /> ملخص الدرس
                                        </span>
                                      )}
                                      {hasAttachments && (
                                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                          <Paperclip className="w-3 h-3" /> {les.attachments?.length} مرفقات
                                        </span>
                                      )}
                                      {hasQuiz && (
                                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">
                                          <Award className="w-3 h-3" /> اختبار الدرس
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLessonModalState({
                                        isOpen: true,
                                        moduleId: mod.id,
                                        lesson: les,
                                      })
                                    }
                                    className="p-2 text-slate-600 hover:text-blue-600 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                                    title="تعديل محتوى الدرس"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLessonToDelete({ id: les.id, title: les.title })}
                                    className="p-2 text-slate-400 hover:text-rose-600 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                                    title="حذف الدرس"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ENROLLMENTS & STUDENTS SUITE */}
      {activeTopTab === 'enrollments' && (
        <CourseEnrollmentsTab
          courseId={courseId}
          courseTitle={course.title}
        />
      )}

      {/* Lesson Editor Modal (Video, Summary, Attachments, Quiz) */}
      {lessonModalState.isOpen && (
        <LessonEditorModal
          isOpen={lessonModalState.isOpen}
          courseId={courseId}
          moduleId={lessonModalState.moduleId}
          lesson={lessonModalState.lesson}
          onClose={() =>
            setLessonModalState({
              isOpen: false,
              moduleId: '',
              lesson: null,
            })
          }
        />
      )}

      {/* Group Access Permissions Modal */}
      {isGroupAccessModalOpen && (
        <CourseGroupAccessModal
          isOpen={isGroupAccessModalOpen}
          courseId={courseId}
          courseTitle={course.title}
          currentGroupAccess={course.groupAccess || []}
          onClose={() => setIsGroupAccessModalOpen(false)}
        />
      )}

      {/* Custom Confirmation Dialog for Module Deletion (No JS Confirm) */}
      <ConfirmModal
        isOpen={Boolean(moduleToDelete)}
        title="تأكيد حذف الوحدة التعليمية"
        message={`هل أنت متأكد من حذف الوحدة "${moduleToDelete?.title}" وجميع دروسها ومرفقاتها نهائياً؟`}
        confirmLabel="حذف الوحدة بالكامل"
        cancelLabel="تراجع"
        variant="danger"
        isLoading={deleteModuleMutation.isPending}
        onConfirm={() => {
          if (moduleToDelete) {
            deleteModuleMutation.mutate(moduleToDelete.id);
            setModuleToDelete(null);
          }
        }}
        onClose={() => setModuleToDelete(null)}
      />

      {/* Custom Confirmation Dialog for Lesson Deletion (No JS Confirm) */}
      <ConfirmModal
        isOpen={Boolean(lessonToDelete)}
        title="تأكيد حذف الدرس التعليمي"
        message={`هل أنت متأكد من حذف درس "${lessonToDelete?.title}"؟ سيتم حذف جميع الفيديوهات والملخصات والأسئلة المرتبطة به.`}
        confirmLabel="حذف الدرس"
        cancelLabel="تراجع"
        variant="danger"
        isLoading={deleteLessonMutation.isPending}
        onConfirm={() => {
          if (lessonToDelete) {
            deleteLessonMutation.mutate(lessonToDelete.id);
            setLessonToDelete(null);
          }
        }}
        onClose={() => setLessonToDelete(null)}
      />
    </div>
  );
}
