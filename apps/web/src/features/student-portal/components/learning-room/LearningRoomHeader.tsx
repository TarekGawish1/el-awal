'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, Menu, RotateCcw, Lock, Columns } from 'lucide-react';

export interface LearningRoomHeaderProps {
  courseId: string;
  courseTitle: string;
  subject?: string;
  isTeacherOrAdmin: boolean;
  enforceSequentialLessons?: boolean;
  onResetPreview: () => void;
  activeLessonTitle?: string;
  selectedLessonId: string | null;
  isLessonCompleted: boolean;
  isMarkingComplete: boolean;
  onToggleComplete: () => void;
  onOpenMobileSyllabus: () => void;
  isDesktopSyllabusCollapsed?: boolean;
  onToggleDesktopSyllabus?: () => void;
}

export function LearningRoomHeader({
  courseId,
  courseTitle,
  subject,
  isTeacherOrAdmin,
  enforceSequentialLessons,
  onResetPreview,
  activeLessonTitle,
  selectedLessonId,
  isLessonCompleted,
  isMarkingComplete,
  onToggleComplete,
  onOpenMobileSyllabus,
  isDesktopSyllabusCollapsed = false,
  onToggleDesktopSyllabus,
}: LearningRoomHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-sm">
      <div className="flex items-center gap-3">
        <Link
          href={isTeacherOrAdmin ? `/teacher/courses/${courseId}` : '/student/courses'}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-primary-50 hover:text-primary-600 text-slate-700 flex items-center justify-center transition-colors shrink-0 border border-slate-200"
          title={isTeacherOrAdmin ? 'العودة لتعديل وبناء الكورس' : 'العودة لقائمة الدورات'}
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-primary-600">{courseTitle}</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500">{subject}</span>
            {isTeacherOrAdmin && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  وضع معاينة المعلم
                </span>
                {enforceSequentialLessons && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    ترتيب المنهج إلزامي
                  </span>
                )}
                <button
                  type="button"
                  onClick={onResetPreview}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  title="إعادة تعيين تقدم المشاهدة والاختبارات في المعاينة للبدء من الصفر"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>إعادة ضبط المعاينة</span>
                </button>
              </div>
            )}
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
            {activeLessonTitle || 'قاعة المشاهدة والتعلم'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {selectedLessonId && (
          <button
            type="button"
            onClick={onToggleComplete}
            disabled={isMarkingComplete}
            className={`hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
              isLessonCompleted
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white'
            }`}
          >
            <CheckCircle
              className={`w-4 h-4 ${isLessonCompleted ? 'text-white' : 'text-emerald-600'}`}
            />
            <span>{isLessonCompleted ? 'مكتمل ومُتقن' : 'تحديد كمكتمل'}</span>
          </button>
        )}

        {/* Toggle Syllabus on Desktop (Expand video player / Theater mode) */}
        {onToggleDesktopSyllabus && (
          <button
            type="button"
            onClick={onToggleDesktopSyllabus}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
              isDesktopSyllabusCollapsed
                ? 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={
              isDesktopSyllabusCollapsed
                ? 'إظهار قائمة الدروس'
                : 'توسيع مشغل الفيديو وإخفاء قائمة الدروس'
            }
          >
            <Columns className="w-4 h-4 text-slate-500" />
            <span>{isDesktopSyllabusCollapsed ? 'إظهار الدروس' : 'توسيع المشغل'}</span>
          </button>
        )}

        {/* Toggle Syllabus on Mobile */}
        <button
          type="button"
          onClick={onOpenMobileSyllabus}
          className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200"
          title="فصول ومنهج الكورس"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
