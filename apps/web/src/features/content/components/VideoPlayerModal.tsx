'use client';

import React from 'react';
import { X, Video, BookOpen, Layers } from 'lucide-react';
import { EducationalContent } from '../types/content.types';

interface VideoPlayerModalProps {
  isOpen: boolean;
  content: EducationalContent | null;
  onClose: () => void;
}

export function VideoPlayerModal({ isOpen, content, onClose }: VideoPlayerModalProps) {
  if (!isOpen || !content) return null;

  const isBunnyVideo =
    content.fileKey?.startsWith('bunny:') ||
    content.fileUrl?.includes('mediadelivery.net') ||
    content.fileUrl?.includes('bunny');

  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden my-auto border border-slate-800 flex flex-col text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold shrink-0 border border-rose-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate" title={content.title}>
                {content.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                {content.gradeLevel && (
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-500" />
                    {content.gradeLevel}
                  </span>
                )}
                {content.sessionTopic && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <BookOpen className="w-3 h-3" />
                      {content.sessionTopic}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Container (16:9 responsive aspect ratio) */}
        <div className="relative w-full bg-black aspect-video flex items-center justify-center">
          {isBunnyVideo ? (
            <iframe
              src={
                content.fileUrl.includes('?')
                  ? `${content.fileUrl}&autoplay=true&preload=true`
                  : `${content.fileUrl}?autoplay=true&preload=true`
              }
              loading="lazy"
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
              allowFullScreen
              title={content.title}
            />
          ) : (
            <video
              src={content.fileUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            >
              متصفحك لا يدعم تشغيل الفيديو.
            </video>
          )}
        </div>

        {/* Footer info & description */}
        {content.description && (
          <div className="p-4 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
            <p className="font-semibold text-slate-400 mb-1">تفاصيل وملاحظات الحصة:</p>
            <p>{content.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
