'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import NextImage from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { usePublicCatalog } from '@/hooks/usePublicContent';
import { resolveAssetUrl, isOptimizableImage } from '@/lib/utils/asset-url';

const CoursePreviewModal = dynamic(
  () => import('./CoursePreviewModal').then((mod) => mod.CoursePreviewModal),
  { ssr: false }
);


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
  { id: "PREPARATORY", label: "إعدادي" },
  { id: "PRIMARY", label: "ابتدائي" },
];

const GRADES: Record<string, string[]> = {
  SECONDARY: [
    "الصف الأول الثانوي",
    "الصف الثاني الثانوي",
    "الصف الثالث الثانوي",
  ],
  PREPARATORY: [
    "الصف الأول الإعدادي",
    "الصف الثاني الإعدادي",
    "الصف الثالث الإعدادي",
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
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL");

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
  };

  return (
    <section
      className="py-24 bg-white relative overflow-hidden"
      id="courses"
      dir="rtl"
    >
      {/* Course Preview Modal */}
      <AnimatePresence>
        {selectedCourse && (
          <CoursePreviewModal
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
          />
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

        {isLoading && courses.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" aria-busy="true" aria-label="جاري تحميل الكورسات">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col animate-pulse"
              >
                {/* Thumbnail Skeleton */}
                <div className="h-48 w-full bg-slate-200/80 relative p-6 flex items-start justify-start">
                  <div className="h-6 w-20 bg-slate-300/80 rounded-full" />
                </div>
                {/* Content Skeleton */}
                <div className="p-6 sm:p-7 flex-1 flex flex-col">
                  {/* Grade & Teacher */}
                  <div className="h-4 bg-slate-200/80 rounded-md w-1/3 mb-3" />
                  {/* Title */}
                  <div className="h-7 bg-slate-200 rounded-lg w-3/4 mb-3" />
                  {/* Description lines */}
                  <div className="space-y-2 mb-6 flex-1">
                    <div className="h-4 bg-slate-200/60 rounded-md w-full" />
                    <div className="h-4 bg-slate-200/60 rounded-md w-4/5" />
                  </div>
                  {/* Price & Action Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                    <div className="h-7 bg-slate-200 rounded-lg w-20" />
                    <div className="h-10 bg-slate-200/90 rounded-xl w-28" />
                  </div>
                </div>
              </div>
            ))}
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
                    <NextImage
                      src={resolveAssetUrl(course.coverImageUrl)}
                      alt={course.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={!isOptimizableImage(resolveAssetUrl(course.coverImageUrl))}
                      className="object-cover"
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