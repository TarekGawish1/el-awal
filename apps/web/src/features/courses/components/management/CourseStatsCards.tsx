"use client";

import React from "react";

export interface CourseStatsCardsProps {
  totalCourses: number;
  publishedCourses: number;
  totalLessons: number;
  totalEnrollments: number;
}

export function CourseStatsCards({
  totalCourses,
  publishedCourses,
  totalLessons,
  totalEnrollments,
}: CourseStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p className="text-xs font-semibold text-slate-500">إجمالي الكورسات</p>
        <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalCourses}</p>
      </div>
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p className="text-xs font-semibold text-slate-500">الكورسات المنشورة</p>
        <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{publishedCourses}</p>
      </div>
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p className="text-xs font-semibold text-slate-500">إجمالي الدروس المصورة</p>
        <p className="text-2xl font-bold text-primary-600 mt-1 font-mono">{totalLessons}</p>
      </div>
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <p className="text-xs font-semibold text-slate-500">الاشتراكات والطلاب</p>
        <p className="text-2xl font-bold text-amber-600 mt-1 font-mono">{totalEnrollments}</p>
      </div>
    </div>
  );
}
