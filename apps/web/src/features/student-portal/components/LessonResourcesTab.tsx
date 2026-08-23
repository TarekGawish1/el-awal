'use client';

import React from 'react';
import { Paperclip, Download, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { LessonAttachment } from '@/features/courses/types/courses.types';

interface LessonResourcesTabProps {
  attachments?: LessonAttachment[];
  lessonTitle: string;
}

export function LessonResourcesTab({
  attachments = [],
  lessonTitle,
}: LessonResourcesTabProps) {
  if (!attachments || attachments.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-2 text-right shadow-sm">
        <Paperclip className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">لا توجد ملفات أو أوراق عمل مرفقة بهذا الدرس</p>
        <p className="text-[11px] text-slate-400">سيتم إضافة أوراق الشرح والواجبات من قبل المعلم فور توفرها.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4 text-right shadow-sm animate-in fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
            <Paperclip className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">المرفقات والتحميلات ({attachments.length})</h3>
            <p className="text-[11px] text-slate-400">ملفات PDF وأوراق الشرح والتمارين الخاصة بالدرس</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {attachments.map((att: LessonAttachment) => (
          <div
            key={att.id}
            className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 rounded-2xl transition-all group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0 border border-rose-100 dark:border-rose-800/40">
                PDF
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-[200px]">
                  {att.title}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {att.fileSize ? `${(att.fileSize / (1024 * 1024)).toFixed(2)} ميجابايت` : 'ملف PDF جاهز للطباعة'}
                </p>
              </div>
            </div>

            <a
              href={att.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
