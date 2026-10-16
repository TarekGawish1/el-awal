"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Award,
  Users,
  Eye,
  Settings2,
  Sparkles,
  CreditCard,
  Edit,
  Play,
  Lock,
  Globe,
} from "lucide-react";

export interface CourseBuilderHeaderProps {
  course: any;
  onEditCourse: () => void;
  onOpenPromoPreview: () => void;
  onOpenGroupAccess: () => void;
  onTogglePublish: () => void;
  isPublishPending: boolean;
}

export function CourseBuilderHeader({
  course,
  onEditCourse,
  onOpenPromoPreview,
  onOpenGroupAccess,
  onTogglePublish,
  isPublishPending,
}: CourseBuilderHeaderProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
      {/* Top Accent Gradient Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 via-indigo-600 to-emerald-500" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Right Section: Navigation & Course Metadata */}
        <div className="flex items-start gap-4">
          <Link
            href="/teacher/courses"
            className="w-11 h-11 rounded-2xl bg-slate-50 hover:bg-primary-50 hover:text-primary-600 text-slate-600 flex items-center justify-center transition-all shrink-0 border border-slate-200/80 shadow-2xs group cursor-pointer"
            title="العودة إلى قائمة الكورسات"
          >
            <ArrowRight className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </Link>

          <div className="space-y-2">
            {/* Badges Pill Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-primary-50 text-primary-700 border border-primary-100/80">
                <BookOpen className="w-3.5 h-3.5 text-primary-600" />
                <span>{course.subject}</span>
              </span>

              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                {course.gradeLevel}
              </span>

              {course.academicStage && (
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {course.academicStage}
                </span>
              )}

              {/* Status Badge with Live Indicator */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                  course.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    course.status === "PUBLISHED" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span>{course.status === "PUBLISHED" ? "منشور أونلاين" : "مسودة قيد التجهيز"}</span>
              </span>

              {/* Price Badge */}
              {Number(course.price) === 0 ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>كورس مجاني 🎁</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white font-mono shadow-2xs">
                  <CreditCard className="w-3.5 h-3.5 text-slate-300" />
                  <span>{course.price} ج.م</span>
                </span>
              )}

              {course.hasCertificate && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>شهادة إتمام</span>
                </span>
              )}
            </div>

            {/* Title & Quick Edit */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {course.title}
              </h1>
              <button
                type="button"
                onClick={onEditCourse}
                className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-primary-200"
                title="تعديل اسم وبيانات الكورس"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            {course.description && (
              <p className="text-xs text-slate-500 line-clamp-1 max-w-2xl">
                {course.description}
              </p>
            )}
          </div>
        </div>

        {/* Left Section: Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-center justify-start lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
          <button
            type="button"
            onClick={onEditCourse}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
          >
            <Settings2 className="w-4 h-4 text-slate-600" />
            <span>تعديل الكورس</span>
          </button>

          {course.previewVideoUrl && (
            <button
              type="button"
              onClick={onOpenPromoPreview}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all border border-emerald-200/80 cursor-pointer shadow-2xs"
              title="معاينة الفيديو التعريفي (البرومو) للكورس"
            >
              <Play className="w-4 h-4 fill-emerald-600 text-emerald-600" />
              <span>معاينة البرومو 🎬</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenGroupAccess}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>المجموعات ({course.groupAccess?.length || 0})</span>
          </button>

          <Link
            href={`/teacher/courses/${course.id}/preview`}
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-200/60 cursor-pointer shadow-2xs"
          >
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>معاينة كطالب</span>
          </Link>

          <button
            type="button"
            onClick={onTogglePublish}
            disabled={isPublishPending}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              course.status === "PUBLISHED"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-primary-600 hover:bg-primary-700 text-white"
            }`}
          >
            {course.status === "PUBLISHED" ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            <span>{course.status === "PUBLISHED" ? "تحويل لمسودة" : "نشر الكورس أونلاين"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
