'use client';

import React from 'react';
import {
  File,
  FileText,
  FileDown,
  Trash2,
  Edit2,
  Video,
  Play,
  Layers,
  BookOpen,
  Users,
  Sparkles,
} from 'lucide-react';
import { ContentType, EducationalContent } from '../../types/content.types';

interface ContentCardProps {
  content: EducationalContent;
  onPlayVideo: (content: EducationalContent) => void;
  onEdit: (content: EducationalContent) => void;
  onDelete: (id: string, title: string) => void;
  isDeleting: boolean;
}

export function ContentCard({
  content,
  onPlayVideo,
  onEdit,
  onDelete,
  isDeleting,
}: ContentCardProps) {
  const isVideo =
    content.contentType === ContentType.LECTURE_RECORDING ||
    content.fileKey?.startsWith('bunny:') ||
    content.mimeType?.startsWith('video/') ||
    content.fileUrl?.includes('mediadelivery.net') ||
    content.fileUrl?.includes('bunny');

  const getIcon = (type: ContentType) => {
    switch (type) {
      case ContentType.FILE:
        return <File className="w-7 h-7 text-blue-500" />;
      case ContentType.SUMMARY:
        return <FileText className="w-7 h-7 text-emerald-500" />;
      case ContentType.REFERENCE:
        return <BookOpen className="w-7 h-7 text-purple-500" />;
      case ContentType.LECTURE_RECORDING:
        return <Video className="w-7 h-7 text-rose-500" />;
      default:
        return <File className="w-7 h-7 text-slate-500" />;
    }
  };

  const getTypeLabel = (type: ContentType) => {
    switch (type) {
      case ContentType.FILE:
        return 'ملف / ملزمة';
      case ContentType.SUMMARY:
        return 'ملخص';
      case ContentType.REFERENCE:
        return 'مرجع / واجب';
      case ContentType.LECTURE_RECORDING:
        return 'تسجيل حصة (فيديو)';
      default:
        return 'ملف';
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'غير معروف';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
      <div>
        {/* Header & Icon */}
        <div className="flex items-start gap-3.5 mb-3">
          <div
            onClick={() => isVideo && onPlayVideo(content)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-105 transition-transform ${
              isVideo
                ? 'bg-rose-50 border-rose-100 text-rose-500 cursor-pointer'
                : 'bg-slate-50 border-slate-100 text-slate-500'
            }`}
          >
            {getIcon(content.contentType)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 text-base line-clamp-1 mb-1" title={content.title}>
              {content.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                {getTypeLabel(content.contentType)}
              </span>
              <span className="text-xs text-slate-400 font-medium">{formatFileSize(content.fileSize)}</span>
            </div>
          </div>
        </div>

        {/* Session Topic / Badge */}
        {content.sessionTopic && (
          <div className="mb-3 bg-amber-50/80 border border-amber-200/60 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-bold text-amber-800">
            <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">{content.sessionTopic}</span>
          </div>
        )}

        {/* Description */}
        {content.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{content.description}</p>
        )}

        {/* Badges: Grade Level & Target Groups */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {content.gradeLevel && (
            <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-500" />
              {content.gradeLevel}
            </span>
          )}

          {content.group ? (
            <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-500" />
              {content.group.name}
            </span>
          ) : content.gradeLevel ? (
            <span className="text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              كل مجموعات الصف
            </span>
          ) : null}

          {content.academicYear && (
            <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100">
              {content.academicYear} • {content.academicTerm === 'SECOND_TERM' ? 'ترم 2' : 'ترم 1'}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-2">
        {isVideo ? (
          <button
            onClick={() => onPlayVideo(content)}
            className="flex-1 flex items-center justify-center h-9 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-xl transition-colors text-xs gap-1.5 border border-rose-100 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            تشغيل ومشاهدة الحصة
          </button>
        ) : (
          <a
            href={content.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center h-9 bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold rounded-xl transition-colors text-xs gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            فتح وتحميل المرفق
          </a>
        )}
        <button
          onClick={() => onEdit(content)}
          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors border border-slate-200/80 cursor-pointer"
          title="تعديل المرفق"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(content.id, content.title)}
          disabled={isDeleting}
          className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          title="حذف الملف"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
