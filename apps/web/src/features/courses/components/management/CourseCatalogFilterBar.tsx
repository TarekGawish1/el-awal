"use client";

import React from "react";
import { Search } from "lucide-react";

export interface CourseCatalogFilterBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedGrade: string;
  setSelectedGrade: (grade: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
}

export function CourseCatalogFilterBar({
  searchTerm,
  setSearchTerm,
  selectedGrade,
  setSelectedGrade,
  selectedStatus,
  setSelectedStatus,
}: CourseCatalogFilterBarProps) {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row gap-3 items-center shadow-sm">
      <div className="relative flex-1 w-full">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث باسم الكورس أو المادة الدراسية..."
          className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
      </div>

      <select
        value={selectedGrade}
        onChange={(e) => setSelectedGrade(e.target.value)}
        className="w-full sm:w-48 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm cursor-pointer"
      >
        <option value="ALL">جميع المراحل والصفوف</option>
        <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
        <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
        <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
        <option value="الصف الأول الإعدادي">الصف الأول الإعدادي</option>
        <option value="الصف الثاني الإعدادي">الصف الثاني الإعدادي</option>
        <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
      </select>

      <select
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value)}
        className="w-full sm:w-40 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm cursor-pointer"
      >
        <option value="ALL">جميع الحالات</option>
        <option value="PUBLISHED">منشور أونلاين</option>
        <option value="DRAFT">مسودة</option>
      </select>
    </div>
  );
}
