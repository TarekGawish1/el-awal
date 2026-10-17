"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface CertificateFilterBarProps {
  selectedStage: string;
  setSelectedStage: (value: string) => void;
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  selectedGrade: string;
  setSelectedGrade: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  stages: string[];
  years: string[];
  grades: string[];
}

export function CertificateFilterBar({
  selectedStage,
  setSelectedStage,
  selectedYear,
  setSelectedYear,
  selectedGrade,
  setSelectedGrade,
  searchTerm,
  setSearchTerm,
  stages,
  years,
  grades,
}: CertificateFilterBarProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="certificate-stage"
            className="text-xs font-bold text-slate-400"
          >
            المرحلة الدراسية:
          </label>
          <select
            id="certificate-stage"
            value={selectedStage}
            onChange={(event) => setSelectedStage(event.target.value)}
            className="min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          >
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage === "الكل" ? "كل المراحل" : stage}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="certificate-year"
            className="text-xs font-bold text-slate-400"
          >
            السنة الدراسية:
          </label>
          <select
            id="certificate-year"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="min-w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year === "الكل" ? "كل السنوات" : year}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="certificate-grade"
            className="text-xs font-bold text-slate-400"
          >
            الصف الدراسي:
          </label>
          <select
            id="certificate-grade"
            value={selectedGrade}
            onChange={(event) => setSelectedGrade(event.target.value)}
            className="min-w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          >
            {grades.map((grade) => (
              <option key={grade} value={grade}>
                {grade === "الكل" ? "كل الصفوف" : grade}
              </option>
            ))}
          </select>
        </div>
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pr-10"
            placeholder="ابحث عن اسم الطالب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
