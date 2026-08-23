'use client';

import React from 'react';
import {
  Layers,
  Video,
  CheckCircle,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Lock,
  Play,
} from 'lucide-react';
import { CourseModule, CourseLesson } from '@/features/courses/types/courses.types';

interface CourseSyllabusSidebarProps {
  modules: CourseModule[];
  activeLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onSelectQuiz?: (quizId: string) => void;
  completedLessonIds?: string[];
}

export function CourseSyllabusSidebar({
  modules = [],
  activeLessonId,
  onSelectLesson,
  onSelectQuiz,
  completedLessonIds = [],
}: CourseSyllabusSidebarProps) {
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedCount = completedLessonIds.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

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
          <span>{totalLessons} دروس مصورة</span>
          <span>{completedCount} من {totalLessons} مكتملة</span>
        </div>
      </div>

      {/* Syllabus Units Accordion List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
        {modules.map((mod: CourseModule, modIndex: number) => {
          return (
            <div key={mod.id} className="p-3.5 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-primary-600">
                  الوحدة {modIndex + 1}: {mod.title}
                </span>
                <span className="text-[10px] text-slate-400">{mod.lessons?.length || 0} دروس</span>
              </div>

              {/* Lessons in Unit */}
              <div className="space-y-1">
                {mod.lessons?.map((les: CourseLesson, lesIndex: number) => {
                  const isActive = les.id === activeLessonId;
                  const isCompleted = completedLessonIds.includes(les.id);

                  return (
                    <button
                      key={les.id}
                      type="button"
                      onClick={() => onSelectLesson(les.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all text-right ${
                        isActive
                          ? 'bg-primary-50 text-primary-900 font-bold border-r-4 border-primary-600 shadow-sm'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-600'
                              : isActive
                              ? 'bg-primary-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                        </div>

                        <div className="truncate">
                          <p className="truncate text-xs">{les.title}</p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            {les.videoDurationSeconds ? (
                              <span>{Math.floor(les.videoDurationSeconds / 60)} دقيقة</span>
                            ) : null}
                            {les.isPreview && (
                              <span className="text-emerald-600 font-bold">• مجاني</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {les.lessonQuiz && (
                        <span title="يحتوي على اختبار">
                          <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
