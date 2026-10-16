"use client";

import React from "react";
import Link from "next/link";
import { Video, Layers, Users, Edit, Settings2, Trash2 } from "lucide-react";
import { resolveCoverUrl } from "@/lib/utils/asset-url";
import { CourseDetail } from "../../types/courses.types";

export interface CourseCatalogCardProps {
  course: CourseDetail;
  onEditCourse: (course: CourseDetail) => void;
  onRequestDeleteCourse: (course: { id: string; title: string }) => void;
}

export function CourseCatalogCard({
  course,
  onEditCourse,
  onRequestDeleteCourse,
}: CourseCatalogCardProps) {
  const isPublished = course.status === "PUBLISHED";
  const modulesCount = course.modules?.length || 0;
  const lessonsCount = course.totalLessons || 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-primary-300 hover:shadow-md transition-all flex flex-col group shadow-sm">
      {/* Course Cover Image Banner */}
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {course.coverImageUrl ? (
          <img
            src={resolveCoverUrl(course.coverImageUrl)}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100 text-primary-600 p-4 text-center">
            <Video className="w-12 h-12 stroke-[1.5] mb-2 opacity-80" />
            <span className="text-xs font-bold text-slate-800">{course.subject}</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md bg-white/95 border border-slate-200 shadow-sm">
          {isPublished ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-700">منشور</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-amber-700">مسودة</span>
            </>
          )}
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md bg-white/95 border border-slate-200 text-slate-900 flex items-center gap-1 shadow-sm font-mono">
          {Number(course.price) > 0 ? (
            <>
              <span className="text-emerald-600">{course.price}</span>
              <span className="text-[10px] text-slate-500">ج.م</span>
            </>
          ) : (
            <span className="text-emerald-600 font-sans">مجاني</span>
          )}
        </div>
      </div>

      {/* Course Details Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-primary-600">{course.subject}</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500">{course.gradeLevel}</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
            {course.title}
          </h3>
          {course.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
              {course.description}
            </p>
          )}
        </div>

        {/* Metrics Bar */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary-600" />
            <span>{modulesCount} وحدات</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-primary-600" />
            <span>{lessonsCount} دروس</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <span>{course._count?.enrollments || 0} طالب</span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-2 flex items-center gap-2">
          <Link
            href={`/teacher/courses/${course.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>تعديل وبناء المنهج والاشتراكات</span>
          </Link>

          <button
            type="button"
            onClick={() => onEditCourse(course)}
            className="p-2.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 bg-white border border-slate-200 rounded-xl transition-colors shadow-sm"
            title="تعديل بيانات وإعدادات الكورس"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onRequestDeleteCourse({ id: course.id, title: course.title })}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-200 rounded-xl transition-colors shadow-sm"
            title="حذف الكورس"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
