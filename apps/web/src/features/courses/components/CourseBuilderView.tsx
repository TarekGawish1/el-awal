"use client";

import React from "react";
import { Layers, GraduationCap } from "lucide-react";
import { useCourseBuilder, UseCourseBuilderProps } from "../hooks/useCourseBuilder";
import {
  CourseBuilderHeader,
  CoursePromoCard,
  CourseSettingsBar,
  CurriculumChapterList,
  CourseBuilderModals,
} from "./builder";
import { CourseEnrollmentsTab } from "./CourseEnrollmentsTab";

export function CourseBuilderView(props: UseCourseBuilderProps) {
  const b = useCourseBuilder(props);

  if (b.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (b.isError) {
    return (
      <div className="p-8 text-center bg-white border border-rose-200 rounded-2xl text-rose-600 shadow-sm space-y-3 max-w-lg mx-auto my-12">
        <p className="font-bold text-base">تعذر تحميل بيانات الكورس</p>
        <p className="text-xs text-slate-500">
          {(b.error as any)?.message || "حدث خطأ أثناء جلب تفاصيل الكورس من الخادم."}
        </p>
        <button
          type="button"
          onClick={() => b.refetchCourse()}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!b.course) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 shadow-sm">
        لم يتم العثور على الكورس المطلوب.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-right animate-in fade-in">
      {/* Hero Header Card */}
      <CourseBuilderHeader
        course={b.course}
        onEditCourse={() => b.setIsEditCourseModalOpen(true)}
        onOpenPromoPreview={() => b.setIsPreviewVideoModalOpen(true)}
        onOpenGroupAccess={() => b.setIsGroupAccessModalOpen(true)}
        onTogglePublish={b.handleTogglePublish}
        isPublishPending={b.updateCourseMutation.isPending}
      />

      {/* Course Promo / Preview Video Section */}
      <CoursePromoCard
        previewVideoUrl={b.course.previewVideoUrl}
        onEditCourse={() => b.setIsEditCourseModalOpen(true)}
        onOpenPromoPreview={() => b.setIsPreviewVideoModalOpen(true)}
      />

      {/* Top View Selector Tabs (Curriculum vs Enrollments) */}
      <div className="bg-slate-100/80 p-1 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-1 border border-slate-200/80 text-xs">
        <button
          type="button"
          onClick={() => b.setActiveTopTab("curriculum")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold transition-all text-center cursor-pointer ${
            b.activeTopTab === "curriculum"
              ? "bg-white text-primary-700 shadow-xs border border-slate-200/60 font-black"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Layers className="w-4 h-4 shrink-0 text-primary-600" />
          <span>منهج وفصول الكورس ({b.modules.length} فصول • {b.totalLessons} دروس)</span>
        </button>

        <button
          type="button"
          onClick={() => b.setActiveTopTab("enrollments")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold transition-all text-center cursor-pointer ${
            b.activeTopTab === "enrollments"
              ? "bg-white text-primary-700 shadow-xs border border-slate-200/60 font-black"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <GraduationCap className="w-4 h-4 shrink-0 text-primary-600" />
          <span>الطلاب والمشتركون في الكورس</span>
        </button>
      </div>

      {/* TAB 1: CURRICULUM & LESSONS */}
      {b.activeTopTab === "curriculum" && (
        <div className="space-y-4 sm:space-y-6">
          <CourseSettingsBar
            course={b.course}
            courseId={b.courseId}
            examAssessments={b.examAssessments}
            onUpdateCourseQuiz={b.handleUpdateCourseQuiz}
            onUpdateSequentialLessons={(enabled) =>
              b.updateCourseMutation.mutate({ enforceSequentialLessons: enabled })
            }
            onUpdateCertificate={(enabled) =>
              b.updateCourseMutation.mutate({ hasCertificate: enabled })
            }
            onRequestDeleteAssessment={b.setAssessmentToDelete}
            isUpdatingCourse={b.updateCourseMutation.isPending}
          />

          <CurriculumChapterList
            courseId={b.courseId}
            modules={b.modules}
            examAssessments={b.examAssessments}
            isCreatingModule={b.isCreatingModule}
            setIsCreatingModule={b.setIsCreatingModule}
            newModuleTitle={b.newModuleTitle}
            setNewModuleTitle={b.setNewModuleTitle}
            newModuleDescription={b.newModuleDescription}
            setNewModuleDescription={b.setNewModuleDescription}
            newModuleQuizId={b.newModuleQuizId}
            setNewModuleQuizId={b.setNewModuleQuizId}
            handleCreateModule={b.handleCreateModule}
            isCreatingModulePending={b.createModuleMutation.isPending}
            expandedModuleIds={b.expandedModuleIds}
            toggleModuleExpanded={b.toggleModuleExpanded}
            moduleDropTargetId={b.moduleDropTargetId}
            dragItem={b.dragItem}
            handleModuleDragStart={b.handleModuleDragStart}
            handleModuleDrop={b.handleModuleDrop}
            setModuleDropTargetId={b.setModuleDropTargetId}
            clearDragState={b.clearDragState}
            handleUpdateUnitQuiz={b.handleUpdateUnitQuiz}
            onRequestDeleteModule={b.setModuleToDelete}
            onRequestDeleteAssessment={b.setAssessmentToDelete}
            lessonDropTarget={b.lessonDropTarget}
            setLessonDropTarget={b.setLessonDropTarget}
            handleLessonDragStart={b.handleLessonDragStart}
            handleLessonDrop={b.handleLessonDrop}
            getLessonDropIndex={b.getLessonDropIndex}
            onOpenLessonModal={(modId, les, tab) =>
              b.setLessonModalState({
                isOpen: true,
                moduleId: modId,
                lesson: les,
                initialTab: tab || "video",
              })
            }
            onRequestDeleteLesson={b.setLessonToDelete}
          />
        </div>
      )}

      {/* TAB 2: ENROLLMENTS & STUDENTS SUITE */}
      {b.activeTopTab === "enrollments" && (
        <CourseEnrollmentsTab
          courseId={b.courseId}
          courseTitle={b.course.title}
        />
      )}

      {/* All Course Builder Modals */}
      <CourseBuilderModals
        courseId={b.courseId}
        course={b.course}
        lessonModalState={b.lessonModalState}
        onCloseLessonModal={() =>
          b.setLessonModalState({
            isOpen: false,
            moduleId: "",
            lesson: null,
            initialTab: "video",
          })
        }
        isGroupAccessModalOpen={b.isGroupAccessModalOpen}
        onCloseGroupAccessModal={() => b.setIsGroupAccessModalOpen(false)}
        isEditCourseModalOpen={b.isEditCourseModalOpen}
        onCloseEditCourseModal={() => b.setIsEditCourseModalOpen(false)}
        isPreviewVideoModalOpen={b.isPreviewVideoModalOpen}
        onClosePreviewVideoModal={() => b.setIsPreviewVideoModalOpen(false)}
        moduleToDelete={b.moduleToDelete}
        onCloseModuleDeleteModal={() => b.setModuleToDelete(null)}
        onConfirmDeleteModule={() => {
          if (b.moduleToDelete) {
            b.deleteModuleMutation.mutate(b.moduleToDelete.id);
            b.setModuleToDelete(null);
          }
        }}
        isDeleteModulePending={b.deleteModuleMutation.isPending}
        lessonToDelete={b.lessonToDelete}
        onCloseLessonDeleteModal={() => b.setLessonToDelete(null)}
        onConfirmDeleteLesson={() => {
          if (b.lessonToDelete) {
            b.deleteLessonMutation.mutate(b.lessonToDelete.id);
            b.setLessonToDelete(null);
          }
        }}
        isDeleteLessonPending={b.deleteLessonMutation.isPending}
        assessmentToDelete={b.assessmentToDelete}
        onCloseAssessmentDeleteModal={() => b.setAssessmentToDelete(null)}
        onUnlinkAssessment={b.handleUnlinkAssessment}
        onPermanentlyDeleteAssessment={b.handlePermanentlyDeleteAssessment}
        isDeletingAssessment={b.isDeletingAssessment}
      />
    </div>
  );
}
