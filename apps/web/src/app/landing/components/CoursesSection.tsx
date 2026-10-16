'use client';

import React, { useState, useMemo } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  PlayCircle,
  Lock,
  ChevronDown,
  X,
  BookOpen,
  Clock,
  Users,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { usePublicCatalog } from '@/hooks/usePublicContent';
import { resolveAssetUrl } from '@/lib/utils/asset-url';
import { formatLessonDurationArabic } from '@/features/courses/utils/video-optimizer';
import { API_BASE_URL } from '@/lib/api/endpoints';
import { toast } from 'react-hot-toast';

const COURSES = [
  {
    id: 1,
    title: "الصف الأول الثانوي",
    description:
      "شرح مبسط ومفصل لمنهج الرياضيات للصف الأول الثانوي مع تدريبات مكثفة وتطبيقات على النظام الجديد.",
    badge: "ترم أول",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: 2,
    title: "الصف الثاني الثانوي",
    description:
      "تأسيس قوي في التفاضل وحساب المثلثات والجبر مع حل أسئلة بنك المعرفة وامتحانات سابقة.",
    badge: "ترم أول",
    color: "from-indigo-500 to-purple-500",
  },
  {
    id: 3,
    title: "الصف الثالث الثانوي",
    description:
      "مراجعات نهائية وتدريبات متقدمة للثانوية العامة تضمن لك الدرجة النهائية في جميع فروع الرياضيات.",
    badge: "علمي رياضة",
    color: "from-emerald-500 to-teal-500",
  },
];

const STAGES = [
  { id: "ALL", label: "الكل" },
  { id: "SECONDARY", label: "ثانوي" },
  { id: "MIDDLE", label: "إعدادي" },
  { id: "PRIMARY", label: "ابتدائي" },
];

const GRADES: Record<string, string[]> = {
  SECONDARY: [
    "الصف الأول الثانوي",
    "الصف الثاني الثانوي",
    "الصف الثالث الثانوي",
  ],
  MIDDLE: [
    "الصف الأول الإعدادي",
    "الصف الثاني الإعدادي",
    "الصف الثالث الإعدادي",
  ],
  PRIMARY: ["الصف الخامس الابتدائي", "الصف السادس الابتدائي"],
};

