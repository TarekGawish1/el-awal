"use client";

import React from "react";
import Link from "next/link";
import {
  GripVertical,
  Clock,
  Video,
  FileText,
  Paperclip,
  Award,
  Edit,
  Trash2,
} from "lucide-react";
import { CourseLesson } from "../../types/courses.types";
import { formatLessonDurationArabic } from "../../utils/video-optimizer";
import { AssessmentToDeleteState, DragItemState, LessonDropTargetState } from "../../types/course-builder.types";

export interface CurriculumLessonItemProps {
  les: CourseLesson;
  lesIndex: number;
  modId: string;
  modIndex: number;
  lessonsCount: number;
  dragItem: DragItemState | null;
  lessonDropTarget: LessonDropTargetState | null;
  onLessonDragStart: (e: React.DragEvent, lessonId: string, moduleId: string) => void;
  onClearDragState: () => void;
  onLessonDrop: (targetModuleId: string, targetIndex: number) => void;
  getLessonDropIndex: (e: React.DragEvent, lesIndex: number) => number;
  setLessonDropTarget: (target: LessonDropTargetState | null) => void;
  onOpenLessonModal: (moduleId: string, lesson: CourseLesson, tab?: "video" | "summary" | "attachments" | "quiz") => void;
  onRequestDeleteLesson: (lesson: { id: string; title: string }) => void;
  onRequestDeleteAssessment: (assessment: AssessmentToDeleteState) => void;
}

export function CurriculumLessonItem({
  les,
  lesIndex,
  modId,
  modIndex,
  lessonsCount,
  dragItem,
  lessonDropTarget,
  onLessonDragStart,
  onClearDragState,
  onLessonDrop,
  getLessonDropIndex,
  setLessonDropTarget,
  onOpenLessonModal,
  onRequestDeleteLesson,
  onRequestDeleteAssessment,
}: CurriculumLessonItemProps) {
  const hasVideo = Boolean(les.bunnyVideoId || les.contentUrl);
  const hasSummary = Boolean(les.summary);
  const hasAttachments = Boolean(les.attachments && les.attachments.length > 0);
  const hasQuiz = Boolean(
    (les.lessonQuiz && (les.lessonQuiz.type === "EXAM" || les.lessonQuiz.type === "QUIZ")) ||
      les.assessments?.some((a) => a.type === "EXAM" || a.type === "QUIZ")
  );
  const linkedQuiz =
    (les.lessonQuiz && (les.lessonQuiz.type === "EXAM" || les.lessonQuiz.type === "QUIZ"))
      ? les.lessonQuiz
      : les.assessments?.find((a) => a.type === "EXAM" || a.type === "QUIZ");
  const linkedQuizId = linkedQuiz?.id || (hasQuiz ? les.lessonQuizId : undefined);

  const hasHomework = Boolean(
    les.assessments?.some(
      (a) =>
        a.type === "ASSIGNMENT" ||
        a.type === "HOMEWORK" ||
        (a as any).assessmentType === "HOMEWORK"
    ) ||
      (les.lessonQuiz && (les.lessonQuiz.type === "ASSIGNMENT" || les.lessonQuiz.type === "HOMEWORK"))
  );
  const linkedHomework =
    les.assessments?.find(
      (a) =>
        a.type === "ASSIGNMENT" ||
        a.type === "HOMEWORK" ||
        (a as any).assessmentType === "HOMEWORK"
    ) ||
    (les.lessonQuiz && (les.lessonQuiz.type === "ASSIGNMENT" || les.lessonQuiz.type === "HOMEWORK")
      ? les.lessonQuiz
      : null);
  const linkedHomeworkId = linkedHomework?.id;

  const isDraggedLesson = dragItem?.type === "lesson" && dragItem.id === les.id;
  const isDropIndicator =
    !isDraggedLesson &&
    dragItem?.type === "lesson" &&
    lessonDropTarget?.moduleId === modId &&
    lessonDropTarget?.index === lesIndex;
  const isEndDropIndicator =
    !isDraggedLesson &&
    dragItem?.type === "lesson" &&
    lesIndex === lessonsCount - 1 &&
    lessonDropTarget?.moduleId === modId &&
    lessonDropTarget?.index === lessonsCount;

  return (
    <div
      draggable
      onDragStart={(e) => onLessonDragStart(e, les.id, modId)}
      onDragEnd={onClearDragState}
      onDragOver={(e) => {
        if (dragItem?.type !== "lesson" || dragItem.id === les.id) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setLessonDropTarget({ moduleId: modId, index: getLessonDropIndex(e, lesIndex) });
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onLessonDrop(modId, getLessonDropIndex(e, lesIndex));
      }}
      className={`p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition-colors cursor-grab active:cursor-grabbing ${
        isDraggedLesson
          ? "opacity-40 border-primary-300 bg-slate-50"
          : isEndDropIndicator
          ? "border-b-2 border-b-primary-500 bg-primary-50/30"
          : isDropIndicator
          ? "border-t-2 border-t-primary-500 bg-primary-50/30"
          : "border-slate-100 bg-slate-50/60 hover:bg-slate-100/60"
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
                {formatLessonDurationArabic(les.videoDurationSeconds)}
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
                        onRequestDeleteAssessment({
                          id: linkedQuizId,
                          title: linkedQuiz?.title || "اختبار الدرس",
                          type: "EXAM",
                          scope: "lesson",
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
                        onRequestDeleteAssessment({
                          id: linkedHomeworkId,
                          title: linkedHomework?.title || "واجب الدرس",
                          type: "HOMEWORK",
                          scope: "lesson",
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
          onClick={() => onOpenLessonModal(modId, les, "quiz")}
          className="p-1.5 sm:p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 bg-white rounded-xl border border-purple-200 transition-colors shadow-xs cursor-pointer"
          title="إدارة اختبار وواجب الدرس"
        >
          <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={() => onOpenLessonModal(modId, les)}
          className="p-1.5 sm:p-2 text-slate-600 hover:text-primary-600 bg-white rounded-xl border border-slate-200 transition-colors shadow-xs cursor-pointer"
          title="تعديل محتوى الدرس"
        >
          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRequestDeleteLesson({ id: les.id, title: les.title })}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-600 bg-white rounded-xl border border-slate-200 transition-colors shadow-xs cursor-pointer"
          title="حذف الدرس"
        >
          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}
