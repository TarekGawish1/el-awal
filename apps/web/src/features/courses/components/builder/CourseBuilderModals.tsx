"use client";

import React from "react";
import { Trash2, X, Video } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LessonEditorModal } from "../LessonEditorModal";
import { EditCourseModal } from "../EditCourseModal";
import { CourseGroupAccessModal } from "../CourseGroupAccessModal";
import { CourseLesson } from "../../types/courses.types";
import { AssessmentToDeleteState, LessonModalState } from "../../types/course-builder.types";

export interface CourseBuilderModalsProps {
  courseId: string;
  course: any;
  // Modals state
  lessonModalState: LessonModalState;
  onCloseLessonModal: () => void;
  isGroupAccessModalOpen: boolean;
  onCloseGroupAccessModal: () => void;
  isEditCourseModalOpen: boolean;
  onCloseEditCourseModal: () => void;
  isPreviewVideoModalOpen: boolean;
  onClosePreviewVideoModal: () => void;
  // Deletion modals state
  moduleToDelete: { id: string; title: string } | null;
  onCloseModuleDeleteModal: () => void;
  onConfirmDeleteModule: () => void;
  isDeleteModulePending: boolean;
  lessonToDelete: { id: string; title: string } | null;
  onCloseLessonDeleteModal: () => void;
  onConfirmDeleteLesson: () => void;
  isDeleteLessonPending: boolean;
  assessmentToDelete: AssessmentToDeleteState | null;
  onCloseAssessmentDeleteModal: () => void;
  onUnlinkAssessment: () => Promise<void>;
  onPermanentlyDeleteAssessment: () => Promise<void>;
  isDeletingAssessment: boolean;
}

export function CourseBuilderModals({
  courseId,
  course,
  lessonModalState,
  onCloseLessonModal,
  isGroupAccessModalOpen,
  onCloseGroupAccessModal,
  isEditCourseModalOpen,
  onCloseEditCourseModal,
  isPreviewVideoModalOpen,
  onClosePreviewVideoModal,
  moduleToDelete,
  onCloseModuleDeleteModal,
  onConfirmDeleteModule,
  isDeleteModulePending,
  lessonToDelete,
  onCloseLessonDeleteModal,
  onConfirmDeleteLesson,
  isDeleteLessonPending,
  assessmentToDelete,
  onCloseAssessmentDeleteModal,
  onUnlinkAssessment,
  onPermanentlyDeleteAssessment,
  isDeletingAssessment,
}: CourseBuilderModalsProps) {
  const resolvedLesson = lessonModalState.lesson?.id
    ? course?.modules?.flatMap((m: any) => m.lessons || [])?.find((l: CourseLesson) => l.id === lessonModalState.lesson?.id) ||
      lessonModalState.lesson
    : null;

  return (
    <>
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
          lesson={resolvedLesson}
          onClose={onCloseLessonModal}
        />
      )}

      {/* Group Access Permissions Modal */}
      {isGroupAccessModalOpen && (
        <CourseGroupAccessModal
          isOpen={isGroupAccessModalOpen}
          courseId={courseId}
          courseTitle={course.title}
          currentGroupAccess={course.groupAccess || []}
          onClose={onCloseGroupAccessModal}
        />
      )}

      {/* Edit Course Details & Settings Modal */}
      {isEditCourseModalOpen && course && (
        <EditCourseModal
          isOpen={isEditCourseModalOpen}
          course={course}
          onClose={onCloseEditCourseModal}
        />
      )}

      {/* Custom Confirmation Dialog for Module Deletion */}
      <ConfirmModal
        isOpen={Boolean(moduleToDelete)}
        title="تأكيد حذف الوحدة التعليمية"
        message={`هل أنت متأكد من حذف الوحدة "${moduleToDelete?.title}" وجميع دروسها ومرفقاتها نهائياً؟`}
        confirmText="حذف الوحدة بالكامل"
        cancelText="تراجع"
        variant="danger"
        isLoading={isDeleteModulePending}
        onConfirm={onConfirmDeleteModule}
        onClose={onCloseModuleDeleteModal}
      />

      {/* Custom Confirmation Dialog for Lesson Deletion */}
      <ConfirmModal
        isOpen={Boolean(lessonToDelete)}
        title="تأكيد حذف الدرس التعليمي"
        message={`هل أنت متأكد من حذف درس "${lessonToDelete?.title}"؟ سيتم حذف جميع الفيديوهات والملخصات والأسئلة المرتبطة به.`}
        confirmText="حذف الدرس"
        cancelText="تراجع"
        variant="danger"
        isLoading={isDeleteLessonPending}
        onConfirm={onConfirmDeleteLesson}
        onClose={onCloseLessonDeleteModal}
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
                    إدارة {assessmentToDelete.type === "EXAM" ? "الامتحان" : "الواجب"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {assessmentToDelete.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseAssessmentDeleteModal}
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
                onClick={onCloseAssessmentDeleteModal}
                disabled={isDeletingAssessment}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors text-center cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={onUnlinkAssessment}
                disabled={isDeletingAssessment}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors text-center cursor-pointer"
              >
                {isDeletingAssessment ? "جاري المعالجة..." : "إلغاء الربط فقط"}
              </button>
              <button
                type="button"
                onClick={onPermanentlyDeleteAssessment}
                disabled={isDeletingAssessment}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm text-center cursor-pointer"
              >
                {isDeletingAssessment ? "جاري الحذف..." : "حذف التقييم نهائياً"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Video Fullscreen Modal */}
      {isPreviewVideoModalOpen && course?.previewVideoUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={onClosePreviewVideoModal}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl border border-slate-200 text-right animate-in zoom-in-95 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{course.title}</h3>
                  <p className="text-xs text-slate-400">معاينة الفيديو التعريفي (البرومو الترويجي)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClosePreviewVideoModal}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-slate-950">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-800">
                {!course.previewVideoUrl.startsWith("bunny:") ? (
                  <iframe
                    src={`${course.previewVideoUrl}${course.previewVideoUrl.includes("?") ? "&" : "?"}autoplay=1`}
                    className="w-full h-full border-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-900 text-center p-6">
                    <Video className="w-8 h-8 text-amber-400" />
                    <p className="text-xs font-bold text-white">الفيديو التعريفي قيد المعالجة ⏳</p>
                    <p className="text-[11px] text-slate-400">سيظهر هنا فور اكتمال رفع Bunny Stream.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                جاهز ومفعل للظهور في واجهة المنصة للطلاب
              </span>
              <button
                type="button"
                onClick={onClosePreviewVideoModal}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
