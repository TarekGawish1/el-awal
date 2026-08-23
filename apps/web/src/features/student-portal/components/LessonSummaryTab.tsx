'use client';

import React from 'react';
import { FileText, Sparkles, BookOpen } from 'lucide-react';

interface LessonSummaryTabProps {
  summary?: string | null;
  description?: string | null;
  lessonTitle: string;
}

export function LessonSummaryTab({
  summary,
  description,
  lessonTitle,
}: LessonSummaryTabProps) {
  if (!summary && !description) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2 text-right">
        <FileText className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-xs text-slate-400 font-bold">لا يوجد ملخص نصي متاح لهذا الدرس</p>
        <p className="text-[11px] text-slate-500">تابع شرح الفيديو وتدوين ملاحظاتك أثناء المشاهدة.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-right shadow-lg">
      <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">ملخص وملاحظات: {lessonTitle}</h3>
          <p className="text-[11px] text-slate-400">القوانين، القواعد والنقاط الهامة التي تم شرحها</p>
        </div>
      </div>

      {description && (
        <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-indigo-400 block mb-1">أهداف الدرس:</span>
          {description}
        </div>
      )}

      {summary && (
        <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
          {summary}
        </div>
      )}
    </div>
  );
}
