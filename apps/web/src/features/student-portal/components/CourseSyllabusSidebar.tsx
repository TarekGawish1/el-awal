'use client';

import React from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { CourseModule, CourseLesson, AssessmentSummary } from '@/features/courses/types/courses.types';
import { useCourseSyllabusProgression } from '../hooks/useCourseSyllabusProgression';
import { SyllabusLessonItem } from './syllabus/SyllabusLessonItem';
import { SyllabusUnitExamCard } from './syllabus/SyllabusUnitExamCard';
import { SyllabusFinalExamCard } from './syllabus/SyllabusFinalExamCard';

interface CourseSyllabusSidebarProps {
  modules: CourseModule[];
  allLessons?: CourseLesson[]; // ordered flat list for sequential unlock calculation
  activeLessonId: string | null;
  activeQuizId?: string | null;
  onSelectLesson: (lessonId: string) => void;
  onSelectQuiz?: (quizId: string) => void;
  completedLessonIds?: string[];
  enforceSequentialLessons?: boolean;
  requireExamPassingToUnlock?: boolean;
  courseQuiz?: AssessmentSummary | null;
}

export function CourseSyllabusSidebar({
  modules = [],
  activeLessonId,
  activeQuizId,
  onSelectLesson,
  onSelectQuiz,
  completedLessonIds = [],
  enforceSequentialLessons = false,
  courseQuiz,
}: CourseSyllabusSidebarProps) {
  const {
    totalLessons,
    totalUnitQuizzes,
    completedCount,
    progressPercent,
    expandedModules,
    toggleModuleExpanded,
    unlockedLessonIds,
    handleLessonClick,
    handleUnitQuizClick,
    isUnitQuizUnlocked,
    isCourseQuizUnlocked,
    handleCourseQuizClick,
  } = useCourseSyllabusProgression({
    modules,
    completedLessonIds,
    enforceSequentialLessons,
    courseQuiz,
    onSelectLesson,
    onSelectQuiz,
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full text-right shadow-sm">
      {/* Header with Progress Bar */}
      <div className="p-5 border-b border-slate-100 bg-slate-50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">محتوى ومنهج الدورة</span>
          <span className="text-xs font-bold text-primary-600 font-mono">{progressPercent}% مكتمل</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary-600 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{totalLessons} دروس مصورة {totalUnitQuizzes > 0 ? `• ${totalUnitQuizzes} امتحانات وحدات` : ''}</span>
          <span>{completedCount} من {totalLessons} مكتملة</span>
        </div>

        {/* Sequential enforcement badge */}
        {enforceSequentialLessons && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <Lock className="w-3 h-3 shrink-0" />
            <span className="font-bold">المنهج مرتب بالتسلسل — أكمل كل درس وامتحان وحدة للانتقال للتالي</span>
          </div>
        )}
      </div>

      {/* Syllabus Units Accordion List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
        {modules.map((mod: CourseModule, modIndex: number) => {
          return (
            <div key={mod.id} className="p-3.5 space-y-2">
              <button
                type="button"
                onClick={() => toggleModuleExpanded(mod.id)}
                aria-expanded={expandedModules.has(mod.id)}
                className="w-full flex items-center justify-between px-1 text-right"
              >
                <span className="text-[11px] font-bold text-primary-600">
                  الوحدة {modIndex + 1}: {mod.title}
                </span>
                <span className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>{mod.lessons?.length || 0} دروس {mod.unitQuiz ? '• 📝 امتحان وحدة' : ''}</span>
                  {expandedModules.has(mod.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {/* Lessons in Unit */}
              {expandedModules.has(mod.id) && (
                <div className="space-y-1">
                  {mod.lessons?.map((les: CourseLesson) => {
                    const isActive = les.id === activeLessonId;
                    const isCompleted = completedLessonIds.includes(les.id);
                    const isLocked = !unlockedLessonIds.has(les.id);

                    return (
                      <SyllabusLessonItem
                        key={les.id}
                        lesson={les}
                        isActive={isActive}
                        isCompleted={isCompleted}
                        isLocked={isLocked}
                        onSelectLesson={handleLessonClick}
                      />
                    );
                  })}
                </div>
              )}

              {/* Unit Exam Card if present */}
              {expandedModules.has(mod.id) && mod.unitQuiz && (
                <SyllabusUnitExamCard
                  module={mod}
                  moduleIndex={modIndex}
                  activeQuizId={activeQuizId}
                  isUnlocked={isUnitQuizUnlocked(mod, modIndex)}
                  onSelectUnitQuiz={handleUnitQuizClick}
                />
              )}
            </div>
          );
        })}

        {/* Course Final Exam Card if present */}
        <SyllabusFinalExamCard
          courseQuiz={courseQuiz}
          isUnlocked={isCourseQuizUnlocked}
          onSelectCourseQuiz={handleCourseQuizClick}
        />
      </div>
    </div>
  );
}
