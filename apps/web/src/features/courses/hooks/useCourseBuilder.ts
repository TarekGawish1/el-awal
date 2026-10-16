"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  useCourseDetail,
  useUpdateCourse,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useDeleteLesson,
  useReorderModules,
  useReorderLessons,
} from "../hooks/useCourses";
import { useAssessments } from "@/features/assessments/hooks/use-assessments";
import { deleteAssessment, updateAssessment } from "@/features/assessments/api/assessments.api";
import { CourseModule, CourseLesson } from "../types/courses.types";
import {
  AssessmentToDeleteState,
  LessonModalState,
  DragItemState,
  LessonDropTargetState,
} from "../types/course-builder.types";

export interface UseCourseBuilderProps {
  courseId?: string;
}

export function useCourseBuilder({ courseId: propCourseId }: UseCourseBuilderProps) {
  const routeParams = useParams();
  const courseId = (propCourseId || routeParams?.id) as string;
  const queryClient = useQueryClient();
  const { data: course, isLoading, isError, error, refetch: refetchCourse } = useCourseDetail(courseId);
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
    : assessmentsData?.data || [];

  const examAssessments = assessments.filter((a: any) => a?.type === "EXAM");

  // Top Tab State: 'curriculum' | 'enrollments'
  const [activeTopTab, setActiveTopTab] = useState<"curriculum" | "enrollments">("curriculum");

  // Modals & Active State
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [isGroupAccessModalOpen, setIsGroupAccessModalOpen] = useState(false);
  const [isPreviewVideoModalOpen, setIsPreviewVideoModalOpen] = useState(false);
  const [lessonModalState, setLessonModalState] = useState<LessonModalState>({
    isOpen: false,
    moduleId: "",
    lesson: null,
    initialTab: "video",
  });

  const searchParams = useSearchParams();
  const urlLessonId = searchParams.get("lessonId");
  const urlNewAssessmentId = searchParams.get("newAssessmentId");
  const urlNewAssessmentType = searchParams.get("newAssessmentType");
  const urlNewAssessmentTitle = searchParams.get("newAssessmentTitle");

  // Refetch course and stream-auth when arriving with a lesson in the URL
  useEffect(() => {
    if (urlLessonId && courseId) {
      refetchCourse();
      queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
      queryClient.invalidateQueries({ queryKey: ["lesson-stream-auth", urlLessonId] });
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
          initialTab: "quiz",
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

  // Delete Modals State
  const [moduleToDelete, setModuleToDelete] = useState<{ id: string; title: string } | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<{ id: string; title: string } | null>(null);
  const [assessmentToDelete, setAssessmentToDelete] = useState<AssessmentToDeleteState | null>(null);
  const [isDeletingAssessment, setIsDeletingAssessment] = useState(false);

  // Inline New Module State
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [newModuleQuizId, setNewModuleQuizId] = useState("");

  // Accordion collapsed module state
  const [expandedModuleIds, setExpandedModuleIds] = useState<Record<string, boolean>>({});

  // Drag & Drop reordering state
  const [dragItem, setDragItem] = useState<DragItemState | null>(null);
  const [moduleDropTargetId, setModuleDropTargetId] = useState<string | null>(null);
  const [lessonDropTarget, setLessonDropTarget] = useState<LessonDropTargetState | null>(null);

  const modules = course?.modules || [];
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModuleIds((prev) => ({
      ...prev,
      [moduleId]: prev[moduleId] !== undefined ? !prev[moduleId] : false,
    }));
  };

  const handleTogglePublish = async () => {
    if (!course) return;
    const nextStatus = course.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await updateCourseMutation.mutateAsync({ status: nextStatus });
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) {
      toast.error("يرجى إدخال اسم الوحدة");
      return;
    }

    await createModuleMutation.mutateAsync({
      title: newModuleTitle.trim(),
      description: newModuleDescription.trim() || undefined,
      unitQuizId: newModuleQuizId || undefined,
    });

    setNewModuleTitle("");
    setNewModuleDescription("");
    setNewModuleQuizId("");
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

  const handleUnlinkAssessment = async () => {
    if (!assessmentToDelete) return;
    const { id, scope, targetId } = assessmentToDelete;
    try {
      setIsDeletingAssessment(true);
      if (scope === "course") {
        await updateCourseMutation.mutateAsync({ courseQuizId: null });
        toast.success("تم إلغاء ربط امتحان الكورس بنجاح");
      } else if (scope === "unit" && targetId) {
        await updateModuleMutation.mutateAsync({ moduleId: targetId, data: { unitQuizId: null } });
        toast.success("تم إلغاء ربط امتحان الوحدة بنجاح");
      } else if (scope === "lesson" && targetId) {
        await updateAssessment(id, { lessonId: null });
        toast.success("تم إلغاء ربط التقييم من الدرس بنجاح");
      }
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["assessments"] });
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء إلغاء الربط");
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
      if (scope === "course") {
        await updateCourseMutation.mutateAsync({ courseQuizId: null });
      } else if (scope === "unit" && targetId) {
        await updateModuleMutation.mutateAsync({ moduleId: targetId, data: { unitQuizId: null } });
      }
      await deleteAssessment(id);
      toast.success("تم حذف التقييم بالكامل بنجاح");
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      await queryClient.invalidateQueries({ queryKey: ["assessments"] });
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء حذف التقييم");
    } finally {
      setIsDeletingAssessment(false);
      setAssessmentToDelete(null);
    }
  };

  // Drag & Drop Handlers
  const clearDragState = () => {
    setDragItem(null);
    setModuleDropTargetId(null);
    setLessonDropTarget(null);
  };

  const handleModuleDragStart = (e: React.DragEvent, moduleId: string) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    setDragItem({ type: "module", id: moduleId });
  };

  const handleModuleDrop = (targetModuleId: string) => {
    if (!dragItem || dragItem.type !== "module" || dragItem.id === targetModuleId) {
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
    e.dataTransfer.effectAllowed = "move";
    setDragItem({ type: "lesson", id: lessonId, moduleId });
    setExpandedModuleIds((prev) => ({ ...prev, [moduleId]: true }));
  };

  const getLessonDropIndex = (e: React.DragEvent, lesIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isAfter = e.clientY - rect.top > rect.height / 2;
    return isAfter ? lesIndex + 1 : lesIndex;
  };

  const handleLessonDrop = (targetModuleId: string, targetIndex: number) => {
    if (!dragItem || dragItem.type !== "lesson") {
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
      if (draggedIdx < targetIndex) insertIndex = targetIndex - 1;
      sourceLessons.splice(insertIndex, 0, dragged);
      sourceLessons.forEach((l: CourseLesson, i: number) =>
        orders.push({ lessonId: l.id, orderIndex: i + 1 })
      );
    } else {
      const targetLessons = [...(targetModule.lessons || [])];
      const clamped = Math.max(0, Math.min(insertIndex, targetLessons.length));
      targetLessons.splice(clamped, 0, dragged);
      sourceLessons.forEach((l: CourseLesson, i: number) =>
        orders.push({ lessonId: l.id, orderIndex: i + 1 })
      );
      targetLessons.forEach((l: CourseLesson, i: number) =>
        orders.push({ lessonId: l.id, orderIndex: i + 1, moduleId: targetModule.id })
      );
      setExpandedModuleIds((prev) => ({ ...prev, [targetModule.id]: true }));
    }

    if (orders.length > 0) {
      reorderLessonsMutation.mutate(orders);
    }
    clearDragState();
  };

  return {
    courseId,
    course,
    isLoading,
    isError,
    error,
    refetchCourse,
    modules,
    totalLessons,
    examAssessments,

    // Navigation & Tabs
    activeTopTab,
    setActiveTopTab,

    // Modals
    isEditCourseModalOpen,
    setIsEditCourseModalOpen,
    isGroupAccessModalOpen,
    setIsGroupAccessModalOpen,
    isPreviewVideoModalOpen,
    setIsPreviewVideoModalOpen,
    lessonModalState,
    setLessonModalState,
    moduleToDelete,
    setModuleToDelete,
    lessonToDelete,
    setLessonToDelete,
    assessmentToDelete,
    setAssessmentToDelete,
    isDeletingAssessment,

    // Create Module
    isCreatingModule,
    setIsCreatingModule,
    newModuleTitle,
    setNewModuleTitle,
    newModuleDescription,
    setNewModuleDescription,
    newModuleQuizId,
    setNewModuleQuizId,

    // Accordion & DND
    expandedModuleIds,
    setExpandedModuleIds,
    toggleModuleExpanded,
    dragItem,
    moduleDropTargetId,
    setModuleDropTargetId,
    lessonDropTarget,
    setLessonDropTarget,
    clearDragState,
    handleModuleDragStart,
    handleModuleDrop,
    handleLessonDragStart,
    handleLessonDrop,
    getLessonDropIndex,

    // Actions & Mutations
    updateCourseMutation,
    createModuleMutation,
    updateModuleMutation,
    deleteModuleMutation,
    deleteLessonMutation,
    handleTogglePublish,
    handleCreateModule,
    handleUpdateUnitQuiz,
    handleUpdateCourseQuiz,
    handleUnlinkAssessment,
    handlePermanentlyDeleteAssessment,
  };
}
