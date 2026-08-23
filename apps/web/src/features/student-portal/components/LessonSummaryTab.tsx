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
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-2 text-right shadow-sm">
        <FileText className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">لا يوجد ملخص نصي متاح لهذا الدرس</p>
        <p className="text-[11px] text-slate-400">تابع شرح الفيديو وتدوين ملاحظاتك أثناء المشاهدة.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 text-right shadow-sm animate-in fade-in">
      <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">ملخص وملاحظات: {lessonTitle}</h3>
          <p className="text-[11px] text-slate-400">القوانين، القواعد والنقاط الهامة التي تم شرحها</p>
        </div>
      </div>

      {description && (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">أهداف الدرس:</span>
          {description}
        </div>
      )}

      {summary && (
        <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60">
          {summary}
        </div>
      )}
    </div>
  );
}
