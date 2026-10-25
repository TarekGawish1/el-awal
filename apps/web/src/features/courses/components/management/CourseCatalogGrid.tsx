"use client";

import React from "react";
import { BookOpen } from "lucide-react";
import { CourseDetail } from "../../types/courses.types";
import { Skeleton } from "@/components/ui/Skeleton";
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col"
          >
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
                <Skeleton className="h-5 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
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
