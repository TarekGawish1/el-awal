'use client';

import React from 'react';
import {
  BookOpen,
  Video,
  Play,
  PlayCircle,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface CourseCurriculumListProps {
  course: any;
  allModules: any[];
  totalLessonsCount: number;
  activePreviewLesson: any | null;
  setActivePreviewLesson: (lesson: any) => void;
  expandedModules: Set<string>;
  setExpandedModules: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function CourseCurriculumList({
  course,
  allModules,
  totalLessonsCount,
  activePreviewLesson,
  setActivePreviewLesson,
  expandedModules,
  setExpandedModules,
}: CourseCurriculumListProps) {
  return (
    <div className="space-y-6">
      {/* Active Free Preview Player */}
      {activePreviewLesson && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold truncate">
                {activePreviewLesson.isCourseIntro ? 'فيديو تعريفي بالكورس' : `معاينة مجانية: ${activePreviewLesson.title}`}
              </span>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-none text-xs">
              {activePreviewLesson.isCourseIntro ? 'فيديو تعريفي تمهيدي 🎬' : 'درس تجريبي مجاني'}
            </Badge>
          </div>
          <div className="aspect-video w-full bg-black relative">
            <iframe
              src={activePreviewLesson.freeVideoUrl}
              loading="lazy"
              className="w-full h-full border-0"
              allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Promo Video Banner if not currently watching it */}
      {course.previewVideoUrl && activePreviewLesson?.id !== 'course-preview-intro' && (
        <div className="bg-gradient-to-l from-primary-50 to-blue-50 border border-primary-200/70 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">فيديو تعريفي بالكورس (برومو تمهيدي)</h3>
              <p className="text-[11px] text-slate-500">شاهد نبذة شاملة عن محتوى الكورس وطريقة الشرح قبل الاشتراك</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActivePreviewLesson({
                id: 'course-preview-intro',
                title: 'فيديو تعريفي بالكورس 🎬',
                freeVideoUrl: course.previewVideoUrl,
                isCourseIntro: true,
              });
              window.scrollTo({ top: 150, behavior: 'smooth' });
            }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>مشاهدة الفيديو</span>
          </button>
        </div>
      )}

      {/* Curriculum / Syllabus Modules */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-600" />
            <span>محتوى ومنهج الكورس ({allModules.length} وحدات)</span>
          </h2>
          <span className="text-xs text-slate-500 font-semibold">{totalLessonsCount} درس</span>
        </div>

        <div className="space-y-4">
          {allModules.map((module: any, mIdx: number) => (
            <div key={module.id || mIdx} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
              <div className="p-4 bg-slate-100/70 flex items-center justify-between font-bold text-slate-800 text-sm">
                <button
                  type="button"
                  onClick={() => setExpandedModules((previous) => {
                    const key = module.id || String(mIdx);
                    const next = new Set(previous);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })}
                  aria-expanded={expandedModules.has(module.id || String(mIdx))}
                  className="flex flex-1 items-center gap-2 text-right cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-lg bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-mono">
                    {mIdx + 1}
                  </span>
                  <span>{module.title}</span>
                </button>
                <span className="flex items-center gap-2 text-xs text-slate-500 font-normal">
                  <span>{module.lessons?.length || 0} دروس</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedModules.has(module.id || String(mIdx)) ? 'rotate-180' : ''}`} />
                </span>
              </div>

              {expandedModules.has(module.id || String(mIdx)) && (
                <div className="divide-y divide-slate-100 bg-white">
                  {(module.lessons || []).map((lesson: any, lIdx: number) => {
                    const isPreview = lesson.isPreview && lesson.freeVideoUrl;
                    const isActive = activePreviewLesson?.id === lesson.id;

                    return (
                      <div
                        key={lesson.id || lIdx}
                        className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                          isActive ? 'bg-primary-50/70 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isPreview ? (
                            <button
                              type="button"
                              onClick={() => setActivePreviewLesson(lesson)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              }`}
                              title="مشاهدة الفيديو المجاني"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-400">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span className="truncate text-slate-700">{lesson.title}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPreview ? (
                            <button
                              type="button"
                              onClick={() => setActivePreviewLesson(lesson)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                            >
                              {isActive ? 'قيد المشاهدة' : 'معاينة مجانية'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">مغلق للمشتركين</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
