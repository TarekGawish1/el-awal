'use client';

import React from 'react';
import { 
  FileText, FileDown, Play, UploadCloud, BookOpen,
  Image as ImageIcon, Video as VideoIcon, Music
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LessonSessionItem } from '../../types/schedules.types';

interface SessionAttachmentsSectionProps {
  session: LessonSessionItem;
  onUploadAttachment: (session: LessonSessionItem) => void;
  onClose: () => void;
  onPlayVideo: (content: any) => void;
}

export function SessionAttachmentsSection({
  session,
  onUploadAttachment,
  onClose,
  onPlayVideo,
}: SessionAttachmentsSectionProps) {
  const getContentTypeIcon = (type?: string, mime?: string | null) => {
    if (type === 'LECTURE_RECORDING' || mime?.startsWith('video/')) {
      return <VideoIcon className="w-4 h-4 text-purple-600" />;
    }
    if (mime?.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-emerald-600" />;
    }
    if (mime?.startsWith('audio/')) {
      return <Music className="w-4 h-4 text-amber-600" />;
    }
    return <FileText className="w-4 h-4 text-blue-600" />;
  };

  const isBunnyVideo = (item: any) => {
    return item.fileKey?.startsWith('bunny:') || item.fileUrl?.includes('iframe.mediadelivery.net');
  };

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-primary-600" />
          المذكرات والمرفقات والفيديوهات المرتبطة بالحصة
        </h3>
      </div>

      {session.educationalContents && session.educationalContents.length > 0 ? (
        <div className="space-y-2">
          {session.educationalContents.map((content) => (
            <div
              key={content.id}
              className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-primary-200 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  {getContentTypeIcon(content.contentType, content.mimeType)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-primary-700 transition-colors">
                    {content.title}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {content.fileSize ? `${(content.fileSize / (1024 * 1024)).toFixed(1)} MB • ` : ''}
                    {content.contentType === 'LECTURE_RECORDING' ? 'فيديو محاضرة' : 'مستند ومذكرة'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isBunnyVideo(content) ? (
                  <button
                    type="button"
                    onClick={() => onPlayVideo(content)}
                    className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                    مشاهدة
                  </button>
                ) : (
                  <a
                    href={content.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-primary-50 text-slate-700 hover:text-primary-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    تحميل
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-dashed border-slate-200 text-center bg-slate-50/50 space-y-1.5">
          <p className="text-xs font-bold text-slate-600">لا توجد مذكرات أو ملفات مرفوعة لهذه الحصة بعد</p>
          <p className="text-[11px] text-slate-400">
            يمكنك رفع مذكرة الشرح، الواجب المنزلي، أو تسجيل فيديو الحصة مباشرة
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onClose();
              onUploadAttachment(session);
            }}
            className="mt-1 text-xs"
          >
            <UploadCloud className="w-3.5 h-3.5 ml-1.5" />
            رفع ملزمة أو فيديو للحصة
          </Button>
        </div>
      )}
    </div>
  );
}
