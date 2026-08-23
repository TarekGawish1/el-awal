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
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2 text-right">
        <Paperclip className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-xs text-slate-400 font-bold">لا توجد ملفات أو أوراق عمل مرفقة بهذا الدرس</p>
        <p className="text-[11px] text-slate-500">سيتم إضافة أوراق الشرح والواجبات من قبل المعلم فور توفرها.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-right shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Paperclip className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">المرفقات والتحميلات ({attachments.length})</h3>
            <p className="text-[11px] text-slate-400">ملفات PDF وأوراق الشرح والتمارين الخاصة بالدرس</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {attachments.map((att: LessonAttachment) => (
          <div
            key={att.id}
            className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0 border border-rose-500/20">
                PDF
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-[200px]">
                  {att.title}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {att.fileSize ? `${(att.fileSize / (1024 * 1024)).toFixed(2)} ميجابايت` : 'ملف PDF جاهز للطباعة'}
                </p>
              </div>
            </div>

            <a
              href={att.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
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
