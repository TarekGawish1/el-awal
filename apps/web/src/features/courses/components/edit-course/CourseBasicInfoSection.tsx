'use client';

import React from 'react';
import { Layers, GraduationCap, Calendar } from 'lucide-react';
import {
  STAGE_GRADES,
  COMMON_SUBJECTS,
} from '../../hooks/useEditCourseModalState';

interface CourseBasicInfoSectionProps {
  title: string;
  setTitle: (value: string) => void;
  academicStage: string;
  handleStageChange: (newStage: string) => void;
  gradeLevel: string;
  setGradeLevel: (value: string) => void;
  subject: string;
  setSubject: (value: string) => void;
  academicTerm: string;
  setAcademicTerm: (value: string) => void;
  academicYear: string;
  setAcademicYear: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}

export function CourseBasicInfoSection({
  title,
  setTitle,
  academicStage,
  handleStageChange,
  gradeLevel,
  setGradeLevel,
  subject,
  setSubject,
  academicTerm,
  setAcademicTerm,
  academicYear,
  setAcademicYear,
  description,
  setDescription,
}: CourseBasicInfoSectionProps) {
  return (
    <>
      {/* Course Title */}
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1.5">
          اسم الكورس <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: شرح تفاضل وحساب مثلثات 2ث"
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs"
          required
        />
      </div>

      {/* Academic Stage & Grade Level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary-600" />
            <span>المرحلة الدراسية</span>
          </label>
          <select
            value={academicStage}
            onChange={(e) => handleStageChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs cursor-pointer"
          >
            <option value="المرحلة الثانوية">المرحلة الثانوية</option>
            <option value="المرحلة الإعدادية">المرحلة الإعدادية</option>
            <option value="المرحلة الابتدائية">المرحلة الابتدائية</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-primary-600" />
            <span>الصف الدراسي</span>
          </label>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs cursor-pointer"
          >
            {(STAGE_GRADES[academicStage] || STAGE_GRADES['المرحلة الثانوية']).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject & Term */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            المادة الدراسية
          </label>
          <input
            type="text"
            list="common-subjects-list"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="مثال: الرياضيات"
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs"
          />
          <datalist id="common-subjects-list">
            {COMMON_SUBJECTS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            الفصل الدراسي
          </label>
          <select
            value={academicTerm}
            onChange={(e) => setAcademicTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs cursor-pointer"
          >
            <option value="FIRST_TERM">الترم الأول</option>
            <option value="SECOND_TERM">الترم الثاني</option>
            <option value="FULL_YEAR">العام بالكامل</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>السنة الدراسية</span>
          </label>
          <input
            type="text"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="2026-2027"
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs font-mono"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-slate-800 mb-1.5">
          نبذة ووصف الكورس
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="اكتب نبذة تشرح محتوى ومميزات هذا الكورس للطلاب..."
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs leading-relaxed"
        />
      </div>
    </>
  );
}
