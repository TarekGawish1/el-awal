'use client';

import React from 'react';
import { Paperclip, FileText, Download, ExternalLink, HardDrive } from 'lucide-react';
import { LessonAttachment } from '@/features/courses/types/courses.types';

interface LessonResourcesTabProps {
  attachments: LessonAttachment[];
  lessonTitle?: string;
}

export function LessonResourcesTab({ attachments, lessonTitle }: LessonResourcesTabProps) {
  if (!attachments || attachments.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-2 text-right shadow-sm">
        <Paperclip className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-xs text-slate-700 font-bold">لا توجد ملفات أو أوراق عمل مرفقة بهذا الدرس</p>
        <p className="text-[11px] text-slate-400">
          إذا كانت هناك مذكرات أو ملفات PDF خاصة بهذا الدرس، سيقوم المعلم بإرفاقها هنا.
        </p>
      </div>
    );
  }

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'ملف مستند';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(2)} ميجابايت`;
    }
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} كيلوبايت`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-right shadow-sm animate-in fade-in">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <Paperclip className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">المرفقات والتحميلات ({attachments.length})</h3>
            <p className="text-[11px] text-slate-500">مذكرات، أوراق عمل، وملفات تدريبية جاهزة للتحميل</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attachments.map((att) => (
          <a
            key={att.id}
            href={att.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 hover:border-primary-300 hover:bg-white rounded-xl transition-all group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0 border border-primary-100">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 truncate max-w-[180px] sm:max-w-[200px]">
                  {att.title}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatFileSize(att.fileSize)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-primary-600 font-bold">
              <span>تحميل</span>
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-500 group-hover:text-primary-600 group-hover:border-primary-200 flex items-center justify-center transition-colors">
                <Download className="w-4 h-4" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
