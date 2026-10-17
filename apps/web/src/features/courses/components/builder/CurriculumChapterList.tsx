"use client";

import React from "react";
import { Layers, Plus, BookOpen } from "lucide-react";
import { CourseModule, CourseLesson } from "../../types/courses.types";
import { AssessmentToDeleteState, DragItemState, LessonDropTargetState } from "../../types/course-builder.types";
import { CurriculumLessonItem } from "./CurriculumLessonItem";
import { InlineCreateModuleForm } from "./InlineCreateModuleForm";
import { CurriculumModuleAccordionHeader } from "./CurriculumModuleAccordionHeader";

export interface CurriculumChapterListProps {
  courseId: string;
  modules: CourseModule[];
  examAssessments: any[];
  isCreatingModule: boolean;
  setIsCreatingModule: (val: boolean) => void;
  newModuleTitle: string;
  setNewModuleTitle: (val: string) => void;
  newModuleDescription: string;
  setNewModuleDescription: (val: string) => void;
  newModuleQuizId: string;
  setNewModuleQuizId: (val: string) => void;
  handleCreateModule: (e: React.FormEvent) => Promise<void>;
  isCreatingModulePending: boolean;
  expandedModuleIds: Record<string, boolean>;
  toggleModuleExpanded: (moduleId: string) => void;
  moduleDropTargetId: string | null;
  dragItem: DragItemState | null;
  handleModuleDragStart: (e: React.DragEvent, moduleId: string) => void;
  handleModuleDrop: (moduleId: string) => void;
  setModuleDropTargetId: React.Dispatch<React.SetStateAction<string | null>>;
  clearDragState: () => void;
  handleUpdateUnitQuiz: (moduleId: string, unitQuizId: string) => Promise<void>;
  onRequestDeleteModule: (mod: { id: string; title: string }) => void;
  onRequestDeleteAssessment: (assessment: AssessmentToDeleteState) => void;
  // Lesson interactions
  lessonDropTarget: LessonDropTargetState | null;
  setLessonDropTarget: (target: LessonDropTargetState | null) => void;
  handleLessonDragStart: (e: React.DragEvent, lessonId: string, moduleId: string) => void;
  handleLessonDrop: (targetModuleId: string, targetIndex: number) => void;
  getLessonDropIndex: (e: React.DragEvent, lesIndex: number) => number;
  onOpenLessonModal: (moduleId: string, lesson: CourseLesson | null, tab?: "video" | "summary" | "attachments" | "quiz") => void;
  onRequestDeleteLesson: (lesson: { id: string; title: string }) => void;
}

export function CurriculumChapterList({
  courseId,
  modules,
  examAssessments,
  isCreatingModule,
  setIsCreatingModule,
  newModuleTitle,
  setNewModuleTitle,
  newModuleDescription,
  setNewModuleDescription,
  newModuleQuizId,
  setNewModuleQuizId,
  handleCreateModule,
  isCreatingModulePending,
  expandedModuleIds,
  toggleModuleExpanded,
  moduleDropTargetId,
  dragItem,
  handleModuleDragStart,
  handleModuleDrop,
  setModuleDropTargetId,
  clearDragState,
  handleUpdateUnitQuiz,
  onRequestDeleteModule,
  onRequestDeleteAssessment,
  lessonDropTarget,
  setLessonDropTarget,
  handleLessonDragStart,
  handleLessonDrop,
  getLessonDropIndex,
  onOpenLessonModal,
  onRequestDeleteLesson,
}: CurriculumChapterListProps) {
  return (
    <div className="space-y-4">
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
      <InlineCreateModuleForm
        isCreatingModule={isCreatingModule}
        setIsCreatingModule={setIsCreatingModule}
        newModuleTitle={newModuleTitle}
        setNewModuleTitle={setNewModuleTitle}
        newModuleDescription={newModuleDescription}
        setNewModuleDescription={setNewModuleDescription}
        newModuleQuizId={newModuleQuizId}
        setNewModuleQuizId={setNewModuleQuizId}
        examAssessments={examAssessments}
        handleCreateModule={handleCreateModule}
        isCreatingModulePending={isCreatingModulePending}
      />

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
                  moduleDropTargetId === mod.id && dragItem?.type === "module" && dragItem.id !== mod.id
                    ? "border-primary-400 ring-2 ring-primary-200"
                    : "border-slate-200"
                }`}
                onDragOver={(e) => {
                  if (dragItem?.type === "module") {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setModuleDropTargetId(mod.id);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setModuleDropTargetId((prev) => (prev === mod.id ? null : prev));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragItem?.type === "module") {
                    handleModuleDrop(mod.id);
                  }
                }}
              >
                {/* Module Accordion Header */}
                <CurriculumModuleAccordionHeader
                  courseId={courseId}
                  mod={mod}
                  modIndex={modIndex}
                  lessonsCount={lessonsCount}
                  examAssessments={examAssessments}
                  toggleModuleExpanded={toggleModuleExpanded}
                  handleModuleDragStart={handleModuleDragStart}
                  clearDragState={clearDragState}
                  handleUpdateUnitQuiz={handleUpdateUnitQuiz}
                  onRequestDeleteModule={onRequestDeleteModule}
                  onRequestDeleteAssessment={onRequestDeleteAssessment}
                  onOpenLessonModal={onOpenLessonModal}
                />

                {/* Lessons List in Module */}
                {!isCollapsed && (
                  <div
                    className={`p-3 sm:p-4 space-y-2.5 transition-colors ${
                      lessonDropTarget?.moduleId === mod.id && dragItem?.type === "lesson" && dragItem.moduleId !== mod.id
                        ? "bg-primary-50/40 ring-2 ring-inset ring-primary-200"
                        : "bg-white"
                    }`}
                    onDragOver={(e) => {
                      if (dragItem?.type !== "lesson") return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setLessonDropTarget({ moduleId: mod.id, index: mod.lessons?.length || 0 });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleLessonDrop(mod.id, mod.lessons?.length || 0);
                    }}
                  >
                    {!mod.lessons || mod.lessons.length === 0 ? (
                      <p
                        className={`text-xs text-center py-5 rounded-xl border-2 border-dashed ${
                          dragItem?.type === "lesson"
                            ? "text-primary-500 border-primary-300 bg-primary-50/50"
                            : "text-slate-400 border-transparent"
                        }`}
                      >
                        {dragItem?.type === "lesson"
                          ? "أفلت الدرس هنا لنقله إلى هذه الوحدة"
                          : 'لا توجد دروس في هذه الوحدة بعد. انقر على "+ إضافة درس" للبدء.'}
                      </p>
                    ) : (
                      mod.lessons.map((les: CourseLesson, lesIndex: number) => (
                        <CurriculumLessonItem
                          key={les.id}
                          les={les}
                          lesIndex={lesIndex}
                          modId={mod.id}
                          modIndex={modIndex}
                          lessonsCount={lessonsCount}
                          dragItem={dragItem}
                          lessonDropTarget={lessonDropTarget}
                          onLessonDragStart={handleLessonDragStart}
                          onClearDragState={clearDragState}
                          onLessonDrop={handleLessonDrop}
                          getLessonDropIndex={getLessonDropIndex}
                          setLessonDropTarget={setLessonDropTarget}
                          onOpenLessonModal={onOpenLessonModal}
                          onRequestDeleteLesson={onRequestDeleteLesson}
                          onRequestDeleteAssessment={onRequestDeleteAssessment}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
