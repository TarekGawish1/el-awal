"use client";

import React from "react";

export interface LessonSettingsSectionProps {
  summary: string;
  setSummary: (val: string) => void;
}

export function LessonSettingsSection({
  summary,
  setSummary,
}: LessonSettingsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800">
          ملخص الدرس وملاحظات المذاكرة
        </label>
        <span className="text-[11px] text-primary-600">
          يدعم تنسيق العناوين والنقاط
        </span>
      </div>
      <textarea
        rows={10}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="اكتب هنا القوانين الهامة، الملاحظات الإعرابية، ملخص القواعد ونقاط التميز ليقرأها الطالب أسفل مشغل الفيديو..."
        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs font-sans text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm leading-relaxed"
      />
      <p className="text-[11px] text-slate-500">
        يظهر هذا الملخص في تبويب 📖 &quot;ملخص الدرس والملاحظات&quot; للطالب أثناء
        مشاهدة الشرح.
      </p>
    </div>
  );
}
