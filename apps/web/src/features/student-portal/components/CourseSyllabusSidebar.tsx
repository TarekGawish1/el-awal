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
import { CourseDetail, CourseModule, CourseLesson } from '@/features/courses/types/courses.types';

interface CourseSyllabusSidebarProps {
  course: CourseDetail;
  activeLessonId: string;
  onSelectLesson: (lessonId: string) => void;
  onSelectQuiz?: (quizId: string) => void;
  completedLessonIds?: string[];
}

export function CourseSyllabusSidebar({
  course,
  activeLessonId,
  onSelectLesson,
  onSelectQuiz,
  completedLessonIds = [],
}: CourseSyllabusSidebarProps) {
  const modules = course.modules || [];
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedCount = completedLessonIds.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-full text-right shadow-xl">
      {/* Header with Progress Bar */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/90 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">محتوى ومنهج الدورة</span>
          <span className="text-xs font-bold text-indigo-400 font-mono">{progressPercent}% مكتمل</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-l from-indigo-500 to-emerald-400 h-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>{totalLessons} دروس مصورة</span>
          <span>{completedCount} من {totalLessons} مكتملة</span>
        </div>
      </div>

      {/* Syllabus Units Accordion List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
        {modules.map((mod: CourseModule, modIndex: number) => {
          return (
            <div key={mod.id} className="p-3.5 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-indigo-400">الوحدة {modIndex + 1}: {mod.title}</span>
                <span className="text-[10px] text-slate-500">{mod.lessons?.length || 0} دروس</span>
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
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs transition-all text-right ${
                        isActive
                          ? 'bg-indigo-600/20 border border-indigo-500/50 text-white font-bold'
                          : 'bg-slate-950/40 hover:bg-slate-950 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isActive
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                        </div>
                        <span className="truncate">{lesIndex + 1}. {les.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-500">
                        {les.isPreview && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold">
                            مجاني
                          </span>
                        )}
                        {les.videoDurationSeconds ? (
                          <span>{Math.floor(les.videoDurationSeconds / 60)} د</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}

                {/* Unit Quiz Link in Syllabus */}
                {mod.unitQuiz && (
                  <button
                    key={`quiz-${mod.id}`}
                    type="button"
                    onClick={() => onSelectQuiz && onSelectQuiz(mod.unitQuiz!.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl text-xs bg-amber-950/20 border border-amber-800/30 text-amber-300 hover:bg-amber-950/40 transition-colors text-right"
                  >
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span className="font-bold">اختبار الوحدة: {mod.unitQuiz.title}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">{mod.unitQuiz.totalScore} د</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Course Final Quiz at end of syllabus */}
        {course.courseQuiz && (
          <div className="p-3.5">
            <button
              type="button"
              onClick={() => onSelectQuiz && onSelectQuiz(course.courseQuiz!.id)}
              className="w-full flex items-center justify-between p-3 rounded-2xl text-xs bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-950/50 transition-colors text-right"
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="font-bold">الامتحان النهائي للكورس: {course.courseQuiz.title}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">{course.courseQuiz.totalScore} د</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
