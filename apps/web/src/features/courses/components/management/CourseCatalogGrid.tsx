"use client";

import React from "react";
import { BookOpen } from "lucide-react";
import { CourseDetail } from "../../types/courses.types";
import { CourseCatalogCard } from "./CourseCatalogCard";

export interface CourseCatalogGridProps {
  isLoading: boolean;
  filteredCourses: CourseDetail[];
  onEditCourse: (course: CourseDetail) => void;
  onRequestDeleteCourse: (course: { id: string; title: string }) => void;
}

export function CourseCatalogGrid({
  isLoading,
  filteredCourses,
  onEditCourse,
  onRequestDeleteCourse,
}: CourseCatalogGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (filteredCourses.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
        <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">لا توجد كورسات مطابقة للبحث</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          قم بإنشاء كورس جديد لإضافة شروحات الفيديو والملخصات والاختبارات التفاعلية لطلابك.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredCourses.map((c: CourseDetail) => (
        <CourseCatalogCard
          key={c.id}
          course={c}
          onEditCourse={onEditCourse}
          onRequestDeleteCourse={onRequestDeleteCourse}
        />
      ))}
    </div>
  );
}
