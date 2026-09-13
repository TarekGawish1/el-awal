'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ShieldAlert, RefreshCw, Loader2, EyeOff } from 'lucide-react';

export interface LessonStreamTicketResponse {
  embedUrl: string;
  expiresAt: number;
}

export interface LessonVideoPlayerUser {
  fullName?: string;
  studentCode?: string;
  phone?: string;
}

export interface LessonVideoPlayerProps {
  lessonId: string;
  user?: LessonVideoPlayerUser;
  onEnded?: () => void;
  className?: string;
}

export function LessonVideoPlayer({
  lessonId,
  user: propUser,
  className = '',
}: LessonVideoPlayerProps) {
  const storeUser = useAuthStore((state) => state.user);
  const user = propUser || {
    fullName: storeUser?.fullName || 'طالب مسجل',
    studentCode: (storeUser as any)?.studentCode || '',
    phone: storeUser?.phone || '',
  };

  // Full student attribution string
  const attributionParts = [user.fullName, user.studentCode, user.phone].filter(Boolean);
  const watermarkText = attributionParts.length > 0 ? attributionParts.join(' • ') : 'طالب مسجل';

  // 1. Fetch the ticket on mount using TanStack Query
  const { data, isLoading, error, refetch, isFetching } = useQuery<LessonStreamTicketResponse>({
    queryKey: ['lesson-stream-ticket', lessonId],
    queryFn: () => apiClient.get<LessonStreamTicketResponse>(`/courses/lessons/${lessonId}/stream-ticket`),
    staleTime: 60 * 60 * 1000, // 1 hour stale time within 2-hour window
    enabled: !!lessonId,
  });

  // State for obscuring video when tab/window loses focus
  const [isObscured, setIsObscured] = useState(false);

  // Floating watermark randomized coordinate state (10% to 85%)
  const [watermarkPos, setWatermarkPos] = useState({ top: 20, left: 20 });

  const randomizeWatermarkPosition = useCallback(() => {
    // Keep coordinates randomly between 10% and 85%
    const newTop = Math.floor(Math.random() * 75) + 10;
    const newLeft = Math.floor(Math.random() * 75) + 10;
    setWatermarkPos({ top: newTop, left: newLeft });
  }, []);

  // Timer useEffect shifting watermarkPos coordinates randomly every 15–25 seconds
  useEffect(() => {
    randomizeWatermarkPosition();

    let timeoutId: NodeJS.Timeout;
    const scheduleNextShift = () => {
      // 15–25 seconds interval
      const intervalMs = Math.floor(Math.random() * 10000) + 15000;
      timeoutId = setTimeout(() => {
        randomizeWatermarkPosition();
        scheduleNextShift();
      }, intervalMs);
    };

    scheduleNextShift();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [randomizeWatermarkPosition]);

  // Tab & Window Focus Masking (Screen Sharing / Multi-Window Defense)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        setIsObscured(true);
      } else {
        setIsObscured(false);
      }
    };

    const handleWindowBlur = () => {
      // Check if focus moved to an inner iframe
      if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
        return;
      }
      setIsObscured(true);
    };

    const handleWindowFocus = () => {
      if (!document.hidden && document.visibilityState !== 'hidden') {
        setIsObscured(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Keyboard Shortcut & DevTools Suppression
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';

      // F12 or PrintScreen
      if (e.key === 'F12' || e.key === 'PrintScreen' || key === 'printscreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + Shift + I / J / C (DevTools)
      if (isCtrlOrMeta && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + U (View Source)
      if (isCtrlOrMeta && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + S (Save Page)
      if (isCtrlOrMeta && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return (
    <div
      data-testid="lesson-video-player-container"
      className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 select-none shadow-lg border border-slate-800 ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
    >
      {/* 2. Responsive Bunny iframe inside protected container */}
      {data?.embedUrl && (
        <iframe
          data-testid="bunny-stream-iframe"
          src={data.embedUrl}
          loading="lazy"
          className={`w-full h-full border-0 block transition-opacity duration-300 ${
            isObscured ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
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
            لحماية محتوى المنصة ومنع تسجيل الشاشة أو مشاركتها في الخلفية، يتوقف عرض الفيديو فور مغادرة الصفحة أو فقدان التركيز على التبويب.
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

      {/* Loading state */}
      {isLoading && (
        <div
          data-testid="player-loading-skeleton"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-white z-10 select-none"
          draggable={false}
        >
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <span className="text-xs font-mono text-slate-300">
            جاري تأمين البث وتوليد التذكرة المشفرة...
          </span>
        </div>
      )}

      {/* Error state */}
      {!isLoading && (error || (!data?.embedUrl && !isFetching)) && (
        <div
          data-testid="player-error-fallback"
          className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-200 z-10 select-none"
          draggable={false}
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">تعذر تشغيل الفيديو المحمي</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {error
              ? (error as any).message || 'يجب الاشتراك في هذا الكورس أولاً لمشاهدة شرح هذا الدرس'
              : 'الفيديو غير متاح حالياً لهذا الدرس'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Floating Dynamic Watermark & Static Ghost Attribution Nodes */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden z-20 select-none"
        draggable={false}
      >
        {/* Semi-transparent ghost nodes across corners/center for physical recording defense */}
        <div className="absolute top-[10%] left-[8%] text-[10px] font-mono font-bold text-white/20 select-none pointer-events-none tracking-wider">
          {watermarkText}
        </div>
        <div className="absolute top-[20%] right-[10%] text-[10px] font-mono font-bold text-white/20 select-none pointer-events-none tracking-wider">
          {watermarkText}
        </div>
        <div className="absolute bottom-[22%] left-[12%] text-[10px] font-mono font-bold text-white/20 select-none pointer-events-none tracking-wider">
          {watermarkText}
        </div>
        <div className="absolute bottom-[10%] right-[8%] text-[10px] font-mono font-bold text-white/20 select-none pointer-events-none tracking-wider">
          {watermarkText}
        </div>

        {/* Primary Dynamic Floating Watermark with Smooth Transitions */}
        <div
          data-testid="dynamic-video-watermark"
          className="text-xs font-mono font-bold text-white/30 tracking-wider p-2.5 select-none transition-all duration-700 ease-in-out backdrop-blur-[1px] bg-black/15 rounded-lg"
          style={{
            top: `${watermarkPos.top}%`,
            left: `${watermarkPos.left}%`,
            position: 'absolute',
          }}
          draggable={false}
        >
          {watermarkText}
        </div>
      </div>
    </div>
  );
}

export default LessonVideoPlayer;
