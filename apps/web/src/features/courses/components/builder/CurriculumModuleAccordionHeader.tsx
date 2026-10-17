'use client';

import React from 'react';
import Link from 'next/link';
import { GripVertical, Award, Edit, ExternalLink, Trash2, Plus } from 'lucide-react';
import { CourseModule, CourseLesson } from '../../types/courses.types';
import { AssessmentToDeleteState } from '../../types/course-builder.types';

export interface CurriculumModuleAccordionHeaderProps {
  courseId: string;
  mod: CourseModule;
  modIndex: number;
  lessonsCount: number;
  examAssessments: any[];
  toggleModuleExpanded: (moduleId: string) => void;
  handleModuleDragStart: (e: React.DragEvent, moduleId: string) => void;
  clearDragState: () => void;
  handleUpdateUnitQuiz: (moduleId: string, unitQuizId: string) => Promise<void>;
  onRequestDeleteModule: (mod: { id: string; title: string }) => void;
  onRequestDeleteAssessment: (assessment: AssessmentToDeleteState) => void;
  onOpenLessonModal: (
    moduleId: string,
    lesson: CourseLesson | null,
    tab?: 'video' | 'summary' | 'attachments' | 'quiz',
  ) => void;
}

export function CurriculumModuleAccordionHeader({
  courseId,
  mod,
  modIndex,
  lessonsCount,
  examAssessments,
  toggleModuleExpanded,
  handleModuleDragStart,
  clearDragState,
  handleUpdateUnitQuiz,
  onRequestDeleteModule,
  onRequestDeleteAssessment,
  onOpenLessonModal,
}: CurriculumModuleAccordionHeaderProps) {
  return (
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
                  onRequestDeleteAssessment({
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
  );
}
