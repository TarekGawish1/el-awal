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
  Sparkles,
  DollarSign,
  Globe,
  Lock,
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
import toast from 'react-hot-toast';

interface CourseBuilderViewProps {
  courseId: string;
}

export function CourseBuilderView({ courseId }: CourseBuilderViewProps) {
  const { data: course, isLoading, refetch } = useCourseDetail(courseId);
  const updateCourseMutation = useUpdateCourse(courseId);
  const createModuleMutation = useCreateModule(courseId);
  const updateModuleMutation = useUpdateModule(courseId);
  const deleteModuleMutation = useDeleteModule(courseId);
  const deleteLessonMutation = useDeleteLesson(courseId);

  const { data: assessmentsData } = useAssessments();
  const assessments = assessmentsData?.data || [];

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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400">
        لم يتم العثور على الكورس المطلوب.
      </div>
    );
  }

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModuleIds((prev) => ({
      ...prev,
      [moduleId]: prev[moduleId] !== undefined ? !prev[moduleId] : false, // Default is open
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
    <div className="max-w-6xl mx-auto space-y-6 text-right">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/courses"
            className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {course.subject}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
                {course.gradeLevel}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  course.status === 'PUBLISHED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {course.status === 'PUBLISHED' ? 'منشور أونلاين' : 'مسودة قيد التجهيز'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">{course.title}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsGroupAccessModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>صلاحيات المجموعات ({course.groupAccess?.length || 0})</span>
          </button>

          <Link
            href={`/student/courses/${course.id}/learn`}
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>معاينة غرفة الطالب</span>
          </Link>

          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={updateCourseMutation.isPending}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ${
              course.status === 'PUBLISHED'
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {course.status === 'PUBLISHED' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            <span>{course.status === 'PUBLISHED' ? 'تحويل لمسودة' : 'نشر الكورس الآن'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Level Assessment Banner: Course Final Quiz */}
      <div className="bg-gradient-to-l from-indigo-950/40 to-slate-900 border border-indigo-800/40 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>الاختبار الشامل النهائي للكورس (Course Final Exam)</span>
              {course.courseQuiz && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full font-mono border border-emerald-500/20">
                  تم الربط: {course.courseQuiz.title} ({course.courseQuiz.totalScore} درجة)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              يظهر هذا الامتحان في نهاية المنهج لقياس استيعاب الطالب لجميع فصول ووحدات الدورة التدريبية.
            </p>
          </div>
        </div>

        <div className="sm:w-64">
          <select
            value={course.courseQuizId || ''}
            onChange={(e) => handleUpdateCourseQuiz(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- بدون اختبار شامل --</option>
            {assessments.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.totalScore} درجة)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Curriculum Units & Lessons Tree */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>هيكل المنهج والوحدات التدريبية ({modules.length} وحدات • {totalLessons} درس)</span>
            </h2>
            <p className="text-xs text-slate-400">تنظيم الفصول، الدروس، ملخصات الشرح والاختبارات التفاعلية</p>
          </div>

          {!isCreatingModule && (
            <button
              type="button"
              onClick={() => setIsCreatingModule(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة وحدة / فصل جديد</span>
            </button>
          )}
        </div>

        {/* New Module Form */}
        {isCreatingModule && (
          <form onSubmit={handleCreateModule} className="p-5 bg-slate-900 border border-indigo-500/40 rounded-3xl space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-indigo-300">إضافة وحدة تعليمية جديدة</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">اسم الوحدة / الفصل *</label>
                <input
                  type="text"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="مثال: الوحدة الأولى: الحركة الدائرية والجاذبية"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">ربط اختبار شامل للوحدة (Unit Quiz)</label>
                <select
                  value={newModuleQuizId}
                  onChange={(e) => setNewModuleQuizId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- بدون اختبار للوحدة --</option>
                  {assessments.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.totalScore} درجة)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">نبذة عن الوحدة</label>
              <input
                type="text"
                value={newModuleDescription}
                onChange={(e) => setNewModuleDescription(e.target.value)}
                placeholder="أهم المفاهيم والتطبيقات المتضمنة في هذا الفصل..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingModule(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={createModuleMutation.isPending}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                {createModuleMutation.isPending ? 'جاري الحفظ...' : 'حفظ الوحدة'}
              </button>
            </div>
          </form>
        )}

        {/* Modules Accordion List */}
        {modules.length === 0 && !isCreatingModule ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">لم تقم بإضافة وحدات تدريبية بعد</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              ابدأ بإضافة الوحدة الأولى ثم أضف إليها دروس الفيديو وملخصات الشرح والاختبارات التفاعلية.
            </p>
            <button
              type="button"
              onClick={() => setIsCreatingModule(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة الوحدة الأولى الآن</span>
            </button>
          </div>
        ) : (
          modules.map((mod: CourseModule, modIndex: number) => {
            const isCollapsed = expandedModuleIds[mod.id] === false;
            const lessonCount = mod.lessons?.length || 0;

            return (
              <div
                key={mod.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg transition-all"
              >
                {/* Module Header Bar */}
                <div className="p-5 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleModuleExpanded(mod.id)}
                      className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-400">الوحدة {modIndex + 1}:</span>
                        <h3 className="text-sm font-bold text-white">{mod.title}</h3>
                        <span className="text-[11px] text-slate-400">({lessonCount} دروس)</span>
                      </div>
                      {mod.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Unit Quiz & Actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <select
                        value={mod.unitQuizId || ''}
                        onChange={(e) => handleUpdateUnitQuiz(mod.id, e.target.value)}
                        className="bg-transparent text-[11px] text-slate-200 focus:outline-none"
                      >
                        <option value="">-- ربط اختبار الوحدة --</option>
                        {assessments.map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.title} ({a.totalScore} د)
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
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة درس</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteModuleMutation.mutate(mod.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="حذف الوحدة بالكامل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Lessons List in Module */}
                {!isCollapsed && (
                  <div className="p-4 space-y-2.5 bg-slate-950/40">
                    {(!mod.lessons || mod.lessons.length === 0) ? (
                      <p className="text-xs text-slate-500 text-center py-5">
                        لا توجد دروس في هذه الوحدة بعد. انقر على "+ إضافة درس" للبدء.
                      </p>
                    ) : (
                      mod.lessons.map((les: CourseLesson, lesIndex: number) => {
                        const hasSummary = !!les.summary;
                        const hasAttachments = les.attachments && les.attachments.length > 0;
                        const hasQuiz = !!les.lessonQuizId;

                        return (
                          <div
                            key={les.id}
                            className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                                {lesIndex + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-bold text-white">{les.title}</h4>
                                  {les.isPreview && (
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full font-bold border border-emerald-500/20">
                                      معاينة مجانية
                                    </span>
                                  )}
                                  {les.videoDurationSeconds ? (
                                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                      <Clock className="w-3 h-3 text-slate-500" />
                                      {Math.floor(les.videoDurationSeconds / 60)} د
                                    </span>
                                  ) : null}
                                </div>

                                {/* Feature Badges */}
                                <div className="flex items-center gap-2 mt-1">
                                  {hasSummary && (
                                    <span className="flex items-center gap-1 text-[10px] text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-800/30">
                                      <FileText className="w-2.5 h-2.5" />
                                      <span>ملخص الشرح</span>
                                    </span>
                                  )}
                                  {hasAttachments && (
                                    <span className="flex items-center gap-1 text-[10px] text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-800/30">
                                      <Paperclip className="w-2.5 h-2.5" />
                                      <span>{les.attachments?.length} ملفات PDF</span>
                                    </span>
                                  )}
                                  {hasQuiz && (
                                    <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/30">
                                      <Award className="w-2.5 h-2.5" />
                                      <span>اختبار الدرس</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Lesson Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setLessonModalState({
                                    isOpen: true,
                                    moduleId: mod.id,
                                    lesson: les,
                                  })
                                }
                                className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
                                title="تعديل محتوى الدرس"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteLessonMutation.mutate(les.id)}
                                className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
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

      {/* Lesson Editor Modal */}
      {lessonModalState.isOpen && (
        <LessonEditorModal
          isOpen={lessonModalState.isOpen}
          courseId={courseId}
          moduleId={lessonModalState.moduleId}
          lesson={lessonModalState.lesson}
          onClose={() => setLessonModalState({ isOpen: false, moduleId: '', lesson: null })}
        />
      )}

      {/* Group Access Modal */}
      {isGroupAccessModalOpen && (
        <CourseGroupAccessModal
          isOpen={isGroupAccessModalOpen}
          courseId={courseId}
          courseTitle={course.title}
          alreadyLinkedGroupIds={course.groupAccess?.map((g) => g.groupId) || []}
          onClose={() => setIsGroupAccessModalOpen(false)}
        />
      )}
    </div>
  );
}
