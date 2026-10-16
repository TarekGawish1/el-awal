'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  PlayCircle,
  Lock,
  ChevronDown,
  X,
  BookOpen,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { formatLessonDurationArabic } from '@/features/courses/utils/video-optimizer';
import { toast } from 'react-hot-toast';

interface CoursePreviewModalProps {
  course: any;
  onClose: () => void;
}

export function CoursePreviewModal({ course, onClose }: CoursePreviewModalProps) {
  const [activePreviewLesson, setActivePreviewLesson] = useState<{
    id: string;
    title: string;
    videoUrl: string | null;
  } | null>(() => {
    let freeLesson: any = null;
    if (course.modules?.length) {
      for (const mod of course.modules) {
        const match = mod.lessons?.find(
          (l: any) => l.isPreview && l.freeVideoUrl,
        );
        if (match) {
          freeLesson = {
            id: match.id,
            title: match.title,
            videoUrl: match.freeVideoUrl,
          };
          break;
        }
      }
    }
    if (!freeLesson && course.freeVideoUrl) {
      freeLesson = {
        id: course.freeVideoLessonId || 'free-1',
        title: 'معاينة الدرس المجاني',
        videoUrl: course.freeVideoUrl,
      };
    }
    return freeLesson;
  });

  const [expandedModule, setExpandedModule] = useState<string | number | null>(
    () => course.modules?.[0]?.id ?? 0,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        role="dialog"
        aria-modal="true"
        aria-label={`تفاصيل كورس ${course.title}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 flex items-start justify-between shrink-0 border-b border-slate-800">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                {course.badge}
              </span>
              {course.gradeLevel && (
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
                  {course.gradeLevel}
                </span>
              )}
              {course.subject && (
                <span className="bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 text-xs font-semibold px-3 py-1 rounded-full">
                  مادة {course.subject}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
              {course.title}
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {course.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة المعاينة"
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Video & Subscription Sidebar */}
          <div className="w-full lg:w-[380px] bg-slate-50 border-b lg:border-b-0 lg:border-l border-slate-200 p-6 flex flex-col shrink-0 order-1 lg:order-2 overflow-y-auto">
            {activePreviewLesson?.videoUrl ? (
              <div className="mb-4">
                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg mb-3 relative group border border-slate-200">
                  <iframe
                    key={activePreviewLesson.id + activePreviewLesson.videoUrl}
                    src={`${activePreviewLesson.videoUrl}${activePreviewLesson.videoUrl.includes('?') ? '&' : '?'}autoplay=0`}
                    loading="lazy"
                    title={`مشغل فيديو ${activePreviewLesson.title || course.title}`}
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="w-full h-full border-0 absolute inset-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold shadow-xs">
                  <PlayCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    جاري تشغيل: {activePreviewLesson.title}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-video bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-inner mb-4 text-slate-300 border border-slate-800">
                <PlayCircle className="w-12 h-12 text-slate-500 mb-2" />
                <p className="text-xs font-semibold text-slate-400">
                  اختر درساً متاحاً للمعاينة المجانية من القائمة
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-slate-900">
                  {course.price} ج.م
                </span>
                <span className="text-sm font-semibold text-slate-400 line-through">
                  {Math.round(course.price * 1.5)} ج.م
                </span>
              </div>

              <div>
                <div className="text-lg font-black text-slate-900 mb-1">
                  اشترك الآن للوصول الكامل
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  يتيح لك الاشتراك فتح كافة الدروس، المذكرات، والاختبارات
                  التفاعلية
                </p>
              </div>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md hover:shadow-lg text-sm"
              >
                <span>الاشتراك في الكورس</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">
                  ماذا يتضمن هذا الكورس؟
                </h4>
                <ul className="text-xs text-slate-600 space-y-2.5">
                  <li className="flex items-center gap-2.5">
                    <PlayCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {course.totalLessons || 0} درساً تعليمياً مسجلاً
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      {course.totalModules || course.modules?.length || 0} وحدات منهجية شاملة
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>مذكرات وملخصات PDF لكل درس</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <ClipboardList className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>اختبارات إلكترونية تفاعلية وواجبات</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Course Syllabus / Structure */}
          <div className="w-full lg:flex-1 p-6 sm:p-8 overflow-y-auto order-2 lg:order-1 bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900">
                محتوى الكورس
              </h3>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                {course.modules?.length || 0} وحدات • {course.totalLessons || 0} درس
              </span>
            </div>

            {course.modules && course.modules.length > 0 ? (
              <div className="space-y-3.5">
                {course.modules.map((mod: any, moduleIndex: number) => {
                  const isExpanded = expandedModule === (mod.id || moduleIndex);
                  return (
                    <div
                      key={mod.id || moduleIndex}
                      className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedModule(
                            isExpanded ? null : mod.id || moduleIndex,
                          )
                        }
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors text-right"
                      >
                        <div className="flex items-center gap-3">
                          <ChevronDown
                            className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                          <div>
                            <span className="font-bold text-slate-800 text-sm sm:text-base">
                              {mod.title}
                            </span>
                            {mod.description && (
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                {mod.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shrink-0 shadow-2xs">
                          {mod.lessons?.length || 0} دروس
                        </span>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 space-y-2 border-t border-slate-100 bg-slate-50/50">
                              {mod.lessons && mod.lessons.length > 0 ? (
                                mod.lessons.map(
                                  (lesson: any, lessonIndex: number) => {
                                    const isFree = Boolean(
                                      lesson.isPreview && lesson.freeVideoUrl,
                                    );
                                    const isPlaying =
                                      activePreviewLesson?.id === lesson.id;

                                    return (
                                      <div
                                        key={lesson.id || lessonIndex}
                                        onClick={() => {
                                          if (isFree) {
                                            setActivePreviewLesson({
                                              id: lesson.id,
                                              title: lesson.title,
                                              videoUrl: lesson.freeVideoUrl,
                                            });
                                            toast.success(
                                              `تم تشغيل المعاينة المجانية: ${lesson.title}`,
                                            );
                                          } else {
                                            toast(
                                              'هذا الدرس متاح حصرياً للمشتركين في الكورس',
                                              { icon: '🔒' },
                                            );
                                          }
                                        }}
                                        className={`flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer ${
                                          isPlaying
                                            ? 'bg-emerald-50/90 border-2 border-emerald-400 shadow-sm'
                                            : isFree
                                              ? 'bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300'
                                              : 'bg-white/60 hover:bg-white border border-slate-100 opacity-75'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          {isFree ? (
                                            <PlayCircle
                                              className={`w-5 h-5 shrink-0 ${isPlaying ? 'text-emerald-600 animate-pulse' : 'text-emerald-500'}`}
                                            />
                                          ) : (
                                            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                                          )}
                                          <div className="min-w-0">
                                            <div
                                              className={`text-sm font-bold truncate ${isPlaying ? 'text-emerald-950' : isFree ? 'text-slate-900' : 'text-slate-600'}`}
                                            >
                                              الدرس{' '}
                                              {lesson.orderIndex ||
                                                lessonIndex + 1}
                                              : {lesson.title}
                                            </div>
                                            {lesson.videoDurationSeconds > 0 && (
                                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                                <span>
                                                  {formatLessonDurationArabic(
                                                    lesson.videoDurationSeconds,
                                                  )}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {isFree ? (
                                          <span
                                            className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                                              isPlaying
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'bg-emerald-100 text-emerald-800'
                                            }`}
                                          >
                                            {isPlaying
                                              ? 'جاري المشاهدة ▶'
                                              : 'معاينة مجانية ⚡'}
                                          </span>
                                        ) : (
                                          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md shrink-0">
                                            خاص بالمشتركين
                                          </span>
                                        )}
                                      </div>
                                    );
                                  },
                                )
                              ) : (
                                <p className="text-xs text-slate-400 text-center py-3">
                                  لا توجد دروس مضافة في هذه الوحدة بعد.
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-slate-500 text-sm font-medium">
                  لم يتم إضافة وحدات لهذا الكورس بعد.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