export function CoursesSection() {
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [activePreviewLesson, setActivePreviewLesson] = useState<{
    id: string;
    title: string;
    videoUrl: string | null;
  } | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL");
  const [expandedModule, setExpandedModule] = useState<string | number | null>(
    null,
  );

  const { data: rawCatalog = [], isLoading } = usePublicCatalog({
    academicStage: selectedStage,
    gradeLevel: selectedGrade,
    limit: 20,
  });

  const courses: any[] = React.useMemo(() => {
    const list = Array.isArray(rawCatalog) ? rawCatalog : (rawCatalog as any)?.data || [];
    return list.map((c: any, index: number) => ({
      id: c.id,
      title: c.title,
      description:
        c.description ||
        "شرح مبسط ومفصل للمنهج مع تدريبات مكثفة وتطبيقات على أحدث نظام.",
      badge:
        c.academicTerm === "FIRST_TERM"
          ? "ترم أول"
          : c.academicTerm === "SECOND_TERM"
            ? "ترم ثاني"
            : "شامل",
      gradeLevel: c.gradeLevel,
      academicStage: c.academicStage,
      subject: c.subject || "الرياضيات",
      price: c.price !== undefined ? c.price : 150,
      coverImageUrl: c.coverImageUrl,
      teacherName: c.teacher?.user?.fullName || "أستاذ المادة",
      color:
        index % 3 === 0
          ? "from-blue-600 to-cyan-600"
          : index % 3 === 1
            ? "from-indigo-600 to-purple-600"
            : "from-emerald-600 to-teal-600",
      totalLessons: c.totalLessons || 0,
      totalModules: c.totalModules || c.modules?.length || 0,
      hasFreeVideo: c.hasFreeVideo,
      freeVideoLessonId: c.freeVideoLessonId,
      freeVideoUrl: c.freeVideoUrl,
      modules: c.modules || [],
    }));
  }, [rawCatalog]);

  const handleOpenCourseModal = (course: any) => {
    setSelectedCourse(course);
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
        id: course.freeVideoLessonId || "free-1",
        title: "معاينة الدرس المجاني",
        videoUrl: course.freeVideoUrl,
      };
    }
    setActivePreviewLesson(freeLesson);
    setExpandedModule(course.modules?.[0]?.id ?? 0);
  };

  return (
    <section
      className="py-24 bg-white relative overflow-hidden"
      id="courses"
      dir="rtl"
    >
      {/* Udemy-like Course Preview Modal */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto"
            onClick={() => setSelectedCourse(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              role="dialog"
              aria-modal="true"
              aria-label={`تفاصيل كورس ${selectedCourse.title}`}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-6 sm:p-8 flex items-start justify-between shrink-0 border-b border-slate-800">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5 mb-3">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      {selectedCourse.badge}
                    </span>
                    {selectedCourse.gradeLevel && (
                      <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
                        {selectedCourse.gradeLevel}
                      </span>
                    )}
                    {selectedCourse.subject && (
                      <span className="bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 text-xs font-semibold px-3 py-1 rounded-full">
                        مادة {selectedCourse.subject}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
                    {selectedCourse.title}
                  </h2>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                    {selectedCourse.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
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
                          key={
                            activePreviewLesson.id +
                            activePreviewLesson.videoUrl
                          }
                          src={`${activePreviewLesson.videoUrl}${activePreviewLesson.videoUrl.includes("?") ? "&" : "?"}autoplay=0`}
                          loading="lazy"
                          title={`مشغل فيديو ${activePreviewLesson.title || selectedCourse.title}`}
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
                        {selectedCourse.price} ج.م
                      </span>
                      <span className="text-sm font-semibold text-slate-400 line-through">
                        {Math.round(selectedCourse.price * 1.5)} ج.م
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
                            {selectedCourse.totalLessons || 0} درساً تعليمياً
                            مسجلاً
                          </span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>
                            {selectedCourse.totalModules ||
                              selectedCourse.modules?.length ||
                              0}{" "}
                            وحدات منهجية شاملة
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
                      {selectedCourse.modules?.length || 0} وحدات •{" "}
                      {selectedCourse.totalLessons || 0} درس
                    </span>
                  </div>

                  {selectedCourse.modules &&
                  selectedCourse.modules.length > 0 ? (
                    <div className="space-y-3.5">
                      {selectedCourse.modules.map(
                        (mod: any, moduleIndex: number) => {
                          const isExpanded =
                            expandedModule === (mod.id || moduleIndex);
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
                                    className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
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
                                    animate={{ height: "auto" }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-3 space-y-2 border-t border-slate-100 bg-slate-50/50">
                                      {mod.lessons && mod.lessons.length > 0 ? (
                                        mod.lessons.map(
                                          (
                                            lesson: any,
                                            lessonIndex: number,
                                          ) => {
                                            const isFree = Boolean(
                                              lesson.isPreview &&
                                              lesson.freeVideoUrl,
                                            );
                                            const isPlaying =
                                              activePreviewLesson?.id ===
                                              lesson.id;

                                            return (
                                              <div
                                                key={lesson.id || lessonIndex}
                                                onClick={() => {
                                                  if (isFree) {
                                                    setActivePreviewLesson({
                                                      id: lesson.id,
                                                      title: lesson.title,
                                                      videoUrl:
                                                        lesson.freeVideoUrl,
                                                    });
                                                    toast.success(
                                                      `تم تشغيل المعاينة المجانية: ${lesson.title}`,
                                                    );
                                                  } else {
                                                    toast(
                                                      "هذا الدرس متاح حصرياً للمشتركين في الكورس",
                                                      {
                                                        icon: "🔒",
                                                      },
                                                    );
                                                  }
                                                }}
                                                className={`flex items-center justify-between p-3.5 rounded-xl transition-all cursor-pointer ${
                                                  isPlaying
                                                    ? "bg-emerald-50/90 border-2 border-emerald-400 shadow-sm"
                                                    : isFree
                                                      ? "bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300"
                                                      : "bg-white/60 hover:bg-white border border-slate-100 opacity-75"
                                                }`}
                                              >
                                                <div className="flex items-center gap-3 min-w-0">
                                                  {isFree ? (
                                                    <PlayCircle
                                                      className={`w-5 h-5 shrink-0 ${isPlaying ? "text-emerald-600 animate-pulse" : "text-emerald-500"}`}
                                                    />
                                                  ) : (
                                                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                                                  )}
                                                  <div className="min-w-0">
                                                    <div
                                                      className={`text-sm font-bold truncate ${isPlaying ? "text-emerald-950" : isFree ? "text-slate-900" : "text-slate-600"}`}
                                                    >
                                                      الدرس{" "}
                                                      {lesson.orderIndex ||
                                                        lessonIndex + 1}
                                                      : {lesson.title}
                                                    </div>
                                                    {lesson.videoDurationSeconds > 0 && (
                                                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                                        <span>{formatLessonDurationArabic(lesson.videoDurationSeconds)}</span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                {isFree ? (
                                                  <span
                                                    className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                                                      isPlaying
                                                        ? "bg-emerald-600 text-white shadow-xs"
                                                        : "bg-emerald-100 text-emerald-800"
                                                    }`}
                                                  >
                                                    {isPlaying
                                                      ? "جاري المشاهدة ▶"
                                                      : "معاينة مجانية ⚡"}
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
                        },
                      )}
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
        )}
      </AnimatePresence>

      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute -top-[10%] right-[10%] w-[30%] h-[40%] rounded-full bg-blue-50 blur-[100px]" />
        <div className="absolute bottom-[10%] -left-[5%] w-[40%] h-[30%] rounded-full bg-indigo-50 blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              اكتشف{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                كورساتنا
              </span>
            </h2>
            <p className="text-slate-600 text-lg font-medium">
              اختر المرحلة الدراسية الخاصة بك وابدأ رحلة التفوق مع أقوى محتوى
              تعليمي في الرياضيات.
            </p>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="mb-12 flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            {STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => {
                  setSelectedStage(stage.id);
                  setSelectedGrade("ALL");
                }}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  selectedStage === stage.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {selectedStage !== "ALL" && GRADES[selectedStage] && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-wrap items-center justify-center gap-2"
              >
                <button
                  onClick={() => setSelectedGrade("ALL")}
                  className={`px-5 py-2 rounded-xl font-semibold text-sm transition-colors border ${
                    selectedGrade === "ALL"
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  جميع الصفوف
                </button>
                {GRADES[selectedStage].map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`px-5 py-2 rounded-xl font-semibold text-sm transition-colors border ${
                      selectedGrade === grade
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              لا توجد كورسات متاحة حالياً
            </h3>
            <p className="text-slate-500">
              لم يتم إضافة كورسات تطابق اختيارك في الوقت الحالي.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course: any, index: number) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all overflow-hidden flex flex-col"
              >
                {/* Course thumbnail with a gradient fallback */}
                <div
                  className={`h-48 w-full bg-gradient-to-br ${course.color || "from-blue-600 to-cyan-600"} relative overflow-hidden flex items-start justify-start p-6`}
                >
                  {course.coverImageUrl && (
                    <img
                      src={resolveAssetUrl(course.coverImageUrl)}
                      alt={course.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  {course.coverImageUrl && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/20" />
                  )}
                  <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay"></div>

                  {course.hasFreeVideo && course.freeVideoUrl ? (
                    <div
                      onClick={() => handleOpenCourseModal(course)}
                      className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer bg-black/15 group-hover:bg-black/35 transition-colors"
                    >
                      <div className="w-16 h-16 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <PlayCircle className="h-8 w-8 text-white ml-0.5" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute -bottom-6 -left-6 text-white/20 text-9xl font-black -rotate-12 pointer-events-none">
                      {index === 0 ? "∑" : index === 1 ? "∫" : "∞"}
                    </div>
                  )}

                  <div className="relative z-10 flex items-center gap-2">
                    <span className="bg-white/25 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-xs font-bold shadow-xs">
                      {course.badge}
                    </span>
                    {course.totalLessons > 0 && (
                      <span className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold">
                        {course.totalLessons} درس
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6 sm:p-7 flex-1 flex flex-col bg-white">
                  <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 font-medium">
                    {course.gradeLevel && <span>{course.gradeLevel}</span>}
                    {course.gradeLevel && course.teacherName && <span>•</span>}
                    {course.teacherName && <span>{course.teacherName}</span>}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2.5 leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                    {course.description}
                  </p>

                  <div className="flex items-baseline gap-2 mb-5 mt-auto pt-3 border-t border-slate-100">
                    <span className="text-2xl font-black text-slate-900">
                      {course.price} ج.م
                    </span>
                    <span className="text-xs font-semibold text-slate-400 line-through">
                      {Math.round(course.price * 1.5)} ج.م
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenCourseModal(course)}
                      className="hover:bg-emerald-50 flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-emerald-200 text-emerald-700 font-bold transition-colors group-hover:border-emerald-300 text-sm shadow-2xs"
                    >
                      <PlayCircle className="h-4 w-4" />
                      <span>
                        {course.hasFreeVideo
                          ? "شاهد المعاينة المجانية وتفاصيل المنهج"
                          : "عرض تفاصيل ومحتوى الكورس"}
                      </span>
                    </button>
                    <Link
                      href="/login"
                      className="hover:bg-blue-50 flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-slate-100 text-slate-700 font-bold transition-colors group-hover:border-blue-200 text-sm"
                    >
                      <span>اشترك الآن</span>
                      <ArrowRight className="h-4 w-4 rtl:rotate-180 text-blue-600 transition-transform group-hover:-translate-x-1" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}