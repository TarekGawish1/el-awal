'use client';

import React from 'react';
import { FileText, BookOpen, Sparkles } from 'lucide-react';

interface LessonSummaryTabProps {
  summary?: string | null;
  lessonTitle: string;
  description?: string | null;
}

export function LessonSummaryTab({ summary, lessonTitle, description }: LessonSummaryTabProps) {
  if (!summary && !description) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-2 text-right shadow-sm">
        <FileText className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-xs text-slate-700 font-bold">لا يوجد ملخص نصي متاح لهذا الدرس</p>
        <p className="text-[11px] text-slate-400">
          تابع شرح المعلم في الفيديو وراجع المرفقات والأسئلة لتعزيز استيعابك.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-right shadow-sm animate-in fade-in">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">ملخص وملاحظات: {lessonTitle}</h3>
          <p className="text-[11px] text-slate-500">أهم القواعد، النقاط الأساسية، والملاحظات المستفادة</p>
        </div>
      </div>

      {description && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
          <span className="font-bold text-primary-600 block mb-1">أهداف الدرس:</span>
          {description}
        </div>
      )}

      {summary && (
        <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/50 p-5 rounded-2xl border border-slate-200">
          {summary}
        </div>
      )}
    </div>
  );
}
