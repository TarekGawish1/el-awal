'use client';

import React from 'react';
import { Play, Lock, CheckCircle, Award } from 'lucide-react';
import { CourseLesson } from '@/features/courses/types/courses.types';
import { formatLessonDurationArabic } from '@/features/courses/utils/video-optimizer';

interface SyllabusLessonItemProps {
  lesson: CourseLesson;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  onSelectLesson: (lesson: CourseLesson) => void;
}

export function SyllabusLessonItem({
  lesson,
  isActive,
  isCompleted,
  isLocked,
  onSelectLesson,
}: SyllabusLessonItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectLesson(lesson)}
      title={isLocked ? 'أكمل المتطلبات السابقة للوصول لهذا الدرس' : lesson.title}
      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all text-right ${
        isActive
          ? 'bg-primary-50 text-primary-900 font-bold border-r-4 border-primary-600 shadow-sm'
          : isLocked
          ? 'opacity-60 cursor-not-allowed bg-slate-50 text-slate-400'
          : 'hover:bg-slate-50 text-slate-700'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-600'
              : isLocked
              ? 'bg-slate-200 text-slate-400'
              : isActive
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {isCompleted ? (
            <CheckCircle className="w-3.5 h-3.5" />
          ) : isLocked ? (
            <Lock className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
        </div>

        <div className="truncate">
          <p className="truncate text-xs">{lesson.title}</p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            {lesson.videoDurationSeconds ? (
              <span>{formatLessonDurationArabic(lesson.videoDurationSeconds)}</span>
            ) : null}
            {lesson.isPreview && (
              <span className="text-emerald-600 font-bold">• مجاني</span>
            )}
            {isLocked && (
              <span className="text-amber-500 font-bold">• مقفل</span>
            )}
          </div>
        </div>
      </div>

      {lesson.lessonQuiz && !isLocked && (
        <span
          title={lesson.lessonQuiz.isOptional ? 'اختبار اختياري' : 'اختبار إجباري'}
          className="flex items-center gap-1"
        >
          <Award
            className={`w-3.5 h-3.5 shrink-0 ${
              lesson.lessonQuiz.isOptional ? 'text-blue-500' : 'text-amber-500'
            }`}
          />
          {lesson.lessonQuiz.isOptional && (
            <span className="text-[9px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded font-bold">
              اختياري
            </span>
          )}
        </span>
      )}
    </button>
  );
}
