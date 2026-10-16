"use client";

import React from "react";
import Link from "next/link";
import { Award, Lock, Plus, ExternalLink, Edit, Trash2 } from "lucide-react";

export interface CourseSettingsBarProps {
  course: any;
  courseId: string;
  examAssessments: any[];
  onUpdateCourseQuiz: (courseQuizId: string) => Promise<void>;
  onUpdateSequentialLessons: (enabled: boolean) => void;
  onUpdateCertificate: (enabled: boolean) => void;
  onRequestDeleteAssessment: (assessment: {
    id: string;
    title: string;
    type: "EXAM";
    scope: "course";
  }) => void;
  isUpdatingCourse: boolean;
}

export function CourseSettingsBar({
  course,
  courseId,
  examAssessments,
  onUpdateCourseQuiz,
  onUpdateSequentialLessons,
  onUpdateCertificate,
  onRequestDeleteAssessment,
  isUpdatingCourse,
}: CourseSettingsBarProps) {
  return (
    <div className="space-y-4">
      {/* Assessment Banner: Course Final Exam */}
      <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
            <Award className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                الامتحان الشامل للكورس
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 break-words">
              {course.courseQuiz ? course.courseQuiz.title : "لم يتم تعيين امتحان نهائي للكورس بعد"}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {course.courseQuiz
                ? `إجمالي الدرجات: ${course.courseQuiz.totalScore} درجة • تقييم ختامي للمنهج`
                : "يمكنك ربط امتحان شامل يقيمه الطالب بعد إنهاء جميع فصول ودروس الكورس."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
          <select
            value={course.courseQuizId || ""}
            onChange={(e) => onUpdateCourseQuiz(e.target.value)}
            className="flex-1 sm:w-64 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm cursor-pointer"
          >
            <option value="">-- بدون امتحان شامل --</option>
            {examAssessments.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.type === "EXAM" ? "امتحان" : "واجب"} - {a.totalScore} درجة)
              </option>
            ))}
          </select>
          {course.courseQuizId ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href={`/teacher/assessments/${course.courseQuizId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 whitespace-nowrap"
                title="تعديل تفاصيل وأسئلة الامتحان الشامل"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>تعديل الأسئلة</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </Link>
              <button
                type="button"
                onClick={() =>
                  onRequestDeleteAssessment({
                    id: course.courseQuizId!,
                    title: course.courseQuiz?.title || "الامتحان الشامل للكورس",
                    type: "EXAM",
                    scope: "course",
                  })
                }
                className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
                title="إلغاء ربط أو حذف امتحان الكورس"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href={`/teacher/assessments/new?type=EXAM&courseId=${courseId}&courseName=${encodeURIComponent(course.title)}&scope=COURSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 whitespace-nowrap"
              title="إنشاء امتحان شامل جديد لهذا الكورس وربطه تلقائياً"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء امتحان</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </Link>
          )}
        </div>
      </div>

      {/* Course Settings: Sequential Lessons Enforcement */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold text-slate-900">ترتيب مشاهدة الدروس</p>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {course.enforceSequentialLessons
                  ? "المنهج مرتب — يجب إتمام كل درس بالترتيب"
                  : "حرية المشاهدة — يمكن للطالب المشاهدة بأي ترتيب"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onUpdateSequentialLessons(!course.enforceSequentialLessons)}
            disabled={isUpdatingCourse}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
              course.enforceSequentialLessons
                ? "bg-primary-600 border-primary-600"
                : "bg-slate-200 border-slate-200"
            }`}
            role="switch"
            aria-checked={course.enforceSequentialLessons ?? false}
            title={course.enforceSequentialLessons ? "إلغاء التسلسل الإلزامي" : "تفعيل التسلسل الإلزامي"}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out mt-0.5 ${
                course.enforceSequentialLessons ? "-translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Certificate Toggle */}
      <div className="bg-white border border-cyan-100 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-3 sm:gap-4 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-100 shrink-0">
            <Award className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-slate-900">شهادة إتمام الكورس</p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {course.hasCertificate !== false
                ? "سيحصل الطالب على شهادة عند إكمال جميع الدروس"
                : "لن يتم إصدار شهادة لهذا الكورس"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onUpdateCertificate(course.hasCertificate === false)}
          disabled={isUpdatingCourse}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
            course.hasCertificate !== false ? "bg-cyan-600 border-cyan-600" : "bg-slate-200 border-slate-200"
          }`}
          role="switch"
          aria-checked={course.hasCertificate !== false}
          title={course.hasCertificate !== false ? "إلغاء إصدار الشهادة" : "تفعيل إصدار الشهادة"}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out mt-0.5 ${
              course.hasCertificate !== false ? "-translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
