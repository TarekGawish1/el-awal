"use client";

import React from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  BookOpen,
  GripVertical,
  Award,
  Edit,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { CourseModule, CourseLesson } from "../../types/courses.types";
import { AssessmentToDeleteState, DragItemState, LessonDropTargetState } from "../../types/course-builder.types";
import { CurriculumLessonItem } from "./CurriculumLessonItem";

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
                    {a.title} ({a.type === "EXAM" ? "امتحان" : "واجب"})
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
              disabled={isCreatingModulePending}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isCreatingModulePending ? "جاري الحفظ..." : "حفظ الوحدة"}
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
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 break-words line-clamp-1 sm:line-clamp-none">
                          {mod.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Unit Controls (Unit Quiz + Add Lesson + Delete) */}
                  <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-xs shadow-sm flex-1 sm:flex-none min-w-0">
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <select
                          value={mod.unitQuizId || ""}
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
                              onRequestDeleteAssessment({
                                id: mod.unitQuizId!,
                                title: mod.unitQuiz?.title || "امتحان الوحدة",
                                type: "EXAM",
                                scope: "unit",
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
                        onClick={() => onOpenLessonModal(mod.id, null)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة درس</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRequestDeleteModule({ id: mod.id, title: mod.title })}
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
