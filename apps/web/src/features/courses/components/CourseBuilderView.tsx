'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  GripVertical,
  ExternalLink,
  Settings2,
  Calendar,
  Sparkles,
  Gift,
  CreditCard,
  X,
} from 'lucide-react';
import {
  useCourseDetail,
  useUpdateCourse,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useDeleteLesson,
  useReorderModules,
  useReorderLessons,
} from '../hooks/useCourses';
import { useAssessments } from '@/features/assessments/hooks/use-assessments';
import { deleteAssessment, updateAssessment } from '@/features/assessments/api/assessments.api';
import { CourseModule, CourseLesson } from '../types/courses.types';
import { LessonEditorModal } from './LessonEditorModal';
import { EditCourseModal } from './EditCourseModal';
import { CourseGroupAccessModal } from './CourseGroupAccessModal';
import { CourseEnrollmentsTab } from './CourseEnrollmentsTab';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';

interface CourseBuilderViewProps {
  courseId: string;
}

export function CourseBuilderView({ courseId }: CourseBuilderViewProps) {
  const queryClient = useQueryClient();
  const { data: course, isLoading, refetch: refetchCourse } = useCourseDetail(courseId);
  const updateCourseMutation = useUpdateCourse(courseId);
  const createModuleMutation = useCreateModule(courseId);
  const updateModuleMutation = useUpdateModule(courseId);
  const deleteModuleMutation = useDeleteModule(courseId);
  const deleteLessonMutation = useDeleteLesson(courseId);
  const reorderModulesMutation = useReorderModules(courseId);
  const reorderLessonsMutation = useReorderLessons(courseId);

  const { data: assessmentsData } = useAssessments();
  const assessments = Array.isArray(assessmentsData)
    ? assessmentsData
    : (assessmentsData?.data || []);

  // Course/unit selectors link exams only, never homeworks (legacy ASSIGNMENT type).
  const examAssessments = assessments.filter((a: any) => a?.type === 'EXAM');

  // Top Tab State: 'curriculum' | 'enrollments'
  const [activeTopTab, setActiveTopTab] = useState<'curriculum' | 'enrollments'>('curriculum');

  // Modals & Active State
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [isGroupAccessModalOpen, setIsGroupAccessModalOpen] = useState(false);
  const [lessonModalState, setLessonModalState] = useState<{
    isOpen: boolean;
    moduleId: string;
    lesson: CourseLesson | null;
    initialTab?: "video" | "summary" | "attachments" | "quiz";
    newAssessmentId?: string;
    newAssessmentType?: string;
    newAssessmentTitle?: string;
  }>({
    isOpen: false,
    moduleId: '',
    lesson: null,
    initialTab: 'video',
  });

  const searchParams = useSearchParams();
  const urlLessonId = searchParams.get('lessonId');
  const urlModuleId = searchParams.get('moduleId');
  const urlNewAssessmentId = searchParams.get('newAssessmentId');
  const urlNewAssessmentType = searchParams.get('newAssessmentType');
  const urlNewAssessmentTitle = searchParams.get('newAssessmentTitle');

  // Refetch course and stream-auth when arriving with a lesson in the URL
  useEffect(() => {
    if (urlLessonId && courseId) {
      refetchCourse();
      queryClient.invalidateQueries({ queryKey: ['courses', courseId] });
      queryClient.invalidateQueries({ queryKey: ['lesson-stream-auth', urlLessonId] });
    }
  }, [urlLessonId, courseId]);

  // Auto-open Lesson Modal when redirected back from assessment creation
  useEffect(() => {
    if (!urlLessonId || !course?.modules) return;
    for (const mod of course.modules) {
      const foundLesson = mod.lessons?.find((l) => l.id === urlLessonId);
      if (foundLesson) {
        setLessonModalState({
          isOpen: true,
          moduleId: mod.id,
          lesson: foundLesson,
          initialTab: 'quiz',
          newAssessmentId: urlNewAssessmentId || undefined,
          newAssessmentType: urlNewAssessmentType || undefined,
          newAssessmentTitle: urlNewAssessmentTitle || undefined,
        });
        break;
      }
    }
  }, [urlLessonId, urlNewAssessmentId, urlNewAssessmentType, urlNewAssessmentTitle, course?.modules]);

  // Keep open lesson in sync with the latest course data
  useEffect(() => {
    if (!lessonModalState.isOpen || !lessonModalState.lesson?.id || !course?.modules) return;
    const freshLesson = course.modules
      .flatMap((m) => m.lessons || [])
      .find((l) => l.id === lessonModalState.lesson?.id);
    if (freshLesson && freshLesson !== lessonModalState.lesson) {
      setLessonModalState((prev) => ({
        ...prev,
        lesson: freshLesson,
      }));
    }
  }, [course?.modules, lessonModalState.isOpen, lessonModalState.lesson?.id]);

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

  // Drag & Drop reordering state
  const [dragItem, setDragItem] = useState<{
    type: 'module' | 'lesson';
    id: string;
    moduleId?: string;
  } | null>(null);
  const [moduleDropTargetId, setModuleDropTargetId] = useState<string | null>(null);
  const [lessonDropTarget, setLessonDropTarget] = useState<{ moduleId: string; index: number } | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 shadow-sm">
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

  const [assessmentToDelete, setAssessmentToDelete] = useState<{
    id: string;
    title: string;
    type: 'EXAM' | 'HOMEWORK';
    scope: 'course' | 'unit' | 'lesson';
    targetId?: string;
  } | null>(null);
  const [isDeletingAssessment, setIsDeletingAssessment] = useState(false);

  const handleUnlinkAssessment = async () => {
    if (!assessmentToDelete) return;
    const { id, scope, targetId } = assessmentToDelete;
    try {
      setIsDeletingAssessment(true);
      if (scope === 'course') {
        await updateCourseMutation.mutateAsync({ courseQuizId: null });
        toast.success('تم إلغاء ربط امتحان الكورس بنجاح');
      } else if (scope === 'unit' && targetId) {
        await updateModuleMutation.mutateAsync({ moduleId: targetId, data: { unitQuizId: null } });
        toast.success('تم إلغاء ربط امتحان الوحدة بنجاح');
      } else if (scope === 'lesson' && targetId) {
        await updateAssessment(id, { lessonId: null });
        toast.success('تم إلغاء ربط التقييم من الدرس بنجاح');
      }
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['assessments'] });
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء إلغاء الربط');
    } finally {
      setIsDeletingAssessment(false);
      setAssessmentToDelete(null);
    }
  };

  const handlePermanentlyDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    const { id, scope, targetId } = assessmentToDelete;
    try {
      setIsDeletingAssessment(true);
      if (scope === 'course') {
        await updateCourseMutation.mutateAsync({ courseQuizId: null });
      } else if (scope === 'unit' && targetId) {
        await updateModuleMutation.mutateAsync({ moduleId: targetId, data: { unitQuizId: null } });
      }
      await deleteAssessment(id);
      toast.success('تم حذف التقييم بالكامل بنجاح');
      await queryClient.invalidateQueries({ queryKey: ['courses'] });
      await queryClient.invalidateQueries({ queryKey: ['assessments'] });
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء حذف التقييم');
    } finally {
      setIsDeletingAssessment(false);
      setAssessmentToDelete(null);
    }
  };

  const modules = course.modules || [];
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  // ---------- Drag & Drop Reordering Handlers ----------
  const clearDragState = () => {
    setDragItem(null);
    setModuleDropTargetId(null);
    setLessonDropTarget(null);
  };

  const handleModuleDragStart = (e: React.DragEvent, moduleId: string) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    setDragItem({ type: 'module', id: moduleId });
  };

  const handleModuleDrop = (targetModuleId: string) => {
    if (!dragItem || dragItem.type !== 'module' || dragItem.id === targetModuleId) {
      clearDragState();
      return;
    }
    const ids = modules.map((m: CourseModule) => m.id);
    const fromIdx = ids.indexOf(dragItem.id);
    const toIdx = ids.indexOf(targetModuleId);
    if (fromIdx === -1 || toIdx === -1) {
      clearDragState();
      return;
    }
    ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0]);
    reorderModulesMutation.mutate(ids.map((id: string, i: number) => ({ moduleId: id, orderIndex: i + 1 })));
    clearDragState();
  };

  const handleLessonDragStart = (e: React.DragEvent, lessonId: string, moduleId: string) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    setDragItem({ type: 'lesson', id: lessonId, moduleId });
    // Make sure the source unit is expanded while dragging
    setExpandedModuleIds((prev) => ({ ...prev, [moduleId]: true }));
  };

  // Decide whether a drop lands before or after the hovered lesson based on the
  // pointer's vertical position. Aiming at the lower half of the last lesson yields
  // an index past the final item, which appends the dragged lesson to the end of the unit.
  const getLessonDropIndex = (e: React.DragEvent, lesIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isAfter = e.clientY - rect.top > rect.height / 2;
    return isAfter ? lesIndex + 1 : lesIndex;
  };

  const handleLessonDrop = (targetModuleId: string, targetIndex: number) => {
    if (!dragItem || dragItem.type !== 'lesson') {
      clearDragState();
      return;
    }

    const sourceModule = modules.find((m: CourseModule) => m.id === dragItem.moduleId);
    const targetModule = modules.find((m: CourseModule) => m.id === targetModuleId);
    if (!sourceModule || !targetModule) {
      clearDragState();
      return;
    }

    const sourceLessons = [...(sourceModule.lessons || [])];
    const draggedIdx = sourceLessons.findIndex((l: CourseLesson) => l.id === dragItem.id);
    if (draggedIdx === -1) {
      clearDragState();
      return;
    }
    const [dragged] = sourceLessons.splice(draggedIdx, 1);

    let insertIndex = targetIndex;
    const orders: Array<{ lessonId: string; orderIndex: number; moduleId?: string }> = [];

    if (sourceModule.id === targetModule.id) {
      // Same-unit reorder
      if (draggedIdx < targetIndex) insertIndex = targetIndex - 1;
      sourceLessons.splice(insertIndex, 0, dragged);
      sourceLessons.forEach((l: CourseLesson, i: number) =>
        orders.push({ lessonId: l.id, orderIndex: i + 1 }),
      );
    } else {
      // Cross-unit move
      const targetLessons = [...(targetModule.lessons || [])];
      const clamped = Math.max(0, Math.min(insertIndex, targetLessons.length));
      targetLessons.splice(clamped, 0, dragged);
      sourceLessons.forEach((l: CourseLesson, i: number) =>
        orders.push({ lessonId: l.id, orderIndex: i + 1 }),
      );
      targetLessons.forEach((l: CourseLesson, i: number) =>
        orders.push({ lessonId: l.id, orderIndex: i + 1, moduleId: targetModule.id }),
      );
      // Keep the target unit open so the moved lesson is visible
      setExpandedModuleIds((prev) => ({ ...prev, [targetModule.id]: true }));
    }

    if (orders.length > 0) {
      reorderLessonsMutation.mutate(orders);
    }
    clearDragState();
  };


  return (
    <div className="max-w-6xl mx-auto space-y-6 text-right animate-in fade-in">
      {/* Redesigned Hero Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 via-indigo-600 to-emerald-500" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Right Section: Navigation & Course Metadata */}
          <div className="flex items-start gap-4">
            <Link
              href="/teacher/courses"
              className="w-11 h-11 rounded-2xl bg-slate-50 hover:bg-primary-50 hover:text-primary-600 text-slate-600 flex items-center justify-center transition-all shrink-0 border border-slate-200/80 shadow-2xs group cursor-pointer"
              title="العودة إلى قائمة الكورسات"
            >
              <ArrowRight className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </Link>

            <div className="space-y-2">
              {/* Badges Pill Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-primary-50 text-primary-700 border border-primary-100/80">
                  <BookOpen className="w-3.5 h-3.5 text-primary-600" />
                  <span>{course.subject}</span>
                </span>

                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                  {course.gradeLevel}
                </span>

                {course.academicStage && (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {course.academicStage}
                  </span>
                )}

                {/* Status Badge with Live Indicator */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                    course.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      course.status === 'PUBLISHED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span>{course.status === 'PUBLISHED' ? 'منشور أونلاين' : 'مسودة قيد التجهيز'}</span>
                </span>

                {/* Price Badge */}
                {Number(course.price) === 0 ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>كورس مجاني 🎁</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white font-mono shadow-2xs">
                    <CreditCard className="w-3.5 h-3.5 text-slate-300" />
                    <span>{course.price} ج.م</span>
                  </span>
                )}

                {course.hasCertificate && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>شهادة إتمام</span>
                  </span>
                )}
              </div>

              {/* Title & Quick Edit */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {course.title}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditCourseModalOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-primary-200"
                  title="تعديل اسم وبيانات الكورس"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              {course.description && (
                <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">
                  {course.description}
                </p>
              )}
            </div>
          </div>

          {/* Left Section: Action Buttons Toolbar */}
          <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-center justify-start lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditCourseModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
            >
              <Settings2 className="w-4 h-4 text-slate-600" />
              <span>تعديل الكورس</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGroupAccessModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>المجموعات ({course.groupAccess?.length || 0})</span>
            </button>

            <Link
              href={`/teacher/courses/${course.id}/preview`}
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-200/60 cursor-pointer shadow-2xs"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>معاينة كطالب</span>
            </Link>

            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={updateCourseMutation.isPending}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                course.status === 'PUBLISHED'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {course.status === 'PUBLISHED' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              <span>{course.status === 'PUBLISHED' ? 'تحويل لمسودة' : 'نشر الكورس أونلاين'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top View Selector Tabs (Curriculum vs Enrollments) */}
      <div className="bg-slate-100/80 p-1 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-1 border border-slate-200/80 text-xs">
        <button
          type="button"
          onClick={() => setActiveTopTab('curriculum')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold transition-all text-center cursor-pointer ${
            activeTopTab === 'curriculum'
              ? 'bg-white text-primary-700 shadow-xs border border-slate-200/60 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0 text-primary-600" />
          <span>منهج وفصول الكورس ({modules.length} فصول • {totalLessons} دروس)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTopTab('enrollments')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold transition-all text-center cursor-pointer ${
            activeTopTab === 'enrollments'
              ? 'bg-white text-primary-700 shadow-xs border border-slate-200/60 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <GraduationCap className="w-4 h-4 shrink-0 text-primary-600" />
          <span>الطلاب والمشتركون في الكورس</span>
        </button>
      </div>

      {/* TAB 1: CURRICULUM & LESSONS */}
      {activeTopTab === 'curriculum' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Assessment Banner: Course Final Exam */}
          <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                <Award className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    الامتحان الشامل للكورس
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 break-words">
                  {course.courseQuiz ? course.courseQuiz.title : 'لم يتم تعيين امتحان نهائي للكورس بعد'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {course.courseQuiz
                    ? `إجمالي الدرجات: ${course.courseQuiz.totalScore} درجة • تقييم ختامي للمنهج`
                    : 'يمكنك ربط امتحان شامل يقيمه الطالب بعد إنهاء جميع فصول ودروس الكورس.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
              <select
                value={course.courseQuizId || ''}
                onChange={(e) => handleUpdateCourseQuiz(e.target.value)}
                className="flex-1 sm:w-64 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm cursor-pointer"
              >
                <option value="">-- بدون امتحان شامل --</option>
                {examAssessments.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.type === 'EXAM' ? 'امتحان' : 'واجب'} - {a.totalScore} درجة)
                  </option>
                ))}
              </select>
              {course.courseQuizId ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/teacher/assessments/${course.courseQuizId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 whitespace-nowrap"
                    title="تعديل تفاصيل وأسئلة الامتحان الشامل"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>تعديل الأسئلة</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      setAssessmentToDelete({
                        id: course.courseQuizId!,
                        title: course.courseQuiz?.title || 'الامتحان الشامل للكورس',
                        type: 'EXAM',
                        scope: 'course',
                      })
                    }
                    className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
                    title="إلغاء ربط أو حذف امتحان الكورس"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href={`/teacher/assessments/new?type=EXAM&courseId=${courseId}&courseName=${encodeURIComponent(course.title)}&scope=COURSE`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 whitespace-nowrap"
                  title="إنشاء امتحان شامل جديد لهذا الكورس وربطه تلقائياً"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء امتحان</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </Link>
              )}
            </div>
          </div>

          {/* Course Settings: Sequential Lessons Enforcement */}
          <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shrink-0">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-900">ترتيب مشاهدة الدروس</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    {course.enforceSequentialLessons
                      ? 'المنهج مرتب — يجب إتمام كل درس بالترتيب'
                      : 'حرية المشاهدة — يمكن للطالب المشاهدة بأي ترتيب'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateCourseMutation.mutate({
                    enforceSequentialLessons: !course.enforceSequentialLessons,
                  })
                }
                disabled={updateCourseMutation.isPending}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                  course.enforceSequentialLessons
                    ? 'bg-primary-600 border-primary-600'
                    : 'bg-slate-200 border-slate-200'
                }`}
                role="switch"
                aria-checked={course.enforceSequentialLessons ?? false}
                title={course.enforceSequentialLessons ? 'إلغاء التسلسل الإلزامي' : 'تفعيل التسلسل الإلزامي'}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out mt-0.5 ${
                    course.enforceSequentialLessons ? '-translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {course.enforceSequentialLessons && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700">شرط فتح الدرس التالي عند وجود اختبار/واجب:</span>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      updateCourseMutation.mutate({
                        requireExamPassingToUnlock: false,
                      })
                    }
                    disabled={updateCourseMutation.isPending}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      !course.requireExamPassingToUnlock
                        ? 'bg-white text-primary-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    مجرد حل وتسليم الاختبار
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateCourseMutation.mutate({
                        requireExamPassingToUnlock: true,
                      })
                    }
                    disabled={updateCourseMutation.isPending}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      course.requireExamPassingToUnlock
                        ? 'bg-white text-primary-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    النجاح واجتياز درجة النجاح 🎯
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-cyan-100 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-3 sm:gap-4 shadow-sm">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-100 shrink-0">
                <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-slate-900">شهادة إتمام الكورس</p>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {course.hasCertificate !== false
                    ? 'سيحصل الطالب على شهادة عند إكمال جميع الدروس'
                    : 'لن يتم إصدار شهادة لهذا الكورس'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateCourseMutation.mutate({ hasCertificate: course.hasCertificate === false })}
              disabled={updateCourseMutation.isPending}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${course.hasCertificate !== false ? 'bg-cyan-600 border-cyan-600' : 'bg-slate-200 border-slate-200'}`}
              role="switch"
              aria-checked={course.hasCertificate !== false}
              title={course.hasCertificate !== false ? 'إلغاء إصدار الشهادة' : 'تفعيل إصدار الشهادة'}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out mt-0.5 ${course.hasCertificate !== false ? '-translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Modules Control Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
              <span>فصول ووحدات المنهج ({modules.length})</span>
            </h2>

            {!isCreatingModule && (
              <button
                type="button"
                onClick={() => setIsCreatingModule(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
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
              className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary-600" />
                  <span>إنشاء وحدة تعليمية جديدة</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingModule(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    اسم الوحدة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder="مثال: الوحدة الأولى - النحو وقواعد الإعراب"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ربط امتحان شامل للوحدة (اختياري)
                  </label>
                  <select
                    value={newModuleQuizId}
                    onChange={(e) => setNewModuleQuizId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm cursor-pointer"
                  >
                    <option value="">-- بدون امتحان شامل للوحدة --</option>
                    {examAssessments.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.type === 'EXAM' ? 'امتحان' : 'واجب'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  وصف وملاحظات الوحدة (اختياري)
                </label>
                <input
                  type="text"
                  value={newModuleDescription}
                  onChange={(e) => setNewModuleDescription(e.target.value)}
                  placeholder="وصف مختصر لمحتويات الوحدة..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingModule(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createModuleMutation.isPending}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {createModuleMutation.isPending ? 'جاري الحفظ...' : 'حفظ الوحدة'}
                </button>
              </div>
            </form>
          )}

          {/* Modules List Accordion */}
          <div className="space-y-4 pb-8">
            {modules.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">لا توجد فصول أو وحدات مضافة بعد</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  ابدأ بإنشاء الوحدة الأولى لإضافة دروس الفيديو وملخصات الشرح والامتحانات.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreatingModule(true)}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
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
                    className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${
                      moduleDropTargetId === mod.id && dragItem?.type === 'module' && dragItem.id !== mod.id
                        ? 'border-primary-400 ring-2 ring-primary-200'
                        : 'border-slate-200'
                    }`}
                    onDragOver={(e) => {
                      if (dragItem?.type === 'module') {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setModuleDropTargetId(mod.id);
                        // Auto-expand target unit so its lessons can receive drops
                        setExpandedModuleIds((prev) => ({ ...prev, [mod.id]: true }));
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      setModuleDropTargetId((prev) => (prev === mod.id ? null : prev));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragItem?.type === 'module') {
                        handleModuleDrop(mod.id);
                      }
                    }}
                  >
                    {/* Module Accordion Header */}
                    <div
                      className="p-3.5 sm:p-5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      draggable
                      onDragStart={(e) => handleModuleDragStart(e, mod.id)}
                      onDragEnd={clearDragState}
                    >
                      <div
                        className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 min-w-0"
                        onClick={() => toggleModuleExpanded(mod.id)}
                      >
                        <span title="اسحب لإعادة ترتيب الوحدات" className="shrink-0 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4 text-slate-300 hover:text-primary-500" />
                        </span>
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0 border border-primary-100">
                          {modIndex + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 break-words">{mod.title}</h3>
                            <span className="text-[10px] sm:text-[11px] text-slate-500 font-normal shrink-0">
                              ({lessonsCount} دروس)
                            </span>
                          </div>
                          {mod.description && (
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 break-words line-clamp-1 sm:line-clamp-none">{mod.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Unit Controls (Unit Quiz + Add Lesson + Delete) */}
                      <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                        {/* Unit Exam Selector Dropdown + Create Button */}
                        <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-xs shadow-sm flex-1 sm:flex-none min-w-0">
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <select
                              value={mod.unitQuizId || ''}
                              onChange={(e) => handleUpdateUnitQuiz(mod.id, e.target.value)}
                              className="bg-transparent text-[11px] text-slate-700 font-bold focus:outline-none w-full sm:max-w-[140px] cursor-pointer"
                              title="ربط امتحان للوحدة"
                            >
                              <option value="">-- بدون امتحان للوحدة --</option>
                              {examAssessments.map((a: any) => (
                                <option key={a.id} value={a.id}>
                                  {a.title}
                                </option>
                              ))}
                            </select>
                          </div>
                          {mod.unitQuizId ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <Link
                                href={`/teacher/assessments/${mod.unitQuizId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer"
                                title="تعديل تفاصيل وأسئلة امتحان الوحدة"
                              >
                                <Edit className="w-3 h-3" />
                                <span className="hidden sm:inline">تعديل الأسئلة</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </Link>
                              <button
                                type="button"
                                onClick={() =>
                                  setAssessmentToDelete({
                                    id: mod.unitQuizId!,
                                    title: mod.unitQuiz?.title || 'امتحان الوحدة',
                                    type: 'EXAM',
                                    scope: 'unit',
                                    targetId: mod.id,
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors shrink-0 cursor-pointer"
                                title="إلغاء ربط أو حذف امتحان الوحدة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Link
                              href={`/teacher/assessments/new?type=EXAM&courseId=${courseId}&moduleId=${mod.id}&moduleName=${encodeURIComponent(mod.title)}&scope=UNIT`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white border border-amber-200 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer"
                              title={`إنشاء اختبار لوحدة "${mod.title}" وربطه تلقائياً`}
                            >
                              <Plus className="w-3 h-3" />
                              <span className="hidden sm:inline">إنشاء اختبار</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </Link>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setLessonModalState({
                                isOpen: true,
                                moduleId: mod.id,
                                lesson: null,
                              })
                            }
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة درس</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setModuleToDelete({ id: mod.id, title: mod.title })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                            title="حذف الوحدة بالكامل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lessons List in Module */}
                    {!isCollapsed && (
                      <div
                        className={`p-3 sm:p-4 space-y-2.5 transition-colors ${
                          lessonDropTarget?.moduleId === mod.id && dragItem?.type === 'lesson' && dragItem.moduleId !== mod.id
                            ? 'bg-primary-50/40 ring-2 ring-inset ring-primary-200'
                            : 'bg-white'
                        }`}
                        onDragOver={(e) => {
                          if (dragItem?.type !== 'lesson') return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setLessonDropTarget({ moduleId: mod.id, index: mod.lessons?.length || 0 });
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleLessonDrop(mod.id, mod.lessons?.length || 0);
                        }}
                      >
                        {(!mod.lessons || mod.lessons.length === 0) ? (
                          <p
                            className={`text-xs text-center py-5 rounded-xl border-2 border-dashed ${
                              dragItem?.type === 'lesson'
                                ? 'text-primary-500 border-primary-300 bg-primary-50/50'
                                : 'text-slate-400 border-transparent'
                            }`}
                          >
                            {dragItem?.type === 'lesson'
                              ? 'أفلت الدرس هنا لنقله إلى هذه الوحدة'
                              : 'لا توجد دروس في هذه الوحدة بعد. انقر على "+ إضافة درس" للبدء.'}
                          </p>
                        ) : (
                          mod.lessons.map((les: CourseLesson, lesIndex: number) => {
                            const hasVideo = Boolean(les.bunnyVideoId || les.contentUrl);
                            const hasSummary = Boolean(les.summary);
                            const hasAttachments = Boolean(les.attachments && les.attachments.length > 0);
                            const hasQuiz = Boolean(
                              (les.lessonQuiz && (les.lessonQuiz.type === 'EXAM' || les.lessonQuiz.type === 'QUIZ')) ||
                              les.assessments?.some((a) => a.type === 'EXAM' || a.type === 'QUIZ')
                            );
                            const linkedQuiz =
                              (les.lessonQuiz && (les.lessonQuiz.type === 'EXAM' || les.lessonQuiz.type === 'QUIZ'))
                                ? les.lessonQuiz
                                : les.assessments?.find((a) => a.type === 'EXAM' || a.type === 'QUIZ');
                            const linkedQuizId = linkedQuiz?.id || (hasQuiz ? les.lessonQuizId : undefined);

                            const hasHomework = Boolean(
                              les.assessments?.some(
                                (a) =>
                                  a.type === 'ASSIGNMENT' ||
                                  a.type === 'HOMEWORK' ||
                                  (a as any).assessmentType === 'HOMEWORK',
                              ) ||
                              (les.lessonQuiz && (les.lessonQuiz.type === 'ASSIGNMENT' || les.lessonQuiz.type === 'HOMEWORK'))
                            );
                            const linkedHomework =
                              les.assessments?.find(
                                (a) =>
                                  a.type === 'ASSIGNMENT' ||
                                  a.type === 'HOMEWORK' ||
                                  (a as any).assessmentType === 'HOMEWORK',
                              ) ||
                              (les.lessonQuiz && (les.lessonQuiz.type === 'ASSIGNMENT' || les.lessonQuiz.type === 'HOMEWORK')
                                ? les.lessonQuiz
                                : null);
                            const linkedHomeworkId = linkedHomework?.id;

                            const isDraggedLesson = dragItem?.type === 'lesson' && dragItem.id === les.id;
                            const isDropIndicator =
                              !isDraggedLesson &&
                              dragItem?.type === 'lesson' &&
                              lessonDropTarget?.moduleId === mod.id &&
                              lessonDropTarget?.index === lesIndex;
                            // "Drop at the end" indicator: rendered under the last lesson
                            // when the target slot is past the final item.
                            const isEndDropIndicator =
                              !isDraggedLesson &&
                              dragItem?.type === 'lesson' &&
                              lesIndex === lessonsCount - 1 &&
                              lessonDropTarget?.moduleId === mod.id &&
                              lessonDropTarget?.index === lessonsCount;

                            return (
                              <div
                                key={les.id}
                                draggable
                                onDragStart={(e) => handleLessonDragStart(e, les.id, mod.id)}
                                onDragEnd={clearDragState}
                                onDragOver={(e) => {
                                  if (dragItem?.type !== 'lesson' || dragItem.id === les.id) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = 'move';
                                  setLessonDropTarget({ moduleId: mod.id, index: getLessonDropIndex(e, lesIndex) });
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleLessonDrop(mod.id, getLessonDropIndex(e, lesIndex));
                                }}
                                className={`p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition-colors cursor-grab active:cursor-grabbing ${
                                  isDraggedLesson
                                    ? 'opacity-40 border-primary-300 bg-slate-50'
                                    : isEndDropIndicator
                                    ? 'border-b-2 border-b-primary-500 bg-primary-50/30'
                                    : isDropIndicator
                                    ? 'border-t-2 border-t-primary-500 bg-primary-50/30'
                                    : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/60'
                                }`}
                              >
                                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                                  <span title="اسحب لإعادة الترتيب أو النقل بين الوحدات" className="shrink-0 cursor-grab active:cursor-grabbing mt-1 sm:mt-0">
                                    <GripVertical className="w-3.5 h-3.5 text-slate-300 hover:text-primary-500" />
                                  </span>
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white text-slate-600 flex items-center justify-center font-mono font-bold text-xs border border-slate-200 shadow-xs shrink-0 mt-0.5 sm:mt-0">
                                    {modIndex + 1}.{lesIndex + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 break-words">
                                        {les.title}
                                      </h4>
                                      {les.isPreview && (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                          معاينة مجانية
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-[10px] sm:text-[11px] text-slate-500 mt-1.5">
                                      {les.videoDurationSeconds ? (
                                        <span className="flex items-center gap-1 shrink-0">
                                          <Clock className="w-3 h-3 text-slate-400" />
                                          {Math.floor(les.videoDurationSeconds / 60)} دقيقة
                                        </span>
                                      ) : null}
                                      {hasVideo && (
                                        <span className="flex items-center gap-1 text-primary-600 font-medium shrink-0">
                                          <Video className="w-3 h-3" /> فيديو الشرح
                                        </span>
                                      )}
                                      {hasSummary && (
                                        <span className="flex items-center gap-1 text-emerald-600 font-medium shrink-0">
                                          <FileText className="w-3 h-3" /> ملخص الدرس
                                        </span>
                                      )}
                                      {hasAttachments && (
                                        <span className="flex items-center gap-1 text-amber-600 font-medium shrink-0">
                                          <Paperclip className="w-3 h-3" /> {les.attachments?.length} مرفقات
                                        </span>
                                      )}
                                      {hasQuiz && (
                                        <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-200 text-[10px] sm:text-[11px] font-bold shrink-0">
                                          <Award className="w-3 h-3 text-purple-600 shrink-0" />
                                          <span>اختبار الدرس</span>
                                          {linkedQuizId && (
                                            <div className="flex items-center gap-0.5 mr-1">
                                              <Link
                                                href={`/teacher/assessments/${linkedQuizId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-0.5 hover:text-purple-900 rounded transition-colors"
                                                title="تعديل تفاصيل وأسئلة الاختبار"
                                              >
                                                <Edit className="w-2.5 h-2.5" />
                                              </Link>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setAssessmentToDelete({
                                                    id: linkedQuizId,
                                                    title: linkedQuiz?.title || 'اختبار الدرس',
                                                    type: 'EXAM',
                                                    scope: 'lesson',
                                                    targetId: les.id,
                                                  })
                                                }
                                                className="p-0.5 hover:text-rose-600 rounded transition-colors"
                                                title="إلغاء ربط أو حذف الاختبار"
                                              >
                                                <Trash2 className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {hasHomework && (
                                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-200 text-[10px] sm:text-[11px] font-bold shrink-0">
                                          <FileText className="w-3 h-3 text-blue-600 shrink-0" />
                                          <span>واجب الدرس</span>
                                          {linkedHomeworkId && (
                                            <div className="flex items-center gap-0.5 mr-1">
                                              <Link
                                                href={`/teacher/assessments/${linkedHomeworkId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-0.5 hover:text-blue-900 rounded transition-colors"
                                                title="تعديل تفاصيل وأسئلة الواجب"
                                              >
                                                <Edit className="w-2.5 h-2.5" />
                                              </Link>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setAssessmentToDelete({
                                                    id: linkedHomeworkId,
                                                    title: linkedHomework?.title || 'واجب الدرس',
                                                    type: 'HOMEWORK',
                                                    scope: 'lesson',
                                                    targetId: les.id,
                                                  })
                                                }
                                                className="p-0.5 hover:text-rose-600 rounded transition-colors"
                                                title="إلغاء ربط أو حذف الواجب"
                                              >
                                                <Trash2 className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLessonModalState({
                                        isOpen: true,
                                        moduleId: mod.id,
                                        lesson: les,
                                        initialTab: 'quiz',
                                      })
                                    }
                                    className="p-1.5 sm:p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 bg-white rounded-xl border border-purple-200 transition-colors shadow-xs cursor-pointer"
                                    title="إدارة اختبار وواجب الدرس"
                                  >
                                    <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLessonModalState({
                                        isOpen: true,
                                        moduleId: mod.id,
                                        lesson: les,
                                      })
                                    }
                                    className="p-1.5 sm:p-2 text-slate-600 hover:text-primary-600 bg-white rounded-xl border border-slate-200 transition-colors shadow-xs cursor-pointer"
                                    title="تعديل محتوى الدرس"
                                  >
                                    <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLessonToDelete({ id: les.id, title: les.title })}
                                    className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 bg-white rounded-xl border border-slate-200 transition-colors shadow-xs cursor-pointer"
                                    title="حذف الدرس"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
          initialTab={lessonModalState.initialTab}
          newAssessmentId={lessonModalState.newAssessmentId}
          newAssessmentType={lessonModalState.newAssessmentType}
          newAssessmentTitle={lessonModalState.newAssessmentTitle}
          lesson={
            lessonModalState.lesson?.id
              ? course?.modules?.flatMap((m) => m.lessons)?.find((l) => l.id === lessonModalState.lesson?.id) ||
                lessonModalState.lesson
              : null
          }
          onClose={() =>
            setLessonModalState({
              isOpen: false,
              moduleId: '',
              lesson: null,
              initialTab: 'video',
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
        confirmText="حذف الوحدة بالكامل"
        cancelText="تراجع"
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
        confirmText="حذف الدرس"
        cancelText="تراجع"
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

      {/* Delete / Unlink Assessment Dialog */}
      {assessmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-right"
            dir="rtl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    إدارة {assessmentToDelete.type === 'EXAM' ? 'الامتحان' : 'الواجب'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {assessmentToDelete.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssessmentToDelete(null)}
                disabled={isDeletingAssessment}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              يمكنك اختيار <strong>إلغاء الربط فقط</strong> لإزالة هذا التقييم من هذا الموضع مع بقائه في بنك الاختبارات للاستخدام في أي وقت، أو اختيار <strong>حذف التقييم نهائياً</strong> لحذفه بالكامل مع كافة أسئلته وتسليمات الطلاب المرتبطة به.
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssessmentToDelete(null)}
                disabled={isDeletingAssessment}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors text-center cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleUnlinkAssessment}
                disabled={isDeletingAssessment}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors text-center cursor-pointer"
              >
                {isDeletingAssessment ? 'جاري المعالجة...' : 'إلغاء الربط فقط'}
              </button>
              <button
                type="button"
                onClick={handlePermanentlyDeleteAssessment}
                disabled={isDeletingAssessment}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm text-center cursor-pointer"
              >
                {isDeletingAssessment ? 'جاري الحذف...' : 'حذف التقييم نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Details & Settings Modal */}
      {isEditCourseModalOpen && course && (
        <EditCourseModal
          isOpen={isEditCourseModalOpen}
          course={course}
          onClose={() => setIsEditCourseModalOpen(false)}
        />
      )}
    </div>
  );
}
