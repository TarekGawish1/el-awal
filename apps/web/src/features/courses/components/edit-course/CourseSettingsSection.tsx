'use client';

import React from 'react';
import { Award, Plus, ExternalLink } from 'lucide-react';

interface CourseSettingsSectionProps {
  enforceSequentialLessons: boolean;
  setEnforceSequentialLessons: React.Dispatch<React.SetStateAction<boolean>>;
  hasCertificate: boolean;
  setHasCertificate: React.Dispatch<React.SetStateAction<boolean>>;
  courseQuizId: string;
  setCourseQuizId: (value: string) => void;
  assessments: any[];
}

export function CourseSettingsSection({
  enforceSequentialLessons,
  setEnforceSequentialLessons,
  hasCertificate,
  setHasCertificate,
  courseQuizId,
  setCourseQuizId,
  assessments,
}: CourseSettingsSectionProps) {
  return (
    <>
      {/* Sequential Order & Certificate Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="text-right">
            <label
              htmlFor="edit-course-sequential"
              className="block text-xs font-bold text-slate-800"
            >
              ترتيب مشاهدة الدروس
            </label>
            <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
              إلزام الطالب بإكمال كل درس بالترتيب قبل فتح الدرس التالي.
            </p>
          </div>
          <button
            id="edit-course-sequential"
            type="button"
            role="switch"
            aria-checked={enforceSequentialLessons}
            onClick={() => setEnforceSequentialLessons((v) => !v)}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
              enforceSequentialLessons ? 'bg-primary-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                enforceSequentialLessons ? 'translate-x-1' : 'translate-x-6'
              }`}
            />
          </button>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="text-right">
            <label
              htmlFor="edit-course-certificate"
              className="block text-xs font-bold text-slate-800"
            >
              إصدار شهادة إتمام
            </label>
            <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
              منح الطالب شهادة إلكترونية معتمدة عند إكمال الكورس.
            </p>
          </div>
          <button
            id="edit-course-certificate"
            type="button"
            role="switch"
            aria-checked={hasCertificate}
            onClick={() => setHasCertificate((v) => !v)}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
              hasCertificate ? 'bg-cyan-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                hasCertificate ? 'translate-x-1' : 'translate-x-6'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Final Quiz Linking */}
      <div className="p-4 bg-primary-50/50 border border-primary-100 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Award className="w-4 h-4 text-amber-500" />
          <label className="text-xs font-bold text-slate-800">
            ربط الاختبار النهائي الشامل للكورس
          </label>
        </div>
        {assessments.length === 0 ? (
          <div className="p-3 bg-white border border-dashed border-amber-300 rounded-xl text-center space-y-2">
            <p className="text-xs font-bold text-slate-800">لا توجد اختبارات منشأة حالياً</p>
            <a
              href="/teacher/assessments"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء اختبار جديد</span>
              <ExternalLink className="w-3 h-3 mr-0.5" />
            </a>
          </div>
        ) : (
          <select
            value={courseQuizId}
            onChange={(e) => setCourseQuizId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-xs cursor-pointer"
          >
            <option value="">-- بدون اختبار شامل حالياً --</option>
            {assessments.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.type === 'EXAM' ? 'امتحان شامل' : a.type === 'HOMEWORK' ? 'واجب' : 'اختبار قصير'} - {a.totalScore} درجة)
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  );
}
