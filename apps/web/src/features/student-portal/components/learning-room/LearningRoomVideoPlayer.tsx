'use client';

import React from 'react';
import {
  Video,
  CheckCircle2,
  AlertCircle,
  EyeOff,
} from 'lucide-react';

export interface LearningRoomVideoPlayerProps {
  videoContainerRef: React.RefObject<HTMLDivElement | null>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isLessonLoading: boolean;
  isStreamAuthLoading: boolean;
  streamAuth: any;
  lessonViewer: any;
  activeModuleTitle?: string;
  activeLessonTitle?: string;
  activeLessonPreview?: boolean;
  isLessonCompleted: boolean;
  isMarkingComplete: boolean;
  onToggleComplete: () => void;
  onRefetchStreamAuth: () => void;
  onInitIframePlayer: () => void;
  onVideoProgressOrEnd: (seconds?: number, duration?: number) => void;
  isObscured: boolean;
  setIsObscured: (val: boolean) => void;
  watermarkPos: { top: number; left: number };
}

function getPausedEmbedUrl(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set('autoplay', 'false');
    return url.toString();
  } catch {
    return `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=false`;
  }
}

export function LearningRoomVideoPlayer({
  videoContainerRef,
  iframeRef,
  videoRef,
  isLessonLoading,
  isStreamAuthLoading,
  streamAuth,
  lessonViewer,
  activeModuleTitle,
  activeLessonTitle,
  activeLessonPreview,
  isLessonCompleted,
  isMarkingComplete,
  onToggleComplete,
  onRefetchStreamAuth,
  onInitIframePlayer,
  onVideoProgressOrEnd,
  isObscured,
  setIsObscured,
  watermarkPos,
}: LearningRoomVideoPlayerProps) {
  return (
    <div
      ref={videoContainerRef}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
    >
      <div
        className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center select-none"
        style={{ aspectRatio: '16 / 9', width: '100%' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isLessonLoading || isStreamAuthLoading ? (
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
            <span className="text-xs font-mono text-slate-300">
              جاري فك التشفير وتجهيز البث الآمن...
            </span>
          </div>
        ) : streamAuth?.videoStatus === 'PROCESSING' ? (
          <div className="flex flex-col items-center gap-3 text-white p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
            <p className="text-sm font-bold text-amber-300">الفيديو قيد المعالجة السحابية</p>
            <p className="text-xs text-slate-400 max-w-sm">
              نقوم حالياً بتهيئة الفيديو وتوليد الجودات المتعددة لضمان أفضل تجربة مشاهدة. ستعمل المعاينة تلقائياً فور انتهاء المعالجة.
            </p>
            <button
              type="button"
              onClick={onRefetchStreamAuth}
              className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700 cursor-pointer"
            >
              تحديث حالة الفيديو
            </button>
          </div>
        ) : streamAuth?.embedUrl ? (
          <iframe
            ref={iframeRef}
            id="bunny-stream-embed"
            src={getPausedEmbedUrl(streamAuth.embedUrl)}
            loading="lazy"
            onLoad={onInitIframePlayer}
            className={`w-full h-full border-0 absolute inset-0 block transition-opacity duration-300 ${
              isObscured ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            style={{ width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; gyroscope; encrypted-media; picture-in-picture;"
            allowFullScreen
          />
        ) : lessonViewer?.contentUrl ? (
          <video
            ref={videoRef}
            src={lessonViewer.contentUrl}
            playsInline
            controls
            controlsList="nodownload"
            onEnded={() => onVideoProgressOrEnd()}
            onTimeUpdate={(e) =>
              onVideoProgressOrEnd(e.currentTarget.currentTime, e.currentTarget.duration)
            }
            onContextMenu={(e) => e.preventDefault()}
            className={`w-full h-full object-contain block transition-opacity duration-300 ${
              isObscured ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : streamAuth?.videoStatus === 'ERROR' ? (
          <div className="flex flex-col items-center gap-3 text-white p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 stroke-[1.5]" />
            <p className="text-sm font-bold text-rose-400">تعذر تحميل أو تشغيل الفيديو</p>
            <p className="text-xs text-slate-400 max-w-sm">
              يبدو أن هناك مشكلة في معالجة هذا الفيديو في السيرفر أو لم يكتمل تحويله بنجاح. يرجى تجربة إعادة الرفع من لوحة المعلم أو التواصل مع الدعم الفني.
            </p>
            <button
              type="button"
              onClick={onRefetchStreamAuth}
              className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700 cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-400 p-8 text-center">
            <Video className="w-12 h-12 text-slate-600 stroke-[1.5]" />
            <p className="text-xs font-bold text-slate-300">لا يوجد فيديو مخصص لهذا الدرس حالياً</p>
            <p className="text-[11px] text-slate-500 max-w-md">
              يمكنك تصفح ملخص الدرس أو تحميل المرفقات أو حل الاختبار التفاعلي من التبويبات بالأسفل، ثم الضغط على الزر أدناه لاحتساب إتمام الدرس والانتقال للتالي.
            </p>
            <button
              type="button"
              onClick={onToggleComplete}
              disabled={isMarkingComplete}
              className={`mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                isLessonCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isLessonCompleted ? 'تم إتمام الدرس بنجاح' : 'إتمام هذا الدرس والمتابعة'}</span>
            </button>
          </div>
        )}

        {/* Tab/Window Focus Obscuring Blur Overlay */}
        {isObscured && (
          <div
            data-testid="tab-hidden-overlay"
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center backdrop-blur-2xl bg-black/90 text-white select-none transition-all duration-300"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3 animate-pulse">
              <EyeOff className="w-7 h-7" />
            </div>
            <p className="text-sm sm:text-base font-bold text-amber-300 mb-2">
              ⚠️ تم إيقاف المشاهدة مؤقتاً: يرجى العودة لتبويب الدرس للمتابعة.
            </p>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              لحماية محتوى المنصة ومنع تسجيل الشاشة في الخلفية، يتوقف عرض الفيديو فور مغادرة الصفحة أو التبديل بين النوافذ.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!document.hidden) setIsObscured(false);
              }}
              className="mt-4 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              متابعة المشاهدة
            </button>
          </div>
        )}

        {/* Floating Dynamic Anti-Theft Watermark */}
        {streamAuth?.watermark && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-20 select-none" draggable={false}>
            <div
              className="text-xs font-mono font-bold text-white/30 tracking-wider p-2.5 select-none transition-all duration-700 ease-in-out backdrop-blur-[1px] bg-black/15 rounded-lg"
              style={{ top: `${watermarkPos.top}%`, left: `${watermarkPos.left}%`, position: 'absolute' }}
            >
              {[
                streamAuth.watermark.studentName,
                streamAuth.watermark.studentPhone,
                streamAuth.watermark.studentCode,
              ]
                .filter(Boolean)
                .filter((val) => !/^[0-9a-f]{8}$/i.test(val) && !/^[0-9a-f-]{36}$/i.test(val))
                .join(' • ')}
            </div>
          </div>
        )}
      </div>

      {/* Lesson Title & Module Subtitle */}
      <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div>
          <span className="text-[11px] font-bold text-primary-600">
            {activeModuleTitle || 'الوحدة'}
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-0.5">
            {activeLessonTitle || 'اختر درساً للبدء'}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeLessonPreview && (
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
              معاينة مجانية متاحة
            </span>
          )}
          {activeLessonTitle && (
            <button
              type="button"
              onClick={onToggleComplete}
              disabled={isMarkingComplete}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs cursor-pointer ${
                isLessonCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-600 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isLessonCompleted ? 'الدرس مكتمل ✔' : 'تحديد كمكتمل'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
